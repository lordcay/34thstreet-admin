import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader, CButton, CFormInput, CSpinner, CAlert } from '@coreui/react'
import { fetchChatRoomMessages, sendChatRoomMessage } from 'src/api/chatrooms'
import { getCurrentUserId, getCurrentUserName } from 'src/utils/auth'
import { getSocket } from 'src/socket'

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

  useEffect(() => {
    loadMessages()
  }, [chatroomId])

  useEffect(() => {
    const socket = getSocket()

    socket.emit('joinChatroom', { chatroomId, userId })

    const onNew = (payload) => {
      if (String(payload?.chatroomId || payload?.roomId) === String(chatroomId)) {
        setMessages((prev) => [...prev, payload])
      }
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
    const payload = {
      chatroomId,
      message: text.trim(),
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

    setSending(true)
    try {
      const res = await sendChatRoomMessage(payload)
      const created = res?.message || res
      setMessages((prev) => [...prev, created])
      getSocket().emit('sendChatroomMessage', payload)
      getSocket().emit('stopTyping', { chatroomId, userId, senderName: userName })
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
        <strong>Chat Room</strong>
        <CButton color="secondary" size="sm" onClick={loadMessages} disabled={loading}>
          Refresh
        </CButton>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}

        <div style={{ height: '60vh', overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
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
                  className={mine ? 'text-end mb-2' : 'text-start mb-2'}
                  onDoubleClick={() => setReplyTo(item)}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      maxWidth: '75%',
                      background: mine ? '#581845' : '#e9ecef',
                      color: mine ? '#fff' : '#222',
                      padding: '10px 12px',
                      borderRadius: 12,
                    }}
                  >
                    {item.replyTo && (
                      <div style={{ borderLeft: '3px solid #adb5bd', paddingLeft: 8, marginBottom: 8, opacity: 0.9 }}>
                        <small className="text-muted d-block">Replying to {item.replyTo?.senderName || 'User'}</small>
                        <small>{item.replyTo?.message}</small>
                      </div>
                    )}
                    {item.message}
                  </div>
                  <div>
                    <small className="text-muted">
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}
                    </small>
                  </div>
                </div>
              )
            })
          )}
          {typingLabel && <div className="text-muted small mt-2">{typingLabel} is typing...</div>}
          <div ref={bottomRef} />
        </div>

        {replyTo && (
          <div className="mt-2 p-2 border rounded d-flex justify-content-between align-items-center" style={{ borderLeft: '4px solid #581845' }}>
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
            placeholder="Type a room message..."
            value={text}
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
          <CButton color="primary" onClick={handleSend} disabled={sending || !text.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}
