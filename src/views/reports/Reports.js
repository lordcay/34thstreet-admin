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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilCloudDownload, cilInfo } from '@coreui/icons'
import { fetchReports, updateReportStatus } from 'src/api/reports'
import * as XLSX from 'xlsx'
import html2pdf from 'html2pdf.js'

const statusColor = (status) => {
  if (status === 'NEW') return 'danger'
  if (status === 'IN_REVIEW') return 'warning'
  if (status === 'RESOLVED') return 'success'
  return 'secondary'
}

export default function Reports() {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [visibleModal, setVisibleModal] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchReports()
      setReports(Array.isArray(data) ? data : data.reports || [])
    } catch (e) {
      console.error(e)
      alert('Failed to load reports. Check API URL or endpoint.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [reports, statusFilter, searchTerm])

  const applyFilters = () => {
    let filtered = [...reports]

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => (r.status || 'NEW') === statusFilter)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.reportedUser?.email?.toLowerCase().includes(term) ||
          r.reportedUser?.firstName?.toLowerCase().includes(term) ||
          r.reportedUser?.lastName?.toLowerCase().includes(term) ||
          r.reason?.toLowerCase().includes(term) ||
          r.reporter?.email?.toLowerCase().includes(term),
      )
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    setFilteredReports(filtered)
  }

  const changeStatus = async (id, status) => {
    setUpdatingId(id)
    try {
      await updateReportStatus(id, status)
      await load()
      if (selectedReport && selectedReport._id === id) {
        setSelectedReport(null)
      }
    } catch (e) {
      console.error(e)
      alert('Failed to update report.')
    } finally {
      setUpdatingId(null)
    }
  }

  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      alert('No reports to export')
      return
    }

    const data = filteredReports.map((r) => ({
      'Report ID': r._id || '',
      'Reported User': r.reportedUser
        ? `${r.reportedUser.firstName || ''} ${r.reportedUser.lastName || ''}`
        : '-',
      'Reporter': r.reporter
        ? `${r.reporter.firstName || ''} ${r.reporter.lastName || ''}`
        : '-',
      'Reported Email': r.reportedUser?.email || '-',
      'Reporter Email': r.reporter?.email || '-',
      Reason: r.reason || r.type || '-',
      Status: r.status || 'NEW',
      'Created Date': new Date(r.createdAt).toLocaleString() || '',
      'Resolved Date': r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports')

    const colWidths = [
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
    ]
    worksheet['!cols'] = colWidths

    XLSX.writeFile(workbook, `reports_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    if (filteredReports.length === 0) {
      alert('No reports to export')
      return
    }

    const element = document.getElementById('reports-table-pdf')
    const opt = {
      margin: 10,
      filename: `reports_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
    }
    html2pdf().set(opt).from(element).save()
  }

  // Statistics
  const stats = {
    total: reports.length,
    new: reports.filter((r) => (r.status || 'NEW') === 'NEW').length,
    inReview: reports.filter((r) => r.status === 'IN_REVIEW').length,
    resolved: reports.filter((r) => r.status === 'RESOLVED').length,
  }

  return (
    <>
      {/* Statistics Cards */}
      <CRow className="mb-4">
        <CCol xs={6} md={3} className="mb-2">
          <CCard className="text-white bg-danger">
            <CCardBody className="pb-0 d-flex justify-content-between align-items-baseline">
              <div>
                <div className="fs-6 fw-bold">{stats.new}</div>
                <div className="text-white text-opacity-75 small">New Reports</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3} className="mb-2">
          <CCard className="text-white bg-warning">
            <CCardBody className="pb-0 d-flex justify-content-between align-items-baseline">
              <div>
                <div className="fs-6 fw-bold">{stats.inReview}</div>
                <div className="text-white text-opacity-75 small">In Review</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3} className="mb-2">
          <CCard className="text-white bg-success">
            <CCardBody className="pb-0 d-flex justify-content-between align-items-baseline">
              <div>
                <div className="fs-6 fw-bold">{stats.resolved}</div>
                <div className="text-white text-opacity-75 small">Resolved</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3} className="mb-2">
          <CCard className="text-white bg-info">
            <CCardBody className="pb-0 d-flex justify-content-between align-items-baseline">
              <div>
                <div className="fs-6 fw-bold">{stats.total}</div>
                <div className="text-white text-opacity-75 small">Total Reports</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Search and Filter */}
      <CRow className="mb-3">
        <CCol xs={12} md={8}>
          <CInputGroup>
            <CInputGroupText>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder="Search by user email, name, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CInputGroup>
        </CCol>
        <CCol xs={12} md={4} className="text-end">
          <CButtonGroup role="group">
            <CButton
              color={statusFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              All
            </CButton>
            <CButton
              color={statusFilter === 'NEW' ? 'danger' : 'secondary'}
              onClick={() => setStatusFilter('NEW')}
              size="sm"
            >
              New
            </CButton>
            <CButton
              color={statusFilter === 'IN_REVIEW' ? 'warning' : 'secondary'}
              onClick={() => setStatusFilter('IN_REVIEW')}
              size="sm"
            >
              In Review
            </CButton>
            <CButton
              color={statusFilter === 'RESOLVED' ? 'success' : 'secondary'}
              onClick={() => setStatusFilter('RESOLVED')}
              size="sm"
            >
              Resolved
            </CButton>
          </CButtonGroup>
        </CCol>
      </CRow>

      {/* Export Buttons */}
      <CRow className="mb-3">
        <CCol xs={12}>
          <CButton
            color="success"
            size="sm"
            onClick={exportToExcel}
            className="me-2"
            disabled={filteredReports.length === 0}
          >
            <CIcon icon={cilCloudDownload} className="me-2" />
            Export to Excel
          </CButton>
          <CButton
            color="danger"
            size="sm"
            onClick={exportToPDF}
            className="me-2"
            disabled={filteredReports.length === 0}
          >
            <CIcon icon={cilCloudDownload} className="me-2" />
            Export to PDF
          </CButton>
          <CButton color="info" size="sm" onClick={load} className="float-end">
            Refresh
          </CButton>
        </CCol>
      </CRow>

      {/* Reports Table */}
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Reports Management</strong>
          <span className="text-muted">
            Showing {filteredReports.length} of {reports.length} reports
          </span>
        </CCardHeader>

        <CCardBody>
          {/* Hidden PDF Table */}
          <div id="reports-table-pdf" style={{ display: 'none' }}>
            <h2>Reports - {new Date().toLocaleDateString()}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reported User</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reporter</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reason</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r._id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {r.reportedUser
                        ? `${r.reportedUser.firstName || ''} ${r.reportedUser.lastName || ''}`
                        : '-'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {r.reporter
                        ? `${r.reporter.firstName || ''} ${r.reporter.lastName || ''}`
                        : '-'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {r.reason || r.type || '-'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.status || 'NEW'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading ? (
            <div className="text-center">
              <CSpinner color="primary" />
              <p className="mt-2">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <CAlert color="info">No reports found.</CAlert>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: '150px' }}>Created</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '180px' }}>Reported User</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '180px' }}>Reporter</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '220px' }}>Reason</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '110px' }} className="text-center">
                    Status
                  </CTableHeaderCell>
                  <CTableHeaderCell style={{ width: '200px' }} className="text-end">
                    Actions
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredReports.map((r) => (
                  <CTableRow key={r._id}>
                    <CTableDataCell>
                      <small>{new Date(r.createdAt).toLocaleString()}</small>
                    </CTableDataCell>

                    <CTableDataCell>
                      <div>
                        <strong>
                          {r.reportedUser
                            ? `${r.reportedUser.firstName || ''} ${r.reportedUser.lastName || ''}`
                            : '-'}
                        </strong>
                        <br />
                        <small className="text-muted">{r.reportedUser?.email || '-'}</small>
                      </div>
                    </CTableDataCell>

                    <CTableDataCell>
                      <div>
                        <small>
                          {r.reporter
                            ? `${r.reporter.firstName || ''} ${r.reporter.lastName || ''}`
                            : 'Anonymous'}
                        </small>
                        <br />
                        <small className="text-muted">{r.reporter?.email || '-'}</small>
                      </div>
                    </CTableDataCell>

                    <CTableDataCell>
                      <small>{r.reason || r.type || '-'}</small>
                    </CTableDataCell>

                    <CTableDataCell className="text-center">
                      <CBadge color={statusColor(r.status)}>{r.status || 'NEW'}</CBadge>
                    </CTableDataCell>

                    <CTableDataCell className="text-end">
                      <div className="d-inline-flex gap-2">
                        <CButton
                          size="sm"
                          color="info"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(r)
                            setVisibleModal(true)
                          }}
                          title="View details"
                        >
                          <CIcon icon={cilInfo} />
                        </CButton>

                        <CButton
                          size="sm"
                          color="warning"
                          variant="outline"
                          disabled={updatingId === r._id}
                          onClick={() => changeStatus(r._id, 'IN_REVIEW')}
                        >
                          {updatingId === r._id ? '...' : 'Review'}
                        </CButton>

                        <CButton
                          size="sm"
                          color="success"
                          variant="outline"
                          disabled={updatingId === r._id}
                          onClick={() => changeStatus(r._id, 'RESOLVED')}
                        >
                          {updatingId === r._id ? '...' : 'Resolve'}
                        </CButton>
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
      <CModal
        backdrop="static"
        visible={visibleModal}
        onClose={() => setVisibleModal(false)}
        aria-labelledby="ReportDetailModal"
        size="lg"
      >
        <CModalHeader onClose={() => setVisibleModal(false)}>
          <CModalTitle id="ReportDetailModal">Report Details</CModalTitle>
        </CModalHeader>
        {selectedReport && (
          <>
            <CModalBody>
              <CListGroup flush>
                <CListGroupItem>
                  <strong>Report ID:</strong>
                  <br />
                  <small className="text-muted">{selectedReport._id}</small>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Status:</strong>
                  <br />
                  <CBadge color={statusColor(selectedReport.status)}>
                    {selectedReport.status || 'NEW'}
                  </CBadge>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Reported User:</strong>
                  <br />
                  <div>
                    {selectedReport.reportedUser
                      ? `${selectedReport.reportedUser.firstName || ''} ${selectedReport.reportedUser.lastName || ''}`
                      : '-'}
                  </div>
                  <small className="text-muted">{selectedReport.reportedUser?.email || '-'}</small>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Reporter:</strong>
                  <br />
                  <div>
                    {selectedReport.reporter
                      ? `${selectedReport.reporter.firstName || ''} ${selectedReport.reporter.lastName || ''}`
                      : 'Anonymous'}
                  </div>
                  <small className="text-muted">{selectedReport.reporter?.email || '-'}</small>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Reason:</strong>
                  <br />
                  <p>{selectedReport.reason || selectedReport.type || '-'}</p>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Created:</strong>
                  <br />
                  <small>{new Date(selectedReport.createdAt).toLocaleString()}</small>
                </CListGroupItem>
                {selectedReport.resolvedAt && (
                  <CListGroupItem>
                    <strong>Resolved:</strong>
                    <br />
                    <small>{new Date(selectedReport.resolvedAt).toLocaleString()}</small>
                  </CListGroupItem>
                )}
              </CListGroup>
            </CModalBody>
            <CModalFooter>
              <CButton
                color="warning"
                onClick={() => {
                  changeStatus(selectedReport._id, 'IN_REVIEW')
                  setVisibleModal(false)
                }}
                disabled={updatingId === selectedReport._id}
              >
                {updatingId === selectedReport._id ? 'Updating...' : 'Mark as In Review'}
              </CButton>
              <CButton
                color="success"
                onClick={() => {
                  changeStatus(selectedReport._id, 'RESOLVED')
                  setVisibleModal(false)
                }}
                disabled={updatingId === selectedReport._id}
              >
                {updatingId === selectedReport._id ? 'Updating...' : 'Mark as Resolved'}
              </CButton>
              <CButton color="secondary" onClick={() => setVisibleModal(false)}>
                Close
              </CButton>
            </CModalFooter>
          </>
        )}
      </CModal>
    </>
  )
}
