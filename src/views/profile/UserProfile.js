import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilChevronLeft, cilChevronRight, cilCommentSquare } from '@coreui/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from 'src/api/client'
import styles from './UserProfile.module.css'

export default function UserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  const loadUserProfile = async () => {
    if (!userId) {
      setError('User ID is missing.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/accounts/${userId}`)
      setUser(response.data?.user || response.data)
      setActivePhotoIndex(0)
    } catch (err) {
      console.error('Failed to load user profile:', err)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const photos = useMemo(() => {
    const photoList = Array.isArray(user?.photos) ? user.photos : []
    const normalized = photoList
      .map((photo) => {
        if (typeof photo === 'string') return photo
        return photo?.url || photo?.secure_url || photo?.uri || null
      })
      .filter(Boolean)

    if (normalized.length > 0) return normalized
    if (user?.avatarUrl) return [user.avatarUrl]
    return []
  }, [user])

  const activePhoto = photos[activePhotoIndex] || null

  const nextPhoto = () => {
    if (photos.length < 2) return
    setActivePhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    if (photos.length < 2) return
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const getFullName = () => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User Profile'

  const detailItems = [
    { label: 'Email', value: user?.email },
    { label: 'Phone', value: user?.phone },
    { label: 'Gender', value: user?.gender },
    { label: 'Date of Birth', value: user?.DOB || user?.dob },
    { label: 'Country', value: user?.origin || user?.country },
    { label: 'School', value: user?.schoolName || user?.school || user?.university || user?.institution },
    { label: 'Program', value: user?.program || user?.type },
    { label: 'Field of Study', value: user?.fieldOfStudy },
    { label: 'Graduation Year', value: user?.graduationYear },
    { label: 'Industry', value: user?.industry },
    { label: 'Current Role', value: user?.currentRole },
    { label: 'Relationship', value: user?.rship },
    { label: 'LinkedIn', value: user?.linkedIn },
  ].filter((item) => item.value)

  const interests = Array.isArray(user?.interests) ? user.interests : []
  const languages = Array.isArray(user?.languages)
    ? user.languages
    : typeof user?.languages === 'string'
      ? user.languages.split(',').map((lang) => lang.trim()).filter(Boolean)
      : []

  if (loading) {
    return (
      <div className="text-center mt-4 py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>
  }

  if (!user) {
    return <CAlert color="info">No profile data found.</CAlert>
  }

  return (
    <div className={styles.pageWrap}>
      <CCard className={styles.profileCard}>
        <CCardBody className={styles.profileBody}>
          <div className={styles.topActions}>
            <CButton color="light" size="sm" className={styles.backBtn} onClick={() => navigate(-1)}>
              <CIcon icon={cilArrowLeft} className="me-1" /> Back
            </CButton>
            <CButton
              size="sm"
              className={styles.messageBtn}
              onClick={() => navigate(`/private-chat/${userId}`)}
            >
              <CIcon icon={cilCommentSquare} className="me-1" /> Message
            </CButton>
          </div>

          <div className={styles.heroSection}>
            <div className={styles.photoWrap}>
              {activePhoto ? (
                <img src={activePhoto} alt={getFullName()} className={styles.heroPhoto} />
              ) : (
                <div className={styles.photoFallback}>No photo available</div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.photoNavBtn} ${styles.photoNavLeft}`}
                    onClick={prevPhoto}
                    aria-label="Previous photo"
                  >
                    <CIcon icon={cilChevronLeft} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.photoNavBtn} ${styles.photoNavRight}`}
                    onClick={nextPhoto}
                    aria-label="Next photo"
                  >
                    <CIcon icon={cilChevronRight} />
                  </button>
                  <div className={styles.photoDots}>
                    {photos.map((_, index) => (
                      <span
                        key={`profile-photo-dot-${index}`}
                        className={index === activePhotoIndex ? styles.photoDotActive : styles.photoDot}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className={styles.heroInfo}>
              <h2 className={styles.userName}>{getFullName()}</h2>
              <p className={styles.userMeta}>
                {user?.program || user?.type || 'Member'}
                {(user?.origin || user?.country) && ` • ${user?.origin || user?.country}`}
              </p>

              {user?.bio && <p className={styles.userBio}>{user.bio}</p>}

              {interests.length > 0 && (
                <div className={styles.sectionBlock}>
                  <p className={styles.sectionTitle}>Interests</p>
                  <div className={styles.pillsWrap}>
                    {interests.map((interest) => (
                      <CBadge key={interest} className={styles.pillBadge}>
                        {interest}
                      </CBadge>
                    ))}
                  </div>
                </div>
              )}

              {languages.length > 0 && (
                <div className={styles.sectionBlock}>
                  <p className={styles.sectionTitle}>Languages</p>
                  <div className={styles.pillsWrap}>
                    {languages.map((language) => (
                      <CBadge key={language} className={styles.secondaryPillBadge}>
                        {language}
                      </CBadge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.detailsSection}>
            <h5 className={styles.detailsHeading}>Profile Details</h5>
            <CRow className="g-3">
              {detailItems.map((item) => (
                <CCol key={item.label} md={6} xl={4}>
                  <div className={styles.detailCard}>
                    <p className={styles.detailLabel}>{item.label}</p>
                    {item.label === 'LinkedIn' ? (
                      <a
                        href={String(item.value).startsWith('http') ? item.value : `https://${item.value}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.detailLink}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className={styles.detailValue}>{item.value}</p>
                    )}
                  </div>
                </CCol>
              ))}
            </CRow>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}
