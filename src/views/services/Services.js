import React, { useEffect, useState, useMemo } from 'react'
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
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CNav,
  CNavItem,
  CNavLink,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilCloudDownload,
  cilInfo,
  cilCheckCircle,
  cilXCircle,
  cilBan,
  cilReload,
  cilBriefcase,
  cilPeople,
  cilLocationPin,
  cilDollar,
  cilStar,
  cilClock,
  cilFilter,
  cilTrash,
} from '@coreui/icons'
import {
  fetchAllServices,
  fetchPendingServices,
  approveService,
  rejectService,
  suspendService,
  unsuspendService,
  adminDeleteService,
} from 'src/api/services'
import * as XLSX from 'xlsx'

// ─── Status Helpers ────────────────────────────────────────
const statusColor = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    suspended: 'dark',
    archived: 'secondary',
    updated: 'info',
  }
  return map[status] || 'secondary'
}

const statusLabel = (status) => {
  const map = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
    archived: 'Archived',
    updated: 'Updated (Re-review)',
  }
  return map[status] || status
}

const categoryIcon = {
  consulting: '💼',
  tutoring: '📚',
  design: '🎨',
  tech: '💻',
  fitness: '💪',
  creative: '🎭',
  business: '📊',
  trade: '🔧',
  event: '🎉',
}

// ─── Stat Card ─────────────────────────────────────────────
const StatCard = ({ title, count, color, icon, active, onClick }) => (
  <CCol xs={6} sm={4} lg={2}>
    <CCard
      className={`border-top-${color} border-top-3 mb-3 text-center shadow-sm`}
      role="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: active ? 'scale(1.03)' : 'scale(1)',
        boxShadow: active ? `0 4px 20px rgba(0,0,0,0.15)` : undefined,
        background: active ? `var(--cui-${color}-bg, #f8f9fa)` : undefined,
      }}
    >
      <CCardBody className="py-3 px-2">
        <div className="fs-4 fw-bold" style={{ color: `var(--cui-${color})` }}>
          {count}
        </div>
        <div className="text-body-secondary small text-truncate">{title}</div>
      </CCardBody>
    </CCard>
  </CCol>
)

