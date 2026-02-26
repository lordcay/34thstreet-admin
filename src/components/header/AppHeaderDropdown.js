import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilBell,
  cilCreditCard,
  cilCommentSquare,
  cilEnvelopeOpen,
  cilFile,
  cilLockLocked,
  cilSettings,
  cilTask,
  cilUser,
  cilAccountLogout,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import api from 'src/api/client'
import { getCurrentUserId, getCurrentUserName } from 'src/utils/auth'

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [avatarError, setAvatarError] = useState(false)

  const parseStoredUser = useCallback(() => {
    const userJsonKeys = ['adminUser', 'user', 'currentUser']
    for (const key of userJsonKeys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') return parsed
      } catch {
        // ignore malformed JSON
      }
    }
    return null
  }, [])

  const persistUser = (user) => {
    if (!user || typeof user !== 'object') return
    const serialized = JSON.stringify(user)
    localStorage.setItem('adminUser', serialized)
    localStorage.setItem('user', serialized)
    localStorage.setItem('currentUser', serialized)
  }

  const toAbsoluteUrl = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''

    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/^http:\/\//i, 'https://')
    }

    const base = import.meta.env.VITE_API_BASE_URL || 'https://three4th-street-backend.onrender.com'
    return `${String(base).replace(/\/$/, '')}/${raw.replace(/^\//, '')}`
  }

  const resolveAvatar = (user) => {
    if (!user) return ''

    const photoList = Array.isArray(user?.photos) ? user.photos : []
    const firstPhoto = photoList
      .map((photo) => {
        if (typeof photo === 'string') return photo
        return photo?.url || photo?.secure_url || photo?.uri || photo?.src || ''
      })
      .find(Boolean)

    const directAvatar =
      user?.avatarUrl ||
      user?.avatar ||
      user?.profilePhoto ||
      user?.photo ||
      user?.image ||
      ''

    return toAbsoluteUrl(firstPhoto || directAvatar)
  }

  const refreshCurrentUser = useCallback(async () => {
    const storedUser = parseStoredUser()
    if (storedUser) {
      setCurrentUser((prev) => ({ ...(prev || {}), ...storedUser }))
      setAvatarError(false)
    }

    const userId = getCurrentUserId() || storedUser?._id || storedUser?.id || storedUser?.userId
    if (!userId) return

    try {
      const response = await api.get(`/accounts/${userId}`)
      const latest = response?.data?.user || response?.data
      if (latest && typeof latest === 'object') {
        setCurrentUser(latest)
        setAvatarError(false)
        persistUser(latest)
      }
    } catch (err) {
      console.error('Failed to refresh header user profile:', err)
    }
  }, [parseStoredUser])

  useEffect(() => {
    refreshCurrentUser()

    const onStorage = () => {
      refreshCurrentUser()
    }

    const onVisibility = () => {
      if (!document.hidden) refreshCurrentUser()
    }

    const onAuthUserUpdated = () => {
      refreshCurrentUser()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('auth-user-updated', onAuthUserUpdated)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = setInterval(() => {
      refreshCurrentUser()
    }, 15000)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('auth-user-updated', onAuthUserUpdated)
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(interval)
    }
  }, [refreshCurrentUser])

  const currentUserName =
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
    currentUser?.name ||
    getCurrentUserName()
  const currentUserAvatar = resolveAvatar(currentUser)
  const fallbackAvatar = useMemo(() => {
    const label = encodeURIComponent(currentUserName || 'User')
    return `https://ui-avatars.com/api/?name=${label}&size=96&background=581845&color=ffffff&bold=true`
  }, [currentUserName])
  const avatarSrc = !avatarError && currentUserAvatar ? currentUserAvatar : fallbackAvatar

  const handleLogout = () => {
    // Clear auth token
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    localStorage.removeItem('user')
    localStorage.removeItem('currentUser')
    
    // Redirect to login
    navigate('/login')
  }
  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar
          src={avatarSrc}
          text={String(currentUserName || 'U').charAt(0).toUpperCase()}
          size="md"
          style={{ border: '2px solid rgba(255,255,255,0.25)' }}
          onError={() => setAvatarError(true)}
        />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Account</CDropdownHeader>
        <CDropdownItem href="#">
          <CIcon icon={cilBell} className="me-2" />
          Updates
          <CBadge color="info" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilEnvelopeOpen} className="me-2" />
          Messages
          <CBadge color="success" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilTask} className="me-2" />
          Tasks
          <CBadge color="danger" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilCommentSquare} className="me-2" />
          Comments
          <CBadge color="warning" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownHeader className="bg-body-secondary fw-semibold my-2">Settings</CDropdownHeader>
        <CDropdownItem href="#">
          <CIcon icon={cilUser} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilSettings} className="me-2" />
          Settings
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilCreditCard} className="me-2" />
          Payments
          <CBadge color="secondary" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilFile} className="me-2" />
          Projects
          <CBadge color="primary" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem href="#">
          <CIcon icon={cilLockLocked} className="me-2" />
          Lock Account
        </CDropdownItem>
        <CDropdownItem onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
