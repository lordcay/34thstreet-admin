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
import { getCurrentUserId } from 'src/utils/auth'
import { getSocket } from 'src/socket'
import styles from './PrivateChat.module.css'

export default function PrivateChat() {
  const { otherUserId } = useParams()
  const meId = useMemo(() => getCurrentUserId(), [])

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef(null)

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

    return () => {
      socket.off('message:new', onNew)
      socket.off('newMessage', onNew)
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
    }

    setSending(true)
    try {
      const res = await sendPrivateMessage(payload)
      const created = res?.message || res
      setMessages((prev) => [...prev, created])
      getSocket().emit('newMessage', payload)
      setText('')
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
                <div key={item._id || `${index}-${item.createdAt || ''}`} className={mine ? styles.rowMine : styles.rowOther}>
                  <div className={mine ? styles.bubbleMine : styles.bubbleOther}>{item.message}</div>
                  <small className="text-muted mt-1">
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}
                  </small>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="d-flex gap-2 mt-3">
          <CFormInput
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
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
