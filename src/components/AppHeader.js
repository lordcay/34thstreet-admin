import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CBadge,
  CContainer,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilContrast,
  cilEnvelopeOpen,
  cilList,
  cilMenu,
  cilMoon,
  cilSun,
} from '@coreui/icons'

import { fetchChatRooms, fetchChatRoomMessages } from 'src/api/chatrooms'
import { fetchUserConversations } from 'src/api/messages'
import { getSocket } from 'src/socket'
import { getCurrentUserId, isCurrentUserAdmin } from 'src/utils/auth'
import { AppHeaderDropdown } from './header/index'

const AppHeader = () => {
  const navigate = useNavigate()
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const currentUserId = useMemo(() => getCurrentUserId(), [])
  const isAdmin = useMemo(() => isCurrentUserAdmin(), [])
  const [privateChatItems, setPrivateChatItems] = useState([])
  const [chatroomItems, setChatroomItems] = useState([])

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  const asId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return String(value?._id || value?.id || value?.userId || '')
  }

  const asText = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value.trim()
    return String(value).trim()
  }

  const getTimestamp = (value) => {
    const parsed = new Date(value || 0).getTime()
    if (Number.isNaN(parsed) || parsed <= 0) return 0
    return parsed
  }

  const sortByRecent = (list) => {
    return [...list].sort((left, right) => getTimestamp(right?.createdAt) - getTimestamp(left?.createdAt))
  }

  const upsertById = (list, item) => {
    const next = [...list]
    const index = next.findIndex((entry) => entry.id === item.id)
    if (index >= 0) {
      next[index] = { ...next[index], ...item }
    } else {
      next.unshift(item)
    }
    return sortByRecent(next).slice(0, 30)
  }

  const normalizePrivateNotification = (payload) => {
    if (!payload) return null

    const message =
      payload?.message && typeof payload.message === 'object' && !Array.isArray(payload.message)
        ? payload.message
        : payload

    const senderId = asId(message?.senderId || message?.sender || payload?.senderId)
    const recipientId = asId(message?.recipientId || message?.recipient || payload?.recipientId)

    if (!senderId || senderId === String(currentUserId)) return null
    if (recipientId && String(recipientId) !== String(currentUserId)) return null

    const senderName =
      message?.senderName ||
      payload?.senderName ||
      message?.sender?.name ||
      `${message?.sender?.firstName || ''} ${message?.sender?.lastName || ''}`.trim() ||
      'User'

    const preview = asText(message?.message || message?.text || message?.content) || 'New private message'
    const createdAt = message?.createdAt || message?.timestamp || payload?.createdAt || new Date().toISOString()
    const messageId = asId(message?._id || message?.id || message?.messageId)
    const unique = messageId || `${senderId}-${createdAt}-${preview}`

    return {
      id: `private-${senderId}`,
      route: `/private-chat/${senderId}`,
      title: senderName,
      subtitle: 'Private chat',
      preview,
      createdAt,
      unread: 1,
      uniqueEventId: `private-event-${unique}`,
    }
  }

  const normalizeChatroomNotification = (payload) => {
    if (!payload) return null

    const senderId = asId(payload?.senderId || payload?.sender)
    if (senderId && senderId === String(currentUserId)) return null

    const chatroomId = asId(payload?.chatroomId || payload?.roomId)
    if (!chatroomId) return null

    const senderName =
      payload?.senderName ||
      payload?.sender?.name ||
      `${payload?.sender?.firstName || ''} ${payload?.sender?.lastName || ''}`.trim() ||
      'Someone'

    const roomName = payload?.chatroomName || payload?.roomName || 'Chat Room'
    const preview = asText(payload?.message || payload?.text || payload?.content) || 'New message in chat room'
    const createdAt = payload?.createdAt || payload?.timestamp || new Date().toISOString()
    const messageId = asId(payload?._id || payload?.id || payload?.messageId)
    const unique = messageId || `${chatroomId}-${senderId}-${createdAt}-${preview}`

    return {
      id: `room-${chatroomId}`,
      route: `/chatroom/${chatroomId}`,
      title: senderName,
      subtitle: roomName,
      preview,
      createdAt,
      unread: 1,
      uniqueEventId: `room-event-${unique}`,
    }
  }

  const getConversationLastPreview = (conversation) => {
    const candidate =
      conversation?.lastMessage?.message ||
      conversation?.lastMessage?.text ||
      conversation?.lastMessage?.content ||
      conversation?.lastMessage ||
      conversation?.latestMessage?.message ||
      conversation?.latestMessage?.text ||
      conversation?.message ||
      conversation?.text ||
      ''

    return asText(candidate) || 'Open conversation'
  }

  const openPrivateItem = (item) => {
    if (!item?.route) return
    setPrivateChatItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, unread: 0 } : entry)))
    navigate(item.route)
  }

  const openChatroomItem = (item) => {
    if (!item?.route) return
    setChatroomItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, unread: 0 } : entry)))
    navigate(item.route)
  }

  const clearNotifications = () => {
    setPrivateChatItems((prev) => prev.map((entry) => ({ ...entry, unread: 0 })))
    setChatroomItems((prev) => prev.map((entry) => ({ ...entry, unread: 0 })))
  }

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    const loadInitialMessageHistory = async () => {
      try {
        const privateResult = await fetchUserConversations(currentUserId)
        const conversations = Array.isArray(privateResult)
          ? privateResult
          : privateResult?.conversations || privateResult?.data || []

        const privateHistory = conversations
          .map((conversation) => {
            const unread = Number(conversation?.unreadCount || conversation?.unread || 0)

            const other = conversation?.otherUser || conversation?.participant || conversation?.user || {}
            const otherId = asId(other)
            if (!otherId) return null

            const otherName =
              `${other?.firstName || ''} ${other?.lastName || ''}`.trim() ||
              other?.name ||
              other?.username ||
              'User'

            return {
              id: `private-${otherId}`,
              route: `/private-chat/${otherId}`,
              title: otherName,
              subtitle: 'Private chat',
              preview: getConversationLastPreview(conversation),
              createdAt:
                conversation?.updatedAt ||
                conversation?.lastMessageAt ||
                conversation?.latestMessage?.createdAt ||
                conversation?.lastMessage?.createdAt ||
                new Date().toISOString(),
              unread: Number.isFinite(unread) && unread > 0 ? unread : 0,
            }
          })
          .filter(Boolean)

        setPrivateChatItems((prev) => {
          if (!privateHistory.length) return prev
          const merged = [...privateHistory]
          prev.forEach((item) => {
            if (!merged.some((entry) => entry.id === item.id)) merged.push(item)
          })
          return sortByRecent(merged).slice(0, 30)
        })

        const roomsResult = await fetchChatRooms()
        const rooms = Array.isArray(roomsResult)
          ? roomsResult
          : roomsResult?.chatrooms || roomsResult?.rooms || roomsResult?.data || []

        const roomsToCheck = rooms.slice(0, 8)
        const roomHistory = (
          await Promise.all(
            roomsToCheck.map(async (room) => {
              const roomId = asId(room)
              if (!roomId) return null

              const roomName = room?.name || room?.title || room?.chatroomName || 'Chat Room'

              const inlinePreview = asText(
                room?.lastMessage?.message ||
                  room?.lastMessage?.text ||
                  room?.latestMessage?.message ||
                  room?.latestMessage?.text,
              )
              const inlineTime =
                room?.lastMessage?.createdAt ||
                room?.latestMessage?.createdAt ||
                room?.updatedAt ||
                room?.createdAt

              if (inlinePreview) {
                return {
                  id: `room-${roomId}`,
                  route: `/chatroom/${roomId}`,
                  title: roomName,
                  subtitle: 'Chat room',
                  preview: inlinePreview,
                  createdAt: inlineTime || new Date().toISOString(),
                  unread: 0,
                }
              }

              try {
                const messagesResult = await fetchChatRoomMessages(roomId)
                const messages = Array.isArray(messagesResult)
                  ? messagesResult
                  : messagesResult?.messages || messagesResult?.data || []
                const latest = [...messages]
                  .reverse()
                  .find((entry) => asText(entry?.message || entry?.text || entry?.content))

                if (!latest) return null

                return {
                  id: `room-${roomId}`,
                  route: `/chatroom/${roomId}`,
                  title: latest?.senderName || roomName,
                  subtitle: roomName,
                  preview: asText(latest?.message || latest?.text || latest?.content),
                  createdAt: latest?.createdAt || latest?.timestamp || new Date().toISOString(),
                  unread: 0,
                }
              } catch {
                return null
              }
            }),
          )
        ).filter(Boolean)

        if (roomHistory.length > 0) {
          setChatroomItems((prev) => {
            const merged = [...roomHistory]
            prev.forEach((item) => {
              if (!merged.some((entry) => entry.id === item.id)) merged.push(item)
            })
            return sortByRecent(merged).slice(0, 30)
          })
        }
      } catch (error) {
        console.warn('Failed to initialize message history:', error)
      }
    }

    loadInitialMessageHistory()
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return undefined

    const socket = getSocket()

    const onPrivateMessage = (payload) => {
      const item = normalizePrivateNotification(payload)
      if (!item) return

      setPrivateChatItems((prev) => {
        const existing = prev.find((entry) => entry.id === item.id)
        const unread = (existing?.unread || 0) + 1
        return upsertById(prev, { ...item, unread })
      })
    }

    const onChatroomMessage = (payload) => {
      const item = normalizeChatroomNotification(payload)
      if (!item) return

      setChatroomItems((prev) => {
        const existing = prev.find((entry) => entry.id === item.id)
        const unread = (existing?.unread || 0) + 1
        return upsertById(prev, { ...item, unread })
      })
    }

    socket.on('message:new', onPrivateMessage)
    socket.on('newMessage', onPrivateMessage)

    socket.on('newChatroomMessage', onChatroomMessage)
    socket.on('chatroom:message', onChatroomMessage)
    socket.on('chatroomMessage', onChatroomMessage)

    return () => {
      socket.off('message:new', onPrivateMessage)
      socket.off('newMessage', onPrivateMessage)

      socket.off('newChatroomMessage', onChatroomMessage)
      socket.off('chatroom:message', onChatroomMessage)
      socket.off('chatroomMessage', onChatroomMessage)
    }
  }, [currentUserId])

  const unreadMessageCount =
    privateChatItems.reduce((sum, item) => sum + (Number(item?.unread) || 0), 0) +
    chatroomItems.reduce((sum, item) => sum + (Number(item?.unread) || 0), 0)

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderNav className="d-none d-md-flex">
          <CNavItem>
            <CNavLink to="/home" as={NavLink}>
              Home
            </CNavLink>
          </CNavItem>
          {isAdmin && (
            <CNavItem>
              <CNavLink to="/users" as={NavLink}>
                Users
              </CNavLink>
            </CNavItem>
          )}
          <CNavItem>
            <CNavLink href="#">Settings</CNavLink>
          </CNavItem>
        </CHeaderNav>
        <CHeaderNav className="ms-auto">
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilBell} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="#">
              <CIcon icon={cilList} size="lg" />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CDropdown variant="nav-item" placement="bottom-end">
              <CDropdownToggle caret={false} className="position-relative">
                <CIcon icon={cilEnvelopeOpen} size="lg" />
                {unreadMessageCount > 0 && (
                  <CBadge
                    color="danger"
                    shape="rounded-pill"
                    className="position-absolute top-0 start-100 translate-middle"
                  >
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </CBadge>
                )}
              </CDropdownToggle>
              <CDropdownMenu
                className="pt-0"
                placement="bottom-end"
                style={{
                  minWidth: '560px',
                  maxWidth: '560px',
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                }}
              >
                <CDropdownHeader className="fw-semibold mb-1 d-flex justify-content-between align-items-center">
                  <span>Messages</span>
                  {unreadMessageCount > 0 && (
                    <small className="text-medium-emphasis">{unreadMessageCount} new</small>
                  )}
                </CDropdownHeader>
                <div className="px-2 pb-2">
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="small fw-semibold mb-1 text-medium-emphasis">Private Chats</div>
                      <div style={{ maxHeight: '320px', overflowY: 'auto', borderRight: '1px solid var(--cui-border-color)' }}>
                        {privateChatItems.length === 0 ? (
                          <CDropdownItem disabled className="small">
                            No private messages
                          </CDropdownItem>
                        ) : (
                          privateChatItems.map((item) => (
                            <CDropdownItem
                              key={item.id}
                              onClick={() => openPrivateItem(item)}
                              style={{ whiteSpace: 'normal', cursor: 'pointer' }}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-1">
                                <div className="fw-semibold text-truncate">{item.title}</div>
                                {item.unread > 0 && (
                                  <CBadge color="danger" shape="rounded-pill">
                                    {item.unread}
                                  </CBadge>
                                )}
                              </div>
                              <div className="small text-medium-emphasis">{item.subtitle}</div>
                              <div className="small text-truncate">{item.preview}</div>
                            </CDropdownItem>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="small fw-semibold mb-1 text-medium-emphasis">Chatroom Chats</div>
                      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {chatroomItems.length === 0 ? (
                          <CDropdownItem disabled className="small">
                            No chatroom messages
                          </CDropdownItem>
                        ) : (
                          chatroomItems.map((item) => (
                            <CDropdownItem
                              key={item.id}
                              onClick={() => openChatroomItem(item)}
                              style={{ whiteSpace: 'normal', cursor: 'pointer' }}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-1">
                                <div className="fw-semibold text-truncate">{item.title}</div>
                                {item.unread > 0 && (
                                  <CBadge color="danger" shape="rounded-pill">
                                    {item.unread}
                                  </CBadge>
                                )}
                              </div>
                              <div className="small text-medium-emphasis">{item.subtitle}</div>
                              <div className="small text-truncate">{item.preview}</div>
                            </CDropdownItem>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CDropdownDivider />
                <CDropdownItem onClick={clearNotifications}>Mark all as read</CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </CNavItem>
        </CHeaderNav>
        <CHeaderNav>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> Light
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> Dark
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
