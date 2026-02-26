import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CCard, CCardBody, CButton, CFormInput, CSpinner, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload, cilPaperPlane } from '@coreui/icons'
import { fetchChatRoomMessages, sendChatRoomMessage } from 'src/api/chatrooms'
import { getCurrentUserId, getCurrentUserName } from 'src/utils/auth'
import { getSocket } from 'src/socket'
import styles from './ChatRoom.module.css'

export default function ChatRoom() {
  const { chatroomId } = useParams()
  const userId = useMemo(() => getCurrentUserId(), [])
  const userName = useMemo(() => getCurrentUserName(), [])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [typingLabel, setTypingLabel] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const bottomRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const asId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return String(value?._id || value?.id || '')
  }

  const asText = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value.trim()
    return String(value).trim()
  }

  const isDuplicateMessage = (left, right) => {
    const leftId = asId(left?._id || left?.id || left?.messageId)
    const rightId = asId(right?._id || right?.id || right?.messageId)
    if (leftId && rightId && leftId === rightId) return true

    const leftSenderId = asId(left?.senderId)
    const rightSenderId = asId(right?.senderId)
    if (!leftSenderId || !rightSenderId || leftSenderId !== rightSenderId) return false

    const leftMessage = asText(left?.message || left?.text || left?.content)
    const rightMessage = asText(right?.message || right?.text || right?.content)
    if (!leftMessage || !rightMessage || leftMessage !== rightMessage) return false

    const leftTime = new Date(left?.createdAt || left?.updatedAt || left?.timestamp || 0).getTime()
    const rightTime = new Date(right?.createdAt || right?.updatedAt || right?.timestamp || 0).getTime()
    if (!leftTime || !rightTime) return Boolean(left?._optimistic || right?._optimistic)

    return Math.abs(leftTime - rightTime) <= 15000
  }

  const formatTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  useEffect(() => {
    loadMessages()
  }, [chatroomId])

  useEffect(() => {
    const socket = getSocket()

    socket.emit('joinChatroom', { chatroomId, userId })

    const onNew = (payload) => {
      if (String(payload?.chatroomId || payload?.roomId) !== String(chatroomId)) return
      setMessages((prev) => {
        const duplicateIndex = prev.findIndex((item) => isDuplicateMessage(item, payload))
        if (duplicateIndex >= 0) {
          const next = [...prev]
          next[duplicateIndex] = { ...next[duplicateIndex], ...payload, _optimistic: false }
          return next
        }

        return [...prev, { ...payload, _optimistic: false }]
      })
    }

    const onUserTyping = (payload) => {
      if (String(payload?.chatroomId) !== String(chatroomId)) return
      if (String(payload?.userId) === String(userId)) return
      setTypingLabel(payload?.senderName || 'Someone')
    }

    const onUserStoppedTyping = (payload) => {
      if (String(payload?.chatroomId) !== String(chatroomId)) return
      setTypingLabel('')
    }

    socket.on('newChatroomMessage', onNew)
    socket.on('userTyping', onUserTyping)
    socket.on('userStoppedTyping', onUserStoppedTyping)

    return () => {
      socket.emit('leaveChatroom', { chatroomId, userId })
      socket.off('newChatroomMessage', onNew)
      socket.off('userTyping', onUserTyping)
      socket.off('userStoppedTyping', onUserStoppedTyping)
    }
  }, [chatroomId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchChatRoomMessages(chatroomId)
      const data = Array.isArray(res) ? res : res.messages || []
      setMessages(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load room messages')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !userId) return
    setError('')
    const messageText = text.trim()
    const optimisticId = `optimistic-${Date.now()}`

    const payload = {
      chatroomId,
      roomId: chatroomId,
      message: messageText,
      text: messageText,
      content: messageText,
      senderId: userId,
      senderName: userName,
      replyTo: replyTo
        ? {
            _id: replyTo._id,
            senderId: replyTo?.senderId?._id || replyTo?.senderId,
            senderName: replyTo?.senderName || 'User',
            message: replyTo?.message,
          }
        : undefined,
    }

    const optimisticMessage = {
      _id: optimisticId,
      chatroomId,
      roomId: chatroomId,
      senderId: userId,
      senderName: userName,
      message: messageText,
      text: messageText,
      createdAt: new Date().toISOString(),
      replyTo: payload.replyTo,
      _optimistic: true,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    getSocket().emit('sendChatroomMessage', payload)
    getSocket().emit('stopTyping', { chatroomId, roomId: chatroomId, userId, senderName: userName })
    setText('')
    setReplyTo(null)

    setSending(true)
    try {
      const res = await sendChatRoomMessage(payload)
      const created = res?.message || res?.data || res
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((item) => String(item?._id || '') !== optimisticId)

        const duplicateIndex = withoutOptimistic.findIndex((item) => isDuplicateMessage(item, created))
        if (duplicateIndex >= 0) {
          const next = [...withoutOptimistic]
          next[duplicateIndex] = { ...next[duplicateIndex], ...created, _optimistic: false }
          return next
        }

        return [...withoutOptimistic, { ...created, _optimistic: false }]
      })
    } catch (e) {
      console.error(e)
      // keep optimistic + socket send as fallback so message still appears and can propagate in real time
      const apiMessage = e?.response?.data?.message || e?.response?.data?.error || ''
      if (apiMessage) {
        setError(`Message sent via realtime fallback. API warning: ${apiMessage}`)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <CCard className={styles.roomCard}>
      <CCardBody className={styles.roomBody}>
        <div className={styles.topBar}>
          <div>
            <h4 className={styles.roomTitle}>Chat Room</h4>
            <p className={styles.roomSubtitle}>Community conversation in real time</p>
          </div>
          <CButton color="light" className={styles.refreshBtn} onClick={loadMessages} disabled={loading}>
            <CIcon icon={cilReload} />
          </CButton>
        </div>

        {error && <CAlert color="danger">{error}</CAlert>}

        <div className={styles.messagesPane}>
          {loading ? (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted py-4">No messages yet.</div>
          ) : (
            messages.map((item, index) => {
              const senderId = item?.senderId?._id || item?.senderId
              const mine = String(senderId) === String(userId)
              return (
                <div
                  key={item._id || `${index}-${item.createdAt || ''}`}
                  className={mine ? styles.rowMine : styles.rowOther}
                  onDoubleClick={() => setReplyTo(item)}
                >
                  <div className={mine ? styles.bubbleMine : styles.bubbleOther}>
                    {item.replyTo && (
                      <div className={styles.replyBox}>
                        <small className="text-muted d-block">Replying to {item.replyTo?.senderName || 'User'}</small>
                        <small>{item.replyTo?.message}</small>
                      </div>
                    )}
                    {item.message}
                  </div>
                  <small className={styles.msgMeta}>{formatTime(item.createdAt)}</small>
                </div>
              )
            })
          )}
          {typingLabel && <div className={styles.typing}>{typingLabel} is typing...</div>}
          <div ref={bottomRef} />
        </div>

        {replyTo && (
          <div className={styles.replyPreview}>
            <div>
              <small className={styles.replyLabel}>Replying to {replyTo?.senderName || 'User'}</small>
              <div className={styles.replyText}>{replyTo?.message}</div>
            </div>
            <CButton color="light" size="sm" onClick={() => setReplyTo(null)}>
              Cancel
            </CButton>
          </div>
        )}

        <div className={styles.composerRow}>
          <CFormInput
            placeholder="Type a room message..."
            value={text}
            className={styles.composerInput}
            onChange={(e) => {
              const value = e.target.value
              setText(value)

              const socket = getSocket()
              socket.emit('userTyping', { chatroomId, userId, senderName: userName })
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
              typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stopTyping', { chatroomId, userId, senderName: userName })
              }, 1200)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />
          <CButton className={styles.sendBtn} onClick={handleSend} disabled={sending || !text.trim()}>
            {sending ? 'Sending...' : <CIcon icon={cilPaperPlane} />}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}
