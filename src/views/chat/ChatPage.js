import React, { useEffect, useState, useContext } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CListGroup,
  CListGroupItem,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CInputGroup,
  CFormInput,
  CButton,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilUser, cilEnvelopeOpen } from '@coreui/icons'
import { fetchUserConversations } from 'src/api/messages'
import { UnreadContext } from 'src/context/UnreadContext'
import { getCurrentUserId } from 'src/utils/auth'

export default function ChatPage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const { counts, refresh } = useContext(UnreadContext)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    setError('')
    try {
      const userId = getCurrentUserId()
      if (!userId) {
        setError('Unable to identify current user. Please login again.')
        return
      }
      const res = await fetchUserConversations(userId)
      const data = Array.isArray(res) ? res : res.conversations || res.messages || []
      setConversations(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const filtered = conversations.filter((c) => {
    if (!query) return true
    const other = c.otherUser || c.participant || c.user || {}
    const name = `${other.firstName || ''} ${other.lastName || ''}`.toLowerCase()
    const email = (other.email || '').toLowerCase()
    return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase())
  })

  const openConversation = (conv) => {
    const other = conv.otherUser || conv.participant || conv.user || {}
    const otherId = other._id || other.id || other
    // navigate to private chat screen
    window.location.href = `/#/private-chat/${otherId}`
  }

  if (loading) return (
    <div className="text-center mt-4"><CSpinner color="primary" /><p className="mt-2">Loading conversations...</p></div>
  )

  if (error) return <CAlert color="danger">{error}</CAlert>

  return (
    <>
      <CRow className="mb-3">
        <CCol xs={12} md={8}>
          <CInputGroup>
            <CFormInput placeholder="Search conversations..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <CButton type="button" color="secondary" onClick={() => setQuery('')}>
              <CIcon icon={cilSearch} />
            </CButton>
          </CInputGroup>
        </CCol>
        <CCol xs={12} md={4} className="text-end">
          <CButton color="info" onClick={() => { loadConversations(); refresh() }}>Refresh</CButton>
        </CCol>
      </CRow>

      {filtered.length === 0 ? (
        <CAlert color="info">No conversations found.</CAlert>
      ) : (
        <CCard>
          <CCardHeader>
            <strong>Direct Messages</strong>
          </CCardHeader>
          <CCardBody>
            <CListGroup>
              {filtered.map((conv) => {
                const other = conv.otherUser || conv.participant || conv.user || {}
                const name = `${other.firstName || ''} ${other.lastName || ''}`.trim() || other.email || 'Unknown'
                const last = conv.lastMessage || conv.last || conv.preview || ''
                const time = conv.updatedAt || conv.lastAt || conv.lastMessageAt || ''
                const otherId = other._id || other.id || other
                const unread = counts[otherId] || conv.unreadCount || conv.unread || 0
                return (
                  <CListGroupItem key={otherId} onClick={() => openConversation(conv)} style={{ cursor: 'pointer' }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{name}</strong>
                        <div className="small text-muted">{last}</div>
                      </div>
                      <div className="text-end">
                        <small className="text-muted">{time ? new Date(time).toLocaleString() : ''}</small>
                        {unread > 0 && <CBadge color="danger" className="ms-2">{unread}</CBadge>}
                      </div>
                    </div>
                  </CListGroupItem>
                )
              })}
            </CListGroup>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}
