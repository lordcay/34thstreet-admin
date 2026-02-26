import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAvatar,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPaperPlane, cilReload } from '@coreui/icons'
import { fetchConversationMessages, sendPrivateMessage } from 'src/api/messages'
import { getCurrentUserId, getCurrentUserName } from 'src/utils/auth'
import { getSocket } from 'src/socket'
import api from 'src/api/client'
import styles from './PrivateChat.module.css'

export default function PrivateChat() {
  const navigate = useNavigate()
  const { otherUserId } = useParams()
  const meId = useMemo(() => getCurrentUserId(), [])
  const meName = useMemo(() => getCurrentUserName(), [])

  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUser, setLoadingUser] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [typingUser, setTypingUser] = useState('')
  const [replyTo, setReplyTo] = useState(null)

  const bottomRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const asId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return String(value?._id || value?.id || '')
  }

  const normalizeMessage = (rawMessage) => {
    if (!rawMessage) return null

    const createdAt = rawMessage?.createdAt || rawMessage?.timestamp || rawMessage?.updatedAt || null
    return {
      ...rawMessage,
      _id: rawMessage?._id || rawMessage?.id || rawMessage?.messageId || null,
      senderId: rawMessage?.senderId || rawMessage?.sender || null,
      recipientId: rawMessage?.recipientId || rawMessage?.recipient || null,
      message: rawMessage?.message || rawMessage?.text || '',
      createdAt,
    }
  }

  const extractMessages = (payload) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.messages)) return payload.messages
    if (Array.isArray(payload?.data)) return payload.data
    return []
  }

  useEffect(() => {
    loadOtherUser()
    loadMessages()
  }, [otherUserId])

  useEffect(() => {
    const socket = getSocket()
    if (meId && otherUserId) {
      socket.emit('dm:join', { meId, otherUserId })
      socket.emit('readMessages', { readerId: meId, senderId: otherUserId })
    }
  }, [meId, otherUserId])

  useEffect(() => {
    const socket = getSocket()

    const onNew = (incomingRaw) => {
      const incoming = normalizeMessage(incomingRaw)
      if (!incoming?.message) return

      const senderId = asId(incoming?.senderId)
      const recipientId = asId(incoming?.recipientId)

      const isRelevant =
        (String(senderId) === String(otherUserId) && String(recipientId) === String(meId)) ||
        (String(senderId) === String(meId) && String(recipientId) === String(otherUserId))

      if (isRelevant) {
        setMessages((prev) => {
          const incomingId = incoming?._id ? String(incoming._id) : ''
          const exists = incomingId
            ? prev.some((item) => String(item?._id || '') === incomingId)
            : prev.some(
                (item) =>
                  asId(item?.senderId) === senderId &&
                  asId(item?.recipientId) === recipientId &&
                  String(item?.message || '') === String(incoming?.message || '') &&
                  String(item?.createdAt || '') === String(incoming?.createdAt || '')
              )
          if (exists) return prev

          const merged = [...prev, incoming]
          merged.sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0))
          return merged
        })

        if (String(senderId) === String(otherUserId)) {
          socket.emit('readMessages', { readerId: meId, senderId: otherUserId })
        }
      }
    }

    const onRead = ({ readerId, otherId }) => {
      if (String(readerId) !== String(otherUserId) || String(otherId) !== String(meId)) return
      setMessages((prev) =>
        prev.map((item) => {
          const senderId = asId(item?.senderId)
          const recipientId = asId(item?.recipientId)
          const mineToPeer = String(senderId) === String(meId) && String(recipientId) === String(otherUserId)
          return mineToPeer ? { ...item, read: true } : item
        })
      )
    }

    socket.on('message:new', onNew)
    socket.on('newMessage', onNew)
    socket.on('message:read', onRead)

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
      socket.off('message:read', onRead)
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
      let allMessages = []

      try {
        const response = await fetchConversationMessages(meId, otherUserId)
        allMessages = extractMessages(response)
      } catch (primaryError) {
        console.warn('Primary conversation endpoint failed, trying mobile-compatible endpoint:', primaryError)
      }

      if (!allMessages.length) {
        const fallbackResponse = await api.get(`/messages/${otherUserId}`)
        allMessages = extractMessages(fallbackResponse?.data)
      }

      const normalized = allMessages
        .map((message) => normalizeMessage(message))
        .filter((message) => message?.message)

      const sorted = [...normalized].sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0))
      setMessages(sorted)
      setError('')
    } catch (e) {
      console.error('Failed to load messages from all supported endpoints:', e)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadOtherUser = async () => {
    if (!otherUserId) return
    setLoadingUser(true)
    try {
      const response = await api.get(`/accounts/${otherUserId}`)
      setOtherUser(response.data?.user || response.data)
    } catch (e) {
      console.error('Failed to load chat user:', e)
    } finally {
      setLoadingUser(false)
    }
  }

  const getUserPhoto = (user) => {
    const photoList = Array.isArray(user?.photos) ? user.photos : []
    const normalized = photoList
      .map((photo) => {
        if (typeof photo === 'string') return photo
        return photo?.url || photo?.secure_url || photo?.uri || null
      })
      .filter(Boolean)

    return normalized[0] || user?.avatarUrl || ''
  }

  const formatSchoolFromEmail = (email) => {
    const raw = String(email || '')
      .split('@')[1]
      ?.split('.')[0]
    if (!raw) return 'Unknown School'
    return raw
      .replace(/[-_]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getDisplayName = () => {
    const name = `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim()
    return name || 'Private Chat'
  }

  const formatTime = (value) => {
    if (!value) return ''
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
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

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage = {
      _id: optimisticId,
      senderId: meId,
      recipientId: otherUserId,
      message: text.trim(),
      createdAt: new Date().toISOString(),
      read: false,
      _optimistic: true,
      replyTo: replyTo || undefined,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setSending(true)
    try {
      const res = await sendPrivateMessage(payload)
      const created = normalizeMessage(res?.message || res)
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((item) => String(item?._id || '') !== optimisticId)
        const messageId = created?._id ? String(created._id) : ''
        const exists = messageId ? withoutOptimistic.some((item) => String(item?._id || '') === messageId) : false
        if (exists) return withoutOptimistic
        const merged = [...withoutOptimistic, created]
        merged.sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0))
        return merged
      })

      getSocket().emit('newMessage', {
        ...created,
        senderId: meId,
        recipientId: otherUserId,
      })
      getSocket().emit('dm:stopTyping', { meId, otherUserId })
      setText('')
      setReplyTo(null)
      setError('')
    } catch (e) {
      console.error(e)
      setMessages((prev) => prev.filter((item) => String(item?._id || '') !== optimisticId))
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (value) => {
    setText(value)

    const socket = getSocket()
    socket.emit('dm:typing', { meId, otherUserId, senderName: meName })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('dm:stopTyping', { meId, otherUserId })
    }, 1200)
  }

  const avatarSrc = getUserPhoto(otherUser)
  const schoolText = formatSchoolFromEmail(otherUser?.email)

  return (
    <CCard className={styles.chatCard}>
      <CCardBody className={styles.chatBody}>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <CButton color="light" size="sm" className={styles.backBtn} onClick={() => navigate(-1)}>
              <CIcon icon={cilArrowLeft} />
            </CButton>

            <button
              type="button"
              className={styles.userIdentityBtn}
              onClick={() => navigate(`/user-profile/${otherUserId}`)}
              aria-label="Open user profile"
            >
              <CAvatar src={avatarSrc || undefined} text={!avatarSrc ? getDisplayName().slice(0, 1) : undefined} />

              <div className={styles.headerUserMeta}>
                <p className={styles.headerName}>{loadingUser ? 'Loading...' : getDisplayName()}</p>
                <p className={styles.headerSchool}>{schoolText}</p>
              </div>
            </button>
          </div>

          <CButton color="light" size="sm" className={styles.reloadBtn} onClick={loadMessages} disabled={loading}>
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
              const senderId = asId(item?.senderId)
              const mine = String(senderId) === String(meId)
              const read = Boolean(item?.read)

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
                  <small className={styles.msgMeta}>
                    {formatTime(item.createdAt)} {mine ? (read ? '• Seen' : '• Sent') : ''}
                  </small>
                </div>
              )
            })
          )}
          {typingUser && <div className={styles.typing}>{typingUser} is typing…</div>}
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
            placeholder="Type a message..."
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            className={styles.composerInput}
          />
          <CButton className={styles.sendBtn} onClick={handleSend} disabled={sending || !text.trim()}>
            {sending ? 'Sending...' : <CIcon icon={cilPaperPlane} />}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}