// ─── Main Component ────────────────────────────────────────
export default function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState(null)
  const [detailModal, setDetailModal] = useState(false)
  const [actionModal, setActionModal] = useState({ visible: false, type: '', service: null })
  const [actionReason, setActionReason] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [alert, setAlert] = useState(null)

  // ─── Data Loading ──────────────────────────────────────
  const loadServices = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (categoryFilter !== 'all') params.category = categoryFilter
      params.limit = 200

      const result = await fetchAllServices(params)
      const list = result?.data || result?.services || []
      setServices(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('Failed to load services:', e)
      showAlert('danger', 'Failed to load services. Check API connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [statusFilter, categoryFilter])

  // ─── Filtering ─────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return services
    const term = searchTerm.toLowerCase()
    return services.filter(
      (s) =>
        s.title?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term) ||
        s.provider?.firstName?.toLowerCase().includes(term) ||
        s.provider?.lastName?.toLowerCase().includes(term) ||
        s.provider?.email?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        s.city?.toLowerCase().includes(term) ||
        s.state?.toLowerCase().includes(term),
    )
  }, [services, searchTerm])

  // ─── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = services.length
    const pending = services.filter((s) => s.status === 'pending').length
    const approved = services.filter((s) => s.status === 'approved').length
    const rejected = services.filter((s) => s.status === 'rejected').length
    const suspended = services.filter((s) => s.status === 'suspended').length
    const updated = services.filter((s) => s.status === 'updated').length
    return { all, pending, approved, rejected, suspended, updated }
  }, [services])

  // ─── Alert Helper ──────────────────────────────────────
  const showAlert = (color, message) => {
    setAlert({ color, message })
    setTimeout(() => setAlert(null), 4000)
  }

  // ─── Actions ───────────────────────────────────────────
  const handleApprove = async (service) => {
    setActionLoading(service._id)
    try {
      await approveService(service._id, approvalNotes)
      showAlert('success', `"${service.title}" has been approved.`)
      setActionModal({ visible: false, type: '', service: null })
      setApprovalNotes('')
      loadServices()
    } catch (e) {
      console.error(e)
      showAlert('danger', 'Failed to approve service.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (service) => {
    if (!actionReason.trim()) {
      showAlert('warning', 'Please provide a reason for rejection.')
      return
    }
    setActionLoading(service._id)
    try {
      await rejectService(service._id, actionReason)
      showAlert('info', `"${service.title}" has been rejected.`)
      setActionModal({ visible: false, type: '', service: null })
      setActionReason('')
      loadServices()
    } catch (e) {
      console.error(e)
      showAlert('danger', 'Failed to reject service.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspend = async (service) => {
    if (!actionReason.trim()) {
      showAlert('warning', 'Please provide a reason for suspension.')
      return
    }
    setActionLoading(service._id)
    try {
      await suspendService(service._id, actionReason)
      showAlert('dark', `"${service.title}" has been suspended.`)
      setActionModal({ visible: false, type: '', service: null })
      setActionReason('')
      loadServices()
    } catch (e) {
      console.error(e)
      showAlert('danger', 'Failed to suspend service.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnsuspend = async (service) => {
    setActionLoading(service._id)
    try {
      await unsuspendService(service._id)
      showAlert('success', `"${service.title}" has been reactivated.`)
      loadServices()
    } catch (e) {
      console.error(e)
      showAlert('danger', 'Failed to reactivate service.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAdminDelete = async (service) => {
    setActionLoading(service._id)
    try {
      await adminDeleteService(service._id)
      showAlert('success', `"${service.title}" has been deleted.`)
      setActionModal({ visible: false, type: '', service: null })
      loadServices()
    } catch (e) {
      console.error(e)
      showAlert('danger', 'Failed to delete service.')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Export ────────────────────────────────────────────
  const exportToExcel = () => {
    const rows = filtered.map((s, i) => ({
      '#': i + 1,
      Title: s.title,
      Category: s.category,
      Provider: `${s.provider?.firstName || ''} ${s.provider?.lastName || ''}`.trim(),
      Email: s.provider?.email || '',
      City: s.city,
      State: s.state,
      'Hourly Rate': s.hourlyRate ? `$${s.hourlyRate}` : '—',
      'Base Price': s.basePrice ? `$${s.basePrice}` : '—',
      Status: s.status,
      Views: s.views || 0,
      Created: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Services')
    XLSX.writeFile(wb, `services_export_${Date.now()}.xlsx`)
  }

  // ─── Open Detail Modal ─────────────────────────────────
  const openDetail = (service) => {
    setSelectedService(service)
    setDetailModal(true)
  }

  // ─── Open Action Modal ─────────────────────────────────
  const openAction = (type, service) => {
    setActionReason('')
    setApprovalNotes('')
    setActionModal({ visible: true, type, service })
  }

  const providerName = (s) =>
    `${s.provider?.firstName || ''} ${s.provider?.lastName || ''}`.trim() || 'Unknown'

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <>
      {/* Alert Toast */}
      {alert && (
        <CAlert
          color={alert.color}
          dismissible
          className="position-fixed top-0 end-0 m-3 shadow-lg"
          style={{ zIndex: 9999, minWidth: 320, maxWidth: 480 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </CAlert>
      )}

      {/* ─── Stats Row ───────────────────────────────── */}
      <CRow className="mb-3">
        <StatCard title="All Services" count={stats.all} color="primary" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <StatCard title="Pending" count={stats.pending} color="warning" active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
        <StatCard title="Approved" count={stats.approved} color="success" active={statusFilter === 'approved'} onClick={() => setStatusFilter('approved')} />
        <StatCard title="Rejected" count={stats.rejected} color="danger" active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')} />
        <StatCard title="Suspended" count={stats.suspended} color="dark" active={statusFilter === 'suspended'} onClick={() => setStatusFilter('suspended')} />
        <StatCard title="Updated" count={stats.updated} color="info" active={statusFilter === 'updated'} onClick={() => setStatusFilter('updated')} />
        <CCol xs={6} sm={4} lg={2}>
          <CCard className="border-top-info border-top-3 mb-3 text-center shadow-sm">
            <CCardBody className="py-3 px-2">
              <div className="fs-4 fw-bold text-info">{filtered.length}</div>
              <div className="text-body-secondary small">Showing</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ─── Filters & Search ─────────────────────────── */}
      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol md={5}>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by title, provider, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={3}>
              <CFormSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="consulting">💼 Consulting</option>
                <option value="tutoring">📚 Tutoring</option>
                <option value="design">🎨 Design</option>
                <option value="tech">💻 Tech</option>
                <option value="fitness">💪 Fitness</option>
                <option value="creative">🎭 Creative</option>
                <option value="business">📊 Business</option>
                <option value="trade">🔧 Trade</option>
                <option value="event">🎉 Events</option>
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CButton color="secondary" variant="outline" className="w-100" onClick={loadServices}>
                <CIcon icon={cilReload} className="me-1" /> Refresh
              </CButton>
            </CCol>
            <CCol md={2}>
              <CButton color="success" variant="outline" className="w-100" onClick={exportToExcel}>
                <CIcon icon={cilCloudDownload} className="me-1" /> Export
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* ─── Services Table ───────────────────────────── */}
      <CCard className="shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>
            <CIcon icon={cilBriefcase} className="me-2" />
            Services Management
          </strong>
          <CBadge color="primary" shape="rounded-pill">
            {filtered.length} service{filtered.length !== 1 ? 's' : ''}
          </CBadge>
        </CCardHeader>
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-2 text-body-secondary">Loading services...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5">
              <CIcon icon={cilBriefcase} size="3xl" className="text-body-secondary mb-2" />
              <p className="text-body-secondary">No services found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <CTable hover striped align="middle" className="mb-0">
                <CTableHead className="text-body-secondary">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: 40 }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Service</CTableHeaderCell>
                    <CTableHeaderCell>Provider</CTableHeaderCell>
                    <CTableHeaderCell>Category</CTableHeaderCell>
                    <CTableHeaderCell>Location</CTableHeaderCell>
                    <CTableHeaderCell>Pricing</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Views</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell className="text-center" style={{ minWidth: 200 }}>
                      Actions
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filtered.map((service, idx) => (
                    <CTableRow key={service._id}>
                      <CTableDataCell className="text-center text-body-secondary">
                        {idx + 1}
                      </CTableDataCell>

                      {/* Service Title + Description preview */}
                      <CTableDataCell>
                        <div
                          className="fw-semibold text-truncate"
                          style={{ maxWidth: 220, cursor: 'pointer' }}
                          role="button"
                          onClick={() => openDetail(service)}
                          title={service.title}
                        >
                          {service.title}
                        </div>
                        <div
                          className="small text-body-secondary text-truncate"
                          style={{ maxWidth: 220 }}
                        >
                          {service.description?.slice(0, 60)}
                          {service.description?.length > 60 ? '...' : ''}
                        </div>
                      </CTableDataCell>

                      {/* Provider */}
                      <CTableDataCell>
                        <div className="fw-semibold small">{providerName(service)}</div>
                        <div className="small text-body-secondary">
                          {service.provider?.email || '—'}
                        </div>
                      </CTableDataCell>

                      {/* Category */}
                      <CTableDataCell>
                        <span className="me-1">{categoryIcon[service.category] || '📋'}</span>
                        <span className="small text-capitalize">{service.category}</span>
                      </CTableDataCell>

                      {/* Location */}
                      <CTableDataCell>
                        <span className="small">
                          {service.city}, {service.state}
                        </span>
                      </CTableDataCell>

                      {/* Pricing */}
                      <CTableDataCell>
                        {service.hourlyRate && (
                          <div className="small fw-semibold">${service.hourlyRate}/hr</div>
                        )}
                        {service.basePrice && (
                          <div className="small text-body-secondary">${service.basePrice} base</div>
                        )}
                        {!service.hourlyRate && !service.basePrice && (
                          <span className="small text-body-secondary">—</span>
                        )}
                      </CTableDataCell>

                      {/* Status */}
                      <CTableDataCell className="text-center">
                        <CBadge color={statusColor(service.status)} shape="rounded-pill">
                          {statusLabel(service.status)}
                        </CBadge>
                      </CTableDataCell>

                      {/* Views */}
                      <CTableDataCell className="text-center">
                        <span className="small">{service.views || 0}</span>
                      </CTableDataCell>

                      {/* Date */}
                      <CTableDataCell>
                        <span className="small">
                          {service.createdAt
                            ? new Date(service.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </CTableDataCell>

                      {/* Actions */}
                      <CTableDataCell className="text-center">
                        <CButtonGroup size="sm">
                          {/* View Details */}
                          <CButton
                            color="info"
                            variant="ghost"
                            title="View details"
                            onClick={() => openDetail(service)}
                          >
                            <CIcon icon={cilInfo} />
                          </CButton>

                          {/* Approve (for pending or updated) */}
                          {(service.status === 'pending' || service.status === 'updated') && (
                            <CButton
                              color="success"
                              variant="ghost"
                              title="Approve"
                              disabled={actionLoading === service._id}
                              onClick={() => openAction('approve', service)}
                            >
                              {actionLoading === service._id ? (
                                <CSpinner size="sm" />
                              ) : (
                                <CIcon icon={cilCheckCircle} />
                              )}
                            </CButton>
                          )}

                          {/* Reject (for pending or updated) */}
                          {(service.status === 'pending' || service.status === 'updated') && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              title="Reject"
                              disabled={actionLoading === service._id}
                              onClick={() => openAction('reject', service)}
                            >
                              <CIcon icon={cilXCircle} />
                            </CButton>
                          )}

                          {/* Suspend (only for approved) */}
                          {service.status === 'approved' && (
                            <CButton
                              color="dark"
                              variant="ghost"
                              title="Suspend"
                              disabled={actionLoading === service._id}
                              onClick={() => openAction('suspend', service)}
                            >
                              <CIcon icon={cilBan} />
                            </CButton>
                          )}

                          {/* Unsuspend (only for suspended) */}
                          {service.status === 'suspended' && (
                            <CButton
                              color="success"
                              variant="ghost"
                              title="Reactivate"
                              disabled={actionLoading === service._id}
                              onClick={() => handleUnsuspend(service)}
                            >
                              {actionLoading === service._id ? (
                                <CSpinner size="sm" />
                              ) : (
                                <CIcon icon={cilReload} />
                              )}
                            </CButton>
                          )}

                          {/* Delete (any status) */}
                          <CButton
                            color="danger"
                            variant="ghost"
                            title="Delete"
                            disabled={actionLoading === service._id}
                            onClick={() => openAction('delete', service)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CButtonGroup>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* ═══ DETAIL MODAL ═════════════════════════════════ */}
      <CModal size="lg" visible={detailModal} onClose={() => setDetailModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilBriefcase} className="me-2" />
            Service Details
          </CModalTitle>
        </CModalHeader>
        {selectedService && (
          <CModalBody>
            <CRow className="g-3">
              {/* Left Column */}
              <CCol md={7}>
                <h5 className="fw-bold mb-1">{selectedService.title}</h5>
                <div className="mb-3">
                  <CBadge color={statusColor(selectedService.status)} className="me-2">
                    {statusLabel(selectedService.status)}
                  </CBadge>
                  <span className="text-body-secondary small">
                    {categoryIcon[selectedService.category]} {selectedService.category}
                  </span>
                </div>

                <h6 className="text-body-secondary mt-3 mb-1">Description</h6>
                <p className="mb-3" style={{ lineHeight: 1.6 }}>
                  {selectedService.description}
                </p>

                {selectedService.pricing && (
                  <>
                    <h6 className="text-body-secondary mb-1">Pricing</h6>
                    <p className="mb-3">{selectedService.pricing}</p>
                  </>
                )}

                {/* Contact Information */}
                <h6 className="text-body-secondary mt-3 mb-2">Contact Information</h6>
                <div className="mb-3">
                  {selectedService.contactEmail && (
                    <div className="small mb-1">
                      <strong>Email:</strong>{' '}
                      <a href={`mailto:${selectedService.contactEmail}`}>{selectedService.contactEmail}</a>
                    </div>
                  )}
                  {selectedService.contactPhone && (
                    <div className="small mb-1">
                      <strong>Phone:</strong> {selectedService.contactPhone}
                    </div>
                  )}
                </div>

                {/* Online Presence */}
                {(selectedService.website || selectedService.instagram || selectedService.facebook || selectedService.twitter || selectedService.linkedin) && (
                  <>
                    <h6 className="text-body-secondary mb-2">Online Presence</h6>
                    <div className="mb-3">
                      {selectedService.website && (
                        <div className="small mb-1">🌐 <a href={selectedService.website.startsWith('http') ? selectedService.website : `https://${selectedService.website}`} target="_blank" rel="noreferrer">{selectedService.website}</a></div>
                      )}
                      {selectedService.instagram && (
                        <div className="small mb-1">📸 {selectedService.instagram}</div>
                      )}
                      {selectedService.facebook && (
                        <div className="small mb-1">📘 {selectedService.facebook}</div>
                      )}
                      {selectedService.twitter && (
                        <div className="small mb-1">🐦 {selectedService.twitter}</div>
                      )}
                      {selectedService.linkedin && (
                        <div className="small mb-1">💼 {selectedService.linkedin}</div>
                      )}
                    </div>
                  </>
                )}

                {selectedService.skills?.length > 0 && (
                  <>
                    <h6 className="text-body-secondary mb-2">Skills</h6>
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {selectedService.skills.map((skill, i) => (
                        <CBadge key={i} color="primary" shape="rounded-pill" className="px-3 py-1">
                          {skill}
                        </CBadge>
                      ))}
                    </div>
                  </>
                )}

                {selectedService.experience && (
                  <>
                    <h6 className="text-body-secondary mb-1">Experience</h6>
                    <p className="mb-3">{selectedService.experience}</p>
                  </>
                )}

                {/* Rejection / Suspension Reason */}
                {selectedService.status === 'rejected' && selectedService.rejectionReason && (
                  <CAlert color="danger" className="mt-2">
                    <strong>Rejection Reason:</strong> {selectedService.rejectionReason}
                  </CAlert>
                )}
                {selectedService.status === 'suspended' && selectedService.suspendedReason && (
                  <CAlert color="dark" className="mt-2">
                    <strong>Suspension Reason:</strong> {selectedService.suspendedReason}
                  </CAlert>
                )}
              </CCol>

              {/* Right Column — Meta Info */}
              <CCol md={5}>
                <CCard className="bg-body-secondary border-0">
                  <CCardBody>
                    <h6 className="fw-semibold mb-3">Service Info</h6>

                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilPeople} className="text-body-secondary me-2" />
                      <span className="small fw-semibold">{providerName(selectedService)}</span>
                    </div>
                    {selectedService.provider?.email && (
                      <div className="small text-body-secondary mb-3 ps-4">
                        {selectedService.provider.email}
                      </div>
                    )}

                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilLocationPin} className="text-body-secondary me-2" />
                      <span className="small">
                        {selectedService.serviceLocation || [selectedService.city, selectedService.state].filter(Boolean).join(', ') || 'Not set'}
                      </span>
                    </div>

                    {selectedService.fullAddress && (
                      <div className="small text-body-secondary mb-2 ps-4">
                        {selectedService.fullAddress}
                      </div>
                    )}

                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilDollar} className="text-body-secondary me-2" />
                      <span className="small">
                        {selectedService.pricing
                          ? selectedService.pricing
                          : selectedService.hourlyRate
                            ? `$${selectedService.hourlyRate}/hr`
                            : selectedService.basePrice
                              ? `$${selectedService.basePrice}`
                              : 'Not set'}
                      </span>
                    </div>

                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilStar} className="text-body-secondary me-2" />
                      <span className="small">{selectedService.views || 0} views</span>
                    </div>

                    <div className="d-flex align-items-center mb-0">
                      <CIcon icon={cilClock} className="text-body-secondary me-2" />
                      <span className="small">
                        Created{' '}
                        {selectedService.createdAt
                          ? new Date(selectedService.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </CCardBody>
                </CCard>

                {/* Quick Actions in Detail Modal */}
                <div className="d-grid gap-2 mt-3">
                  {(selectedService.status === 'pending' || selectedService.status === 'updated') && (
                    <>
                      <CButton
                        color="success"
                        onClick={() => {
                          setDetailModal(false)
                          openAction('approve', selectedService)
                        }}
                      >
                        <CIcon icon={cilCheckCircle} className="me-2" />
                        Approve Service
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        onClick={() => {
                          setDetailModal(false)
                          openAction('reject', selectedService)
                        }}
                      >
                        <CIcon icon={cilXCircle} className="me-2" />
                        Reject Service
                      </CButton>
                    </>
                  )}
                  {selectedService.status === 'approved' && (
                    <CButton
                      color="dark"
                      variant="outline"
                      onClick={() => {
                        setDetailModal(false)
                        openAction('suspend', selectedService)
                      }}
                    >
                      <CIcon icon={cilBan} className="me-2" />
                      Suspend Service
                    </CButton>
                  )}
                  {selectedService.status === 'suspended' && (
                    <CButton
                      color="success"
                      onClick={() => {
                        setDetailModal(false)
                        handleUnsuspend(selectedService)
                      }}
                    >
                      <CIcon icon={cilReload} className="me-2" />
                      Reactivate Service
                    </CButton>
                  )}
                </div>
              </CCol>
            </CRow>
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setDetailModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═══ ACTION MODAL (Approve / Reject / Suspend) ═══ */}
      <CModal
        visible={actionModal.visible}
        onClose={() => setActionModal({ visible: false, type: '', service: null })}
      >
        <CModalHeader>
          <CModalTitle>
            {actionModal.type === 'approve' && '✅ Approve Service'}
            {actionModal.type === 'reject' && '❌ Reject Service'}
            {actionModal.type === 'suspend' && '🚫 Suspend Service'}
            {actionModal.type === 'delete' && '🗑️ Delete Service'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {actionModal.service && (
            <>
              <p className="mb-2">
                <strong>Service:</strong> {actionModal.service.title}
              </p>
              <p className="mb-3 text-body-secondary small">
                <strong>Provider:</strong> {providerName(actionModal.service)} (
                {actionModal.service.provider?.email})
              </p>

              {actionModal.type === 'approve' && (
                <CFormTextarea
                  label="Approval Notes (optional)"
                  placeholder="Add any notes for the provider..."
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              )}

              {actionModal.type === 'reject' && (
                <CFormTextarea
                  label="Rejection Reason *"
                  placeholder="Explain why this service is being rejected..."
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className={!actionReason.trim() ? 'is-invalid' : ''}
                />
              )}

              {actionModal.type === 'suspend' && (
                <CFormTextarea
                  label="Suspension Reason *"
                  placeholder="Explain why this service is being suspended..."
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className={!actionReason.trim() ? 'is-invalid' : ''}
                />
              )}

              {actionModal.type === 'delete' && (
                <CAlert color="danger">
                  <strong>Warning:</strong> This will permanently delete this service. This action cannot be undone.
                </CAlert>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => setActionModal({ visible: false, type: '', service: null })}
          >
            Cancel
          </CButton>
          {actionModal.type === 'approve' && (
            <CButton
              color="success"
              disabled={actionLoading === actionModal.service?._id}
              onClick={() => handleApprove(actionModal.service)}
            >
              {actionLoading === actionModal.service?._id ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={cilCheckCircle} className="me-1" />
              )}
              Approve
            </CButton>
          )}
          {actionModal.type === 'reject' && (
            <CButton
              color="danger"
              disabled={actionLoading === actionModal.service?._id || !actionReason.trim()}
              onClick={() => handleReject(actionModal.service)}
            >
              {actionLoading === actionModal.service?._id ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={cilXCircle} className="me-1" />
              )}
              Reject
            </CButton>
          )}
          {actionModal.type === 'suspend' && (
            <CButton
              color="dark"
              disabled={actionLoading === actionModal.service?._id || !actionReason.trim()}
              onClick={() => handleSuspend(actionModal.service)}
            >
              {actionLoading === actionModal.service?._id ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={cilBan} className="me-1" />
              )}
              Suspend
            </CButton>
          )}
          {actionModal.type === 'delete' && (
            <CButton
              color="danger"
              disabled={actionLoading === actionModal.service?._id}
              onClick={() => handleAdminDelete(actionModal.service)}
            >
              {actionLoading === actionModal.service?._id ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={cilTrash} className="me-1" />
              )}
              Delete Permanently
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </>
  )
}
