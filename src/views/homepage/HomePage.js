import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CButtonGroup,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CForm,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CCollapse,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChevronDown, cilMessageSquare, cilUser, cilX } from '@coreui/icons'
import api from 'src/api/client'
import styles from './HomePage.module.css'

export default function HomePage() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [filters, setFilters] = useState({
    gender: '',
    school: '',
    industry: '',
    interests: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, filters])

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

  const applyFilters = () => {
    let filtered = [...users]

    if (filters.gender) {
      filtered = filtered.filter((u) => u.gender?.toLowerCase() === filters.gender.toLowerCase())
    }

    if (filters.school) {
      const schoolDomain = filters.school.toLowerCase()
      filtered = filtered.filter((u) => u.email?.includes(schoolDomain))
    }

    if (filters.industry) {
      filtered = filtered.filter((u) => u.industry?.toLowerCase().includes(filters.industry.toLowerCase()))
    }

    if (filters.interests) {
      filtered = filtered.filter((u) => 
        u.interests && u.interests.some((i) => i.toLowerCase().includes(filters.interests.toLowerCase()))
      )
    }

    setFilteredUsers(filtered)
    setCurrentIndex(0)
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value })
  }

  const handleClearFilters = () => {
    setFilters({
      gender: '',
      school: '',
      industry: '',
      interests: '',
    })
  }

  const handleSkip = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredUsers.length))
  }

  const handleViewProfile = (userId) => {
    // Navigate to user profile
    window.location.href = `/#/user-profile/${userId}`
  }

  const handleMessage = (userId) => {
    // Navigate to chat
    window.location.href = `/#/chat`
  }

  if (loading) {
    return (
      <div className="text-center mt-4">
        <CSpinner color="primary" />
        <p className="mt-2">Loading users...</p>
      </div>
    )
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center mt-4">
        <CAlert color="info">No users found matching your criteria</CAlert>
        <CButton color="primary" onClick={handleClearFilters}>
          Clear Filters
        </CButton>
      </div>
    )
  }

  const currentUser = filteredUsers[currentIndex]
  const primaryPhoto = currentUser?.photos?.[0] || currentUser?.avatarUrl || '/placeholder.jpg'

  return (
    <>
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Discover & Connect</strong>
              <CButton
                color={showFilters ? 'primary' : 'secondary'}
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <CIcon icon={cilChevronDown} className="me-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </CButton>
            </CCardHeader>

            {/* Filters Section */}
            <CCollapse visible={showFilters}>
              <CCardBody style={{ borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9' }}>
                <CForm>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <label className="form-label">
                        <small className="text-muted">Gender</small>
                      </label>
                      <CFormSelect
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

                    <CCol md={6}>
                      <label className="form-label">
                        <small className="text-muted">School Domain</small>
                      </label>
                      <CFormInput
                        type="text"
                        placeholder="e.g., duke.edu"
                        value={filters.school}
                        onChange={(e) => handleFilterChange('school', e.target.value)}
                      />
                    </CCol>

                    <CCol md={6}>
                      <label className="form-label">
                        <small className="text-muted">Industry</small>
                      </label>
                      <CFormInput
                        type="text"
                        placeholder="e.g., Technology"
                        value={filters.industry}
                        onChange={(e) => handleFilterChange('industry', e.target.value)}
                      />
                    </CCol>

                    <CCol md={6}>
                      <label className="form-label">
                        <small className="text-muted">Interests</small>
                      </label>
                      <CFormInput
                        type="text"
                        placeholder="e.g., AI, Crypto"
                        value={filters.interests}
                        onChange={(e) => handleFilterChange('interests', e.target.value)}
                      />
                    </CCol>

                    <CCol xs={12}>
                      <CButton color="secondary" size="sm" onClick={handleClearFilters} variant="outline">
                        Clear All Filters
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCollapse>
          </CCard>
        </CCol>
      </CRow>

      {/* User Card Display */}
      <CRow>
        <CCol xs={12}>
          <CCard className={styles.userCard}>
            {/* User Photo */}
            <div className={styles.photoContainer}>
              <img src={primaryPhoto} alt={currentUser?.firstName} className={styles.photo} />
            </div>

            <CCardBody>
              {/* User Info */}
              <div className="mb-3">
                <h4 className="mb-1">
                  {currentUser?.firstName} {currentUser?.lastName}
                </h4>
                <p className="text-muted mb-2">
                  {currentUser?.type} | {currentUser?.origin}
                </p>

                {currentUser?.bio && <p className="mb-2">{currentUser.bio}</p>}

                {/* Interests Pills */}
                {currentUser?.interests && currentUser.interests.length > 0 && (
                  <div className="mb-3">
                    {currentUser.interests.map((interest, idx) => (
                      <span key={idx} className={styles.tag}>
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {/* Additional Info */}
                <div className={styles.infoGrid}>
                  {currentUser?.industry && (
                    <div>
                      <small className="text-muted">Industry</small>
                      <p className="mb-0">{currentUser.industry}</p>
                    </div>
                  )}
                  {currentUser?.currentRole && (
                    <div>
                      <small className="text-muted">Role</small>
                      <p className="mb-0">{currentUser.currentRole}</p>
                    </div>
                  )}
                  {currentUser?.graduationYear && (
                    <div>
                      <small className="text-muted">Graduation</small>
                      <p className="mb-0">{currentUser.graduationYear}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <CButtonGroup role="group" className="w-100">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-grow-1"
                  title="Skip to next user"
                >
                  <CIcon icon={cilX} /> Skip
                </CButton>
                <CButton
                  color="primary"
                  onClick={() => handleViewProfile(currentUser._id || currentUser.id)}
                  className="flex-grow-1"
                  title="View full profile"
                >
                  <CIcon icon={cilUser} /> Profile
                </CButton>
                <CButton
                  color="success"
                  onClick={() => handleMessage(currentUser._id || currentUser.id)}
                  className="flex-grow-1"
                  title="Send message"
                >
                  <CIcon icon={cilMessageSquare} /> Message
                </CButton>
              </CButtonGroup>

              {/* Counter */}
              <div className="text-center mt-3">
                <small className="text-muted">
                  {currentIndex + 1} of {filteredUsers.length}
                </small>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}
