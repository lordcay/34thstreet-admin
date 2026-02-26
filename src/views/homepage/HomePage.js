import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CFormSelect,
  CCol,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChevronLeft, cilChevronRight, cilCommentSquare, cilUser } from '@coreui/icons'
import { cilReload } from '@coreui/icons'
import api from 'src/api/client'
import { getCurrentUserId } from 'src/utils/auth'
import styles from './HomePage.module.css'

export default function HomePage() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [imageIndexes, setImageIndexes] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shuffleKey, setShuffleKey] = useState(() => Math.floor(Math.random() * 1000000))
  const [filters, setFilters] = useState({
    name: '',
    gender: '',
    schoolName: '',
    country: '',
    industry: '',
    program: '',
  })

  const currentUserId = getCurrentUserId()

  const getCurrentUserEmail = () => {
    const userJsonKeys = ['adminUser', 'user', 'currentUser']
    for (const key of userJsonKeys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.email) return String(parsed.email).toLowerCase()
      } catch {
        // ignore malformed JSON
      }
    }
    return ''
  }

  const currentUserEmail = getCurrentUserEmail()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, filters, currentUserId, currentUserEmail, shuffleKey])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/accounts')
      const data = Array.isArray(response.data) ? response.data : response.data.users || []
      setUsers(data)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const getUserPhotos = (user) => {
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
  }

  const schoolDomainNameMap = {
    'duke.edu': 'Duke University',
    'g.harvard.edu': 'Harvard University',
    'harvard.edu': 'Harvard University',
    'mit.edu': 'Massachusetts Institute of Technology',
    'stanford.edu': 'Stanford University',
    'yale.edu': 'Yale University',
    'columbia.edu': 'Columbia University',
    'princeton.edu': 'Princeton University',
    'upenn.edu': 'University of Pennsylvania',
    'wharton.upenn.edu': 'Wharton School',
    'kellogg.northwestern.edu': 'Kellogg School of Management',
    'northwestern.edu': 'Northwestern University',
    'chicagobooth.edu': 'Chicago Booth',
    'chicago.edu': 'University of Chicago',
    'berkeley.edu': 'UC Berkeley',
    'ucla.edu': 'UCLA',
    'nyu.edu': 'New York University',
    'cornell.edu': 'Cornell University',
    'cam.ac.uk': 'University of Cambridge',
    'ox.ac.uk': 'University of Oxford',
    'insead.edu': 'INSEAD',
    'london.edu': 'London Business School',
  }

  const getSchoolDomain = (user) => {
    const email = user?.email || ''
    const domainPart = email.split('@')[1] || ''
    return domainPart.toLowerCase()
  }

  const getSchoolName = (user) => {
    const directSchoolName =
      user?.schoolName || user?.school || user?.university || user?.institution || user?.school_name || ''

    if (String(directSchoolName).trim()) return String(directSchoolName).trim()

    const domain = getSchoolDomain(user)
    return schoolDomainNameMap[domain] || domain
  }

  const getCountry = (user) => (user?.origin || user?.country || '').trim()

  const getIndustry = (user) => (user?.industry || '').trim()

  const getProgram = (user) => (user?.program || user?.type || user?.fieldOfStudy || '').trim()

  const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim()

  const hasPhoto = (user) => getUserPhotos(user).length > 0

  const isCurrentUser = (user) => {
    const userId = user?._id || user?.id || user?.userId || ''
    const hasIdMatch = currentUserId && userId && String(currentUserId) === String(userId)
    const userEmail = String(user?.email || '').toLowerCase()
    const hasEmailMatch = currentUserEmail && userEmail && currentUserEmail === userEmail
    return Boolean(hasIdMatch || hasEmailMatch)
  }

  const baseUsers = useMemo(() => {
    return users.filter((user) => hasPhoto(user) && !isCurrentUser(user))
  }, [users, currentUserId, currentUserEmail])

  const shuffleUsers = (userList) => {
    const shuffled = [...userList]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }
    return shuffled
  }

  const randomizedUsers = useMemo(() => {
    return shuffleUsers(baseUsers)
  }, [baseUsers, shuffleKey])

  const options = useMemo(() => {
    const getUniqueSorted = (values) => {
      const normalized = values
        .map((value) => value?.trim())
        .filter(Boolean)
        .filter((value, index, arr) => arr.findIndex((v) => v.toLowerCase() === value.toLowerCase()) === index)
      return normalized.sort((a, b) => a.localeCompare(b))
    }

    return {
      schoolNames: getUniqueSorted(baseUsers.map((user) => getSchoolName(user))),
      countries: getUniqueSorted(baseUsers.map((user) => getCountry(user))),
      industries: getUniqueSorted(baseUsers.map((user) => getIndustry(user))),
      programs: getUniqueSorted(baseUsers.map((user) => getProgram(user))),
    }
  }, [baseUsers])

  const applyFilters = () => {
    let filtered = [...randomizedUsers]

    if (filters.name) {
      const nameQuery = filters.name.toLowerCase()
      filtered = filtered.filter((user) => getFullName(user).toLowerCase().includes(nameQuery))
    }

    if (filters.gender) {
      filtered = filtered.filter((u) => u.gender?.toLowerCase() === filters.gender.toLowerCase())
    }

    if (filters.schoolName) {
      const selectedSchool = filters.schoolName.toLowerCase()
      filtered = filtered.filter((u) => getSchoolName(u).toLowerCase() === selectedSchool)
    }

    if (filters.country) {
      const selectedCountry = filters.country.toLowerCase()
      filtered = filtered.filter((u) => getCountry(u).toLowerCase() === selectedCountry)
    }

    if (filters.industry) {
      const selectedIndustry = filters.industry.toLowerCase()
      filtered = filtered.filter((u) => getIndustry(u).toLowerCase() === selectedIndustry)
    }

    if (filters.program) {
      const selectedProgram = filters.program.toLowerCase()
      filtered = filtered.filter((u) => getProgram(u).toLowerCase() === selectedProgram)
    }

    setFilteredUsers(filtered)
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value })
  }

  const handleClearFilters = () => {
    setFilters({
      name: '',
      gender: '',
      schoolName: '',
      country: '',
      industry: '',
      program: '',
    })
  }

  const handleRefreshUsers = () => {
    setShuffleKey((prev) => prev + 1)
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => String(value).trim() !== '')
  }, [filters])

  const handleViewProfile = (userId) => {
    window.location.href = `/#/user-profile/${userId}`
  }

  const handleMessage = (userId) => {
    window.location.href = `/#/private-chat/${userId}`
  }

  const handlePrevPhoto = (userId, totalPhotos) => {
    setImageIndexes((prev) => ({
      ...prev,
      [userId]: ((prev[userId] ?? 0) - 1 + totalPhotos) % totalPhotos,
    }))
  }

  const handleNextPhoto = (userId, totalPhotos) => {
    setImageIndexes((prev) => ({
      ...prev,
      [userId]: ((prev[userId] ?? 0) + 1) % totalPhotos,
    }))
  }

  const getInterests = (user) => {
    if (!Array.isArray(user?.interests)) return []
    return user.interests.slice(0, 3)
  }

  if (loading) {
    return (
      <div className="text-center mt-4 py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading users...</p>
      </div>
    )
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>
  }

  return (
    <div className={styles.homePage}>
      <CCard className={styles.filterCard}>
        <CCardBody className={styles.filterBody}>
          <CForm>
            <CRow className="g-2 align-items-end">
              <CCol xl={2} lg={3} md={4} sm={6}>
                <label className={styles.inputLabel}>Search Name</label>
                <CFormInput
                  size="sm"
                  placeholder="Search by name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </CCol>
              <CCol xl={2} lg={2} md={4} sm={6}>
                <label className={styles.inputLabel}>Gender</label>
                <CFormSelect
                  size="sm"
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  options={[
                    { label: 'All Genders', value: '' },
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              </CCol>
              <CCol xl={2} lg={3} md={4} sm={6}>
                <label className={styles.inputLabel}>School Name</label>
                <CFormInput
                  size="sm"
                  list="school-name-options"
                  placeholder="All schools"
                  value={filters.schoolName}
                  onChange={(e) => handleFilterChange('schoolName', e.target.value)}
                />
              </CCol>
              <CCol xl={2} lg={2} md={4} sm={6}>
                <label className={styles.inputLabel}>Country</label>
                <CFormInput
                  size="sm"
                  list="country-options"
                  placeholder="All countries"
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                />
              </CCol>
              <CCol xl={2} lg={2} md={4} sm={6}>
                <label className={styles.inputLabel}>Industry</label>
                <CFormInput
                  size="sm"
                  list="industry-options"
                  placeholder="All industries"
                  value={filters.industry}
                  onChange={(e) => handleFilterChange('industry', e.target.value)}
                />
              </CCol>
              <CCol xl={1} lg={2} md={4} sm={6}>
                <label className={styles.inputLabel}>Program</label>
                <CFormInput
                  size="sm"
                  list="program-options"
                  placeholder="All programs"
                  value={filters.program}
                  onChange={(e) => handleFilterChange('program', e.target.value)}
                />
              </CCol>
              <CCol xl={1} lg={2} md={4} sm={6} className={styles.filterActionCol}>
                <div className={styles.filterActionsInline}>
                  <CButton size="sm" className={styles.refreshFilterBtn} onClick={handleRefreshUsers}>
                    <CIcon icon={cilReload} />
                  </CButton>
                  <CButton size="sm" className={styles.clearFilterBtn} onClick={handleClearFilters}>
                    Clear
                  </CButton>
                </div>
              </CCol>
            </CRow>

            <datalist id="school-name-options">
              {options.schoolNames.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="country-options">
              {options.countries.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="industry-options">
              {options.industries.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="program-options">
              {options.programs.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>

            {hasActiveFilters && (
              <div className={styles.filterMetaRow}>
                <p className={styles.resultText}>{filteredUsers.length} users found</p>
              </div>
            )}
          </CForm>
        </CCardBody>
      </CCard>

      <div className={styles.gridScroll}>
        {filteredUsers.length === 0 ? (
          <CAlert color="info" className="mb-0">
            No users found matching your criteria.
          </CAlert>
        ) : (
          <div className={styles.usersGrid}>
            {filteredUsers.map((user) => {
              const userId = user._id || user.id
              const photos = getUserPhotos(user)
              const totalPhotos = photos.length
              const activePhotoIndex = totalPhotos > 0 ? (imageIndexes[userId] ?? 0) % totalPhotos : 0
              const activePhoto = totalPhotos > 0 ? photos[activePhotoIndex] : null

              return (
                <CCard key={userId} className={styles.userCard}>
                  <div className={styles.photoContainer}>
                    {activePhoto ? (
                      <>
                        <img
                          src={activePhoto}
                          alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
                          className={styles.photo}
                        />
                        {totalPhotos > 1 && (
                          <>
                            <button
                              type="button"
                              className={`${styles.photoNavBtn} ${styles.photoNavLeft}`}
                              onClick={() => handlePrevPhoto(userId, totalPhotos)}
                              aria-label="Previous photo"
                            >
                              <CIcon icon={cilChevronLeft} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.photoNavBtn} ${styles.photoNavRight}`}
                              onClick={() => handleNextPhoto(userId, totalPhotos)}
                              aria-label="Next photo"
                            >
                              <CIcon icon={cilChevronRight} />
                            </button>

                            <div className={styles.photoDots}>
                              {photos.map((_, idx) => (
                                <span
                                  key={`${userId}-dot-${idx}`}
                                  className={idx === activePhotoIndex ? styles.photoDotActive : styles.photoDot}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className={styles.photoPlaceholder}>No photo uploaded</div>
                    )}
                  </div>

                  <CCardBody className={styles.userCardBody}>
                    <h5 className={styles.userName}>
                      {user?.firstName} {user?.lastName}
                    </h5>
                    <p className={styles.userMeta}>
                      {user?.type || 'Member'}
                      {user?.origin ? ` • ${user.origin}` : ''}
                    </p>

                    {user?.bio && <p className={styles.userBio}>{user.bio}</p>}

                    <div className={styles.tagWrap}>
                      {getInterests(user).map((interest) => (
                        <span key={interest} className={styles.tag}>
                          {interest}
                        </span>
                      ))}
                    </div>

                    <div className={styles.infoRow}>
                      <span>{user?.industry || 'No industry yet'}</span>
                      <span>{user?.graduationYear || 'N/A'}</span>
                    </div>

                    <div className={styles.actionRow}>
                      <CButton
                        size="sm"
                        onClick={() => handleViewProfile(userId)}
                        className={styles.profileBtn}
                      >
                        <CIcon icon={cilUser} className="me-1" /> Profile
                      </CButton>
                      <CButton
                        size="sm"
                        onClick={() => handleMessage(userId)}
                        className={styles.messageBtn}
                      >
                        <CIcon icon={cilCommentSquare} className="me-1" /> Message
                      </CButton>
                    </div>
                  </CCardBody>
                </CCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
