import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormInput,
  CSpinner,
  CAlert,
} from '@coreui/react'
import { fetchConversationMessages, sendPrivateMessage } from 'src/api/messages'
import { getCurrentUserId, getCurrentUserName } from 'src/utils/auth'
import { getSocket } from 'src/socket'
import styles from './PrivateChat.module.css'

export default function PrivateChat() {
  const { otherUserId } = useParams()
  const meId = useMemo(() => getCurrentUserId(), [])
  const meName = useMemo(() => getCurrentUserName(), [])

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [typingUser, setTypingUser] = useState('')
  const [replyTo, setReplyTo] = useState(null)

  const bottomRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    loadMessages()
  }, [otherUserId])

  useEffect(() => {
    const socket = getSocket()

    const onNew = (incoming) => {
      const senderId = incoming?.senderId?._id || incoming?.senderId
      const recipientId = incoming?.recipientId?._id || incoming?.recipientId

      const isRelevant =
        (String(senderId) === String(otherUserId) && String(recipientId) === String(meId)) ||
        (String(senderId) === String(meId) && String(recipientId) === String(otherUserId))

      if (isRelevant) {
        setMessages((prev) => [...prev, incoming])
      }
    }

    socket.on('message:new', onNew)
    socket.on('newMessage', onNew)

    const onTyping = (payload) => {
      if (String(payload?.meId) === String(otherUserId) && String(payload?.otherUserId) === String(meId)) {
        setTypingUser(payload?.senderName || 'Typing...')
      }
    }

    const onStoppedTyping = (payload) => {
      if (String(payload?.meId) === String(otherUserId) && String(payload?.otherUserId) === String(meId)) {
        setTypingUser('')
      }
    }

    socket.on('dm:userTyping', onTyping)
    socket.on('dm:userStoppedTyping', onStoppedTyping)

    return () => {
      socket.emit('dm:leave', { meId, otherUserId })
      socket.off('message:new', onNew)
      socket.off('newMessage', onNew)
      socket.off('dm:userTyping', onTyping)
      socket.off('dm:userStoppedTyping', onStoppedTyping)
    }
  }, [otherUserId, meId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    if (!meId || !otherUserId) {
      setError('Missing user context for this chat.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetchConversationMessages(meId, otherUserId)
      const data = Array.isArray(res) ? res : res.messages || []
      setMessages(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !meId || !otherUserId) return

    const payload = {
      senderId: meId,
      recipientId: otherUserId,
      message: text.trim(),
      replyTo: replyTo
        ? {
            _id: replyTo._id,
            senderId: replyTo?.senderId?._id || replyTo?.senderId,
            senderName: replyTo?.senderName || 'User',
            message: replyTo?.message,
          }
        : undefined,
    }

    setSending(true)
    try {
      const res = await sendPrivateMessage(payload)
      const created = res?.message || res
      setMessages((prev) => [...prev, created])
      getSocket().emit('newMessage', payload)
      getSocket().emit('dm:stopTyping', { meId, otherUserId })
      setText('')
      setReplyTo(null)
    } catch (e) {
      console.error(e)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Private Chat</strong>
        <CButton color="secondary" size="sm" onClick={loadMessages} disabled={loading}>
          Refresh
        </CButton>
      </CCardHeader>
      <CCardBody>
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
              const mine = String(senderId) === String(meId)
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
                  <small className="text-muted mt-1">
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}
                  </small>
                </div>
              )
            })
          )}
          {typingUser && <div className={styles.typing}>{typingUser} is typing...</div>}
          <div ref={bottomRef} />
        </div>

        {replyTo && (
          <div className={styles.replyPreview}>
            <div>
              <small className="text-muted">Replying to {replyTo?.senderName || 'User'}</small>
              <div className="small">{replyTo?.message}</div>
            </div>
            <CButton color="light" size="sm" onClick={() => setReplyTo(null)}>
              Cancel
            </CButton>
          </div>
        )}

        <div className="d-flex gap-2 mt-3">
          <CFormInput
            placeholder="Type a message..."
            value={text}
            onChange={(e) => {
              const value = e.target.value
              setText(value)

              const socket = getSocket()
              socket.emit('dm:typing', { meId, otherUserId, senderName: meName })
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
              typingTimeoutRef.current = setTimeout(() => {
                socket.emit('dm:stopTyping', { meId, otherUserId })
              }, 1200)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />
          <CButton color="primary" onClick={handleSend} disabled={sending || !text.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}
