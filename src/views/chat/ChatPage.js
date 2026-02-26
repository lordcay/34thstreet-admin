import React, { useEffect, useState, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar,
  CCard,
  CCardBody,
  CBadge,
  CButton,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload, cilSearch } from '@coreui/icons'
import { fetchUserConversations } from 'src/api/messages'
import { UnreadContext } from 'src/context/UnreadContext'
import { getCurrentUserId } from 'src/utils/auth'
import api from 'src/api/client'
import styles from './ChatPage.module.css'

export default function ChatPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const { counts, refresh } = useContext(UnreadContext)

  useEffect(() => {
    loadConversations({ silent: false })
  }, [])

  const asId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return String(value?._id || value?.id || '')
  }

  const collectCurrentUserIds = () => {
    const ids = new Set()

    const addId = (value) => {
      const normalized = asId(value)
      if (normalized) ids.add(normalized)
    }

    addId(getCurrentUserId())

    const directKeys = ['adminId', 'userId', 'id', '_id']
    directKeys.forEach((key) => addId(localStorage.getItem(key)))

    const jsonKeys = ['adminUser', 'user', 'currentUser']
    jsonKeys.forEach((key) => {
      const raw = localStorage.getItem(key)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        addId(parsed?._id)
        addId(parsed?.id)
        addId(parsed?.userId)
        addId(parsed?.accountId)
      } catch {
        // ignore malformed localStorage entries
      }
    })

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        addId(payload?._id)
        addId(payload?.id)
        addId(payload?.userId)
        addId(payload?.accountId)
        addId(payload?.sub)
      } catch {
        // ignore malformed token
      }
    }

    return ids
  }

  const getOtherUser = (conversation) => {
    return (
      conversation?.otherUser ||
      conversation?.participant ||
      conversation?.user ||
      conversation?.other ||
      conversation?.otherAccount ||
      {}
    )
  }

  const getDisplayName = (other) => {
    const name = `${other?.firstName || ''} ${other?.lastName || ''}`.trim()
    return name || other?.name || other?.email || 'Unknown User'
  }

  const getUserPhoto = (other) => {
    const photos = Array.isArray(other?.photos) ? other.photos : []
    const normalized = photos
      .map((photo) => {
        if (typeof photo === 'string') return photo
        return photo?.url || photo?.secure_url || photo?.uri || null
      })
      .filter(Boolean)

    return normalized[0] || other?.avatarUrl || other?.profilePicture || ''
  }

  const getLastMessageText = (conversation) => {
    const value =
      conversation?.lastMessage ||
      conversation?.last ||
      conversation?.preview ||
      conversation?.message ||
      conversation?.text ||
      conversation?.content ||
      ''
    if (!value) return 'Start a conversation'
    if (typeof value === 'string') return value
    return value?.message || value?.text || value?.content || 'Start a conversation'
  }

  const getLastAt = (conversation) => {
    return (
      conversation?.updatedAt ||
      conversation?.lastAt ||
      conversation?.lastMessageAt ||
      conversation?.createdAt ||
      conversation?.timestamp ||
      conversation?.lastMessage?.createdAt ||
      ''
    )
  }

  const extractArray = (payload, depth = 0) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.conversations)) return payload.conversations
    if (Array.isArray(payload?.messages)) return payload.messages
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload?.results)) return payload.results

    if (!payload || typeof payload !== 'object' || depth > 3) return []

    const objectValues = Object.values(payload)
    for (const value of objectValues) {
      const nested = extractArray(value, depth + 1)
      if (Array.isArray(nested) && nested.length) return nested
    }

    return []
  }

  const messageTextOf = (item) => {
    const candidate = item?.message || item?.text || item?.content || item?.body || ''
    if (!candidate) return ''
    if (typeof candidate === 'string') return candidate
    return String(candidate?.message || candidate?.text || candidate?.content || '')
  }

  const normalizeConversationShape = (item, myIds) => {
    if (!item || typeof item !== 'object') return null

    let otherUser = getOtherUser(item)
    let lastMessage = getLastMessageText(item)
    let lastMessageAt = getLastAt(item)
    let unreadCount = Number(item?.unreadCount || item?.unread || 0)

    const participants = Array.isArray(item?.participants)
      ? item.participants
      : Array.isArray(item?.users)
      ? item.users
      : []

    if (!asId(otherUser) && participants.length) {
      const otherParticipant = participants.find((participant) => !myIds.has(asId(participant)))
      otherUser = otherParticipant || participants[0]
    }

    const sender = item?.sender || item?.senderId || item?.from || item?.fromUser
    const recipient = item?.recipient || item?.recipientId || item?.to || item?.toUser
    const senderId = asId(sender)
    const recipientId = asId(recipient)

    if (!asId(otherUser) && (senderId || recipientId)) {
      if (myIds.has(senderId)) otherUser = recipient
      else if (myIds.has(recipientId)) otherUser = sender
      else otherUser = recipient || sender
    }

    const embeddedMessages = Array.isArray(item?.messages)
      ? item.messages
      : Array.isArray(item?.thread)
      ? item.thread
      : []

    if ((!lastMessage || lastMessage === 'Start a conversation') && embeddedMessages.length) {
      const sortedEmbedded = [...embeddedMessages].sort(
        (a, b) => new Date(a?.createdAt || a?.updatedAt || a?.timestamp || 0) - new Date(b?.createdAt || b?.updatedAt || b?.timestamp || 0)
      )
      const lastItem = sortedEmbedded[sortedEmbedded.length - 1]
      lastMessage = messageTextOf(lastItem) || lastMessage
      lastMessageAt =
        lastItem?.createdAt || lastItem?.updatedAt || lastItem?.timestamp || lastMessageAt

      if (!unreadCount) {
        unreadCount = sortedEmbedded.reduce((sum, message) => {
          const messageRecipientId = asId(message?.recipientId || message?.recipient || message?.to)
          const mine = myIds.has(messageRecipientId)
          return mine && !Boolean(message?.read || message?.isRead) ? sum + 1 : sum
        }, 0)
      }
    }

    return {
      ...item,
      otherUser,
      lastMessage,
      lastMessageAt,
      unreadCount,
      updatedAt: item?.updatedAt || lastMessageAt,
    }
  }

  const normalizeToConversationList = async (items, myIds) => {
    if (!Array.isArray(items) || !items.length) return []

    const looksLikeConversation = items.some(
      (item) =>
        item?.otherUser ||
        item?.participant ||
        item?.user ||
        item?.other ||
        item?.participants ||
        item?.lastMessage ||
        item?.lastMessageAt ||
        item?.preview
    )

    if (looksLikeConversation) {
      return items.map((item) => normalizeConversationShape(item, myIds)).filter(Boolean)
    }

    const grouped = new Map()

    items.forEach((item) => {
      const senderId = asId(item?.senderId || item?.sender || item?.from || item?.fromUserId)
      const recipientId = asId(item?.recipientId || item?.recipient || item?.to || item?.toUserId)
      if (!senderId && !recipientId) return

      const senderIsMine = myIds.has(senderId)
      const recipientIsMine = myIds.has(recipientId)

      const isMine = senderIsMine || recipientIsMine || myIds.size === 0
      const otherId = senderIsMine ? recipientId : senderId
      if (!otherId || !isMine) return

      const text = messageTextOf(item)
      const createdAt = item?.createdAt || item?.updatedAt || item?.timestamp || new Date().toISOString()
      const read = Boolean(item?.read || item?.isRead)
      const unreadForMe = recipientIsMine && !read ? 1 : 0

      const current = grouped.get(otherId)
      if (!current) {
        grouped.set(otherId, {
          otherId,
          lastMessage: text,
          lastMessageAt: createdAt,
          unreadCount: unreadForMe,
        })
        return
      }

      const currentTime = new Date(current.lastMessageAt || 0).getTime()
      const incomingTime = new Date(createdAt || 0).getTime()
      if (incomingTime >= currentTime) {
        current.lastMessage = text || current.lastMessage
        current.lastMessageAt = createdAt || current.lastMessageAt
      }
      current.unreadCount += unreadForMe
    })

    const otherIds = Array.from(grouped.keys())
    const userEntries = await Promise.all(
      otherIds.map(async (id) => {
        try {
          const response = await api.get(`/accounts/${id}`)
          const user = response?.data?.user || response?.data || {}
          return [id, user]
        } catch {
          return [id, { _id: id }]
        }
      })
    )

    const usersById = Object.fromEntries(userEntries)

    return Array.from(grouped.values()).map((entry) => ({
      otherUser: usersById[entry.otherId] || { _id: entry.otherId },
      lastMessage: entry.lastMessage,
      lastMessageAt: entry.lastMessageAt,
      unreadCount: entry.unreadCount,
      updatedAt: entry.lastMessageAt,
    }))
  }

  const buildConversationsFromAccounts = async (myIds) => {
    let accounts = []
    try {
      const response = await api.get('/accounts')
      const payload = response?.data
      accounts = Array.isArray(payload) ? payload : payload?.users || payload?.accounts || payload?.data || []
    } catch {
      return []
    }

    const candidates = accounts
      .filter((account) => {
        const accountId = asId(account)
        return accountId && !myIds.has(accountId)
      })
      .slice(0, 80)

    if (!candidates.length) return []

    const scanned = await Promise.allSettled(
      candidates.map(async (account) => {
        const otherId = asId(account)
        if (!otherId) return null

        const response = await api.get(`/messages/${otherId}`)
        const messages = extractArray(response?.data)
        if (!messages.length) return null

        const relevant = messages.filter((item) => {
          const senderId = asId(item?.senderId || item?.sender || item?.from || item?.fromUserId)
          const recipientId = asId(item?.recipientId || item?.recipient || item?.to || item?.toUserId)
          return myIds.has(senderId) || myIds.has(recipientId)
        })

        const selected = relevant.length ? relevant : messages
        if (!selected.length) return null

        const sorted = [...selected].sort(
          (a, b) =>
            new Date(a?.createdAt || a?.updatedAt || a?.timestamp || 0) -
            new Date(b?.createdAt || b?.updatedAt || b?.timestamp || 0)
        )

        const last = sorted[sorted.length - 1]
        const unread = sorted.reduce((sum, item) => {
          const recipientId = asId(item?.recipientId || item?.recipient || item?.to || item?.toUserId)
          const isUnreadForMe = myIds.has(recipientId) && !Boolean(item?.read || item?.isRead)
          return isUnreadForMe ? sum + 1 : sum
        }, 0)

        return {
          otherUser: account,
          lastMessage: messageTextOf(last),
          lastMessageAt: last?.createdAt || last?.updatedAt || last?.timestamp || null,
          unreadCount: unread,
          updatedAt: last?.createdAt || last?.updatedAt || last?.timestamp || null,
        }
      })
    )

    return scanned
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => result.value)
  }

  const formatTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const now = new Date()
    const sameDay = date.toDateString() === now.toDateString()
    if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const loadConversations = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    setError('')
    try {
      const userId = getCurrentUserId()
      const myIds = collectCurrentUserIds()
      if (userId) myIds.add(String(userId))

      let data = []

      if (userId) {
        const response = await fetchUserConversations(userId)
        data = extractArray(response)
      }

      if (!data.length) {
        try {
          const fallback = await api.get('/messages')
          data = extractArray(fallback?.data)
        } catch {
          // no-op: keep fallback best effort
        }
      }

      if (!data.length && userId) {
        const extraEndpoints = [`/messages/conversations/${userId}`, '/messages/conversations']
        for (const endpoint of extraEndpoints) {
          try {
            const fallback = await api.get(endpoint)
            data = extractArray(fallback?.data)
            if (data.length) break
          } catch {
            // continue trying other shapes
          }
        }
      }

      let normalized = await normalizeToConversationList(data, myIds)

      if (!normalized.length) {
        normalized = await buildConversationsFromAccounts(myIds)
      }

      setConversations(Array.isArray(normalized) ? normalized : [])
      await refresh()
    } catch (loadError) {
      console.error(loadError)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const rows = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase()

    const filtered = conversations.filter((conversation) => {
      if (!loweredQuery) return true
      const other = getOtherUser(conversation)
      const displayName = getDisplayName(other).toLowerCase()
      const email = String(other?.email || '').toLowerCase()
      const lastText = getLastMessageText(conversation).toLowerCase()
      return (
        displayName.includes(loweredQuery) || email.includes(loweredQuery) || lastText.includes(loweredQuery)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      const otherA = getOtherUser(a)
      const otherB = getOtherUser(b)
      const idA = asId(otherA)
      const idB = asId(otherB)

      const unreadA = Number(counts[idA] || a?.unreadCount || a?.unread || 0)
      const unreadB = Number(counts[idB] || b?.unreadCount || b?.unread || 0)
      if (unreadA !== unreadB) return unreadB - unreadA

      const timeA = new Date(getLastAt(a) || 0).getTime()
      const timeB = new Date(getLastAt(b) || 0).getTime()
      return timeB - timeA
    })

    return sorted.map((conversation) => {
      const other = getOtherUser(conversation)
      const otherId = asId(other)
      return {
        id: otherId,
        name: getDisplayName(other),
        photo: getUserPhoto(other),
        lastMessage: getLastMessageText(conversation),
        timestamp: formatTime(getLastAt(conversation)),
        unread: Number(counts[otherId] || conversation?.unreadCount || conversation?.unread || 0),
      }
    })
  }, [conversations, query, counts])

  const unreadTotal = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0)

  const openConversation = (row) => {
    if (!row?.id) return
    navigate(`/private-chat/${row.id}`)
  }

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <CSpinner color="primary" />
        <p className={styles.stateText}>Loading conversations...</p>
      </div>
    )
  }

  return (
    <div className={styles.chatPage}>
      <CCard className={styles.chatCard}>
        <CCardBody className={styles.chatBody}>
          <div className={styles.topBar}>
            <div>
              <h4 className={styles.pageTitle}>Chats</h4>
              <p className={styles.pageSubtitle}>Direct messages with your network</p>
            </div>

            <div className={styles.topRight}>
              {unreadTotal > 0 && (
                <CBadge color="danger" className={styles.unreadBadge}>
                  {unreadTotal} unread
                </CBadge>
              )}
              <CButton
                color="light"
                className={styles.refreshBtn}
                onClick={() => loadConversations({ silent: true })}
                disabled={refreshing}
              >
                <CIcon icon={cilReload} />
              </CButton>
            </div>
          </div>

          <CInputGroup className={styles.searchGroup}>
            <CInputGroupText className={styles.searchIconWrap}>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder="Search by name or message"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.searchInput}
            />
          </CInputGroup>

          {error && <CAlert color="danger">{error}</CAlert>}

          {rows.length === 0 ? (
            <div className={styles.stateWrap}>
              <p className={styles.stateText}>No conversations found.</p>
            </div>
          ) : (
            <div className={styles.listWrap}>
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openConversation(row)}
                  className={styles.threadRow}
                >
                  <CAvatar src={row.photo || undefined} text={!row.photo ? row.name.charAt(0) : undefined} />

                  <div className={styles.threadMain}>
                    <div className={styles.threadTop}>
                      <p className={styles.threadName}>{row.name}</p>
                      <span className={styles.threadTime}>{row.timestamp}</span>
                    </div>

                    <div className={styles.threadBottom}>
                      <p className={styles.threadSnippet}>{row.lastMessage}</p>
                      {row.unread > 0 && <span className={styles.threadUnread}>{row.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
