import React, { useEffect, useMemo, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'
import api from 'src/api/client'
import { getCurrentUserId } from 'src/utils/auth'

export default function Profile() {
  const userId = useMemo(() => getCurrentUserId(), [])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    if (!userId) {
      setError('Unable to identify current user. Please login again.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/accounts/${userId}`)
      setUser(res.data?.user || res.data)
    } catch (e) {
      console.error(e)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setUser((prev) => ({ ...prev, [field]: value }))
  }

  const saveProfile = async () => {
    if (!userId || !user) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/accounts/${userId}`, user)
    } catch (e) {
      console.error(e)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-4">
        <CSpinner color="primary" />
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
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>My Profile</strong>
        <CButton color="primary" size="sm" onClick={saveProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </CButton>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormInput
              label="First Name"
              value={user.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              label="Last Name"
              value={user.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              label="Email"
              value={user.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              label="Phone"
              value={user.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              label="Industry"
              value={user.industry || ''}
              onChange={(e) => handleChange('industry', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              label="Current Role"
              value={user.currentRole || ''}
              onChange={(e) => handleChange('currentRole', e.target.value)}
            />
          </CCol>
          <CCol xs={12}>
            <CFormTextarea
              label="Bio"
              rows={4}
              value={user.bio || ''}
              onChange={(e) => handleChange('bio', e.target.value)}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}
