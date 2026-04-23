import React, { useEffect, useState } from 'react'
import {
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CAlert,
  CRow,
  CCol,
  CInputGroup,
  CInputGroupText,
  CFormInput,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilCheckCircle, cilXCircle, cilInfo, cilReload } from '@coreui/icons'
import {
  fetchAlumniRequests,
  fetchAlumniRequestStats,
  approveAlumniRequest,
  denyAlumniRequest,
} from 'src/api/alumniRequests'

const statusColor = (status) => {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'success'
  if (status === 'denied') return 'danger'
  return 'secondary'
}

export default function AlumniRequests() {
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, denied: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [visibleModal, setVisibleModal] = useState(false)
  const [denyModal, setDenyModal] = useState(false)
  const [denyReason, setDenyReason] = useState('')
  const [denyTargetId, setDenyTargetId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        fetchAlumniRequests(),
        fetchAlumniRequestStats(),
      ])
      setRequests(Array.isArray(data) ? data : data.requests || [])
      setStats(statsData)
    } catch (e) {
      console.error(e)
      alert('Failed to load alumni requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = React.useMemo(() => {
    let result = [...requests]

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (r) =>
          r.firstName?.toLowerCase().includes(term) ||
          r.lastName?.toLowerCase().includes(term) ||
          r.personalEmail?.toLowerCase().includes(term) ||
          r.workEmail?.toLowerCase().includes(term) ||
          r.schoolGraduatedFrom?.toLowerCase().includes(term) ||
          r.degreeHeld?.toLowerCase().includes(term),
      )
    }

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return result
  }, [requests, statusFilter, searchTerm])

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this request? An account will be created for this user.')) return
    setActionId(id)
    try {
      await approveAlumniRequest(id)
      await load()
    } catch (e) {
      console.error(e)
      alert(e.response?.data?.message || 'Failed to approve request.')
    } finally {
      setActionId(null)
    }
  }

  const openDenyModal = (id) => {
    setDenyTargetId(id)
    setDenyReason('')
    setDenyModal(true)
  }

  const handleDeny = async () => {
    if (!denyTargetId) return
    setActionId(denyTargetId)
    try {
      await denyAlumniRequest(denyTargetId, denyReason || undefined)
      setDenyModal(false)
      await load()
    } catch (e) {
      console.error(e)
      alert(e.response?.data?.message || 'Failed to deny request.')
    } finally {
      setActionId(null)
    }
  }

  const openDetail = (req) => {
    setSelectedRequest(req)
    setVisibleModal(true)
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      {/* Stats Cards */}
      <CRow className="mb-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'warning' },
          { label: 'Approved', value: stats.approved, color: 'success' },
          { label: 'Denied', value: stats.denied, color: 'danger' },
          { label: 'Total', value: stats.total, color: 'info' },
        ].map((s) => (
          <CCol sm={6} lg={3} key={s.label}>
            <CCard className={`mb-3 border-top-${s.color} border-top-3`}>
              <CCardBody className="text-center">
                <div className="fs-5 fw-semibold">{s.value}</div>
                <div className="text-body-secondary small text-uppercase">{s.label}</div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Main Table Card */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Alumni / Professional Requests</strong>
          <div className="d-flex gap-2 align-items-center">
            <CInputGroup size="sm" style={{ width: 300 }}>
              <CInputGroupText>
                <CIcon icon={cilSearch} size="sm" />
              </CInputGroupText>
              <CFormInput
                placeholder="Search name, email, school, degree..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CInputGroup>

            <CButtonGroup size="sm">
              {['all', 'pending', 'approved', 'denied'].map((s) => (
                <CButton
                  key={s}
                  color={statusFilter === s ? 'primary' : 'outline-primary'}
                  onClick={() => setStatusFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </CButton>
              ))}
            </CButtonGroup>

            <CButton color="light" size="sm" onClick={load} title="Refresh">
              <CIcon icon={cilReload} />
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody>
          <div className="text-body-secondary small mb-2">
            Showing {filtered.length} of {requests.length} requests
          </div>

          {filtered.length === 0 ? (
            <CAlert color="info">No alumni / professional requests found.</CAlert>
          ) : (
            <CTable hover responsive striped align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Personal Email</CTableHeaderCell>
                  <CTableHeaderCell>Work Email</CTableHeaderCell>
                  <CTableHeaderCell>School</CTableHeaderCell>
                  <CTableHeaderCell>Degree</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filtered.map((req) => (
                  <CTableRow key={req._id || req.id}>
                    <CTableDataCell>
                      {req.firstName} {req.lastName}
                    </CTableDataCell>
                    <CTableDataCell>{req.personalEmail}</CTableDataCell>
                    <CTableDataCell>{req.workEmail}</CTableDataCell>
                    <CTableDataCell>{req.schoolGraduatedFrom}</CTableDataCell>
                    <CTableDataCell>{req.degreeHeld}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={statusColor(req.status)}>{req.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-1">
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(req)}
                          title="View Details"
                        >
                          <CIcon icon={cilInfo} />
                        </CButton>

                        {req.status === 'pending' && (
                          <>
                            <CButton
                              color="success"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(req._id || req.id)}
                              disabled={actionId === (req._id || req.id)}
                              title="Approve"
                            >
                              {actionId === (req._id || req.id) ? (
                                <CSpinner size="sm" />
                              ) : (
                                <CIcon icon={cilCheckCircle} />
                              )}
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => openDenyModal(req._id || req.id)}
                              disabled={actionId === (req._id || req.id)}
                              title="Deny"
                            >
                              <CIcon icon={cilXCircle} />
                            </CButton>
                          </>
                        )}
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Detail Modal */}
      <CModal visible={visibleModal} onClose={() => setVisibleModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Alumni / Professional Request Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedRequest && (
            <CListGroup flush>
              <CListGroupItem>
                <strong>Name:</strong> {selectedRequest.firstName} {selectedRequest.lastName}
              </CListGroupItem>
              <CListGroupItem>
                <strong>Gender:</strong> {selectedRequest.gender}
              </CListGroupItem>
              <CListGroupItem>
                <strong>Phone:</strong> {selectedRequest.phone}
              </CListGroupItem>
              <CListGroupItem>
                <strong>Personal Email:</strong> {selectedRequest.personalEmail}
              </CListGroupItem>
              <CListGroupItem>
                <strong>Work / Alumni Email:</strong> {selectedRequest.workEmail}
              </CListGroupItem>
              <CListGroupItem>
                <strong>School Graduated From:</strong> {selectedRequest.schoolGraduatedFrom}
              </CListGroupItem>
              <CListGroupItem>
                <strong>Degree Held:</strong> {selectedRequest.degreeHeld}
              </CListGroupItem>
              <CListGroupItem>
                <strong>LinkedIn:</strong>{' '}
                {selectedRequest.linkedIn ? (
                  <a href={selectedRequest.linkedIn} target="_blank" rel="noopener noreferrer">
                    {selectedRequest.linkedIn}
                  </a>
                ) : (
                  'N/A'
                )}
              </CListGroupItem>
              <CListGroupItem>
                <strong>Email Verified:</strong>{' '}
                <CBadge color={selectedRequest.personalEmailVerified ? 'success' : 'danger'}>
                  {selectedRequest.personalEmailVerified ? 'Yes' : 'No'}
                </CBadge>
              </CListGroupItem>
              <CListGroupItem>
                <strong>Status:</strong>{' '}
                <CBadge color={statusColor(selectedRequest.status)}>
                  {selectedRequest.status}
                </CBadge>
              </CListGroupItem>
              <CListGroupItem>
                <strong>Submitted:</strong>{' '}
                {new Date(selectedRequest.createdAt).toLocaleString()}
              </CListGroupItem>
              {selectedRequest.reviewedAt && (
                <CListGroupItem>
                  <strong>Reviewed:</strong>{' '}
                  {new Date(selectedRequest.reviewedAt).toLocaleString()}
                </CListGroupItem>
              )}
              {selectedRequest.denialReason && (
                <CListGroupItem>
                  <strong>Denial Reason:</strong> {selectedRequest.denialReason}
                </CListGroupItem>
              )}
            </CListGroup>
          )}
        </CModalBody>
        <CModalFooter>
          {selectedRequest?.status === 'pending' && (
            <>
              <CButton
                color="success"
                onClick={() => {
                  setVisibleModal(false)
                  handleApprove(selectedRequest._id || selectedRequest.id)
                }}
              >
                Approve
              </CButton>
              <CButton
                color="danger"
                onClick={() => {
                  setVisibleModal(false)
                  openDenyModal(selectedRequest._id || selectedRequest.id)
                }}
              >
                Deny
              </CButton>
            </>
          )}
          <CButton color="secondary" onClick={() => setVisibleModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Deny Reason Modal */}
      <CModal visible={denyModal} onClose={() => setDenyModal(false)}>
        <CModalHeader>
          <CModalTitle>Deny Request</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="text-body-secondary">
            Optionally provide a reason for denial. This will be included in the notification email.
          </p>
          <CFormTextarea
            rows={3}
            placeholder="Reason for denial (optional)"
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDenyModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDeny} disabled={!!actionId}>
            {actionId ? <CSpinner size="sm" /> : 'Deny Request'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
