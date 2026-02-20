import React, { useEffect, useState } from 'react'
import {
  CBadge,
  CButton,
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
} from '@coreui/react'
import { fetchReports, updateReportStatus } from 'src/api/reports'

const statusColor = (status) => {
  if (status === 'NEW') return 'danger'
  if (status === 'IN_REVIEW') return 'warning'
  if (status === 'RESOLVED') return 'success'
  return 'secondary'
}

export default function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

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

  const changeStatus = async (id, status) => {
    setUpdatingId(id)
    try {
      await updateReportStatus(id, status)
      await load()
    } catch (e) {
      console.error(e)
      alert('Failed to update report.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Reports</strong>
        <CButton size="sm" color="secondary" onClick={load}>
          Refresh
        </CButton>
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <div className="d-flex align-items-center gap-2">
            <CSpinner size="sm" /> Loading reports...
          </div>
        ) : (
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Date</CTableHeaderCell>
                <CTableHeaderCell>Reported User</CTableHeaderCell>
                <CTableHeaderCell>Reason</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {reports.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={5}>No reports found.</CTableDataCell>
                </CTableRow>
              ) : (
                reports.map((r) => (
                  <CTableRow key={r._id}>
                    <CTableDataCell>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                    </CTableDataCell>

                    <CTableDataCell>
{r.reportedUser
  ? `${r.reportedUser.firstName || ''} ${r.reportedUser.lastName || ''}`.trim() +
    ` (${r.reportedUser.email || ''})`
  : '-'}
                    </CTableDataCell>

                    <CTableDataCell>{r.reason || r.type || '-'}</CTableDataCell>

                    <CTableDataCell>
                      <CBadge color={statusColor(r.status)}>{r.status || 'NEW'}</CBadge>
                    </CTableDataCell>

                    <CTableDataCell className="text-end">
                      <div className="d-inline-flex gap-2">
                        <CButton size="sm" color="warning" variant="outline"
                          disabled={updatingId === r._id}
                          onClick={() => changeStatus(r._id, 'IN_REVIEW')}
                        >
                          {updatingId === r._id ? '...' : 'In Review'}
                        </CButton>

                        <CButton size="sm" color="success" variant="outline"
                          disabled={updatingId === r._id}
                          onClick={() => changeStatus(r._id, 'RESOLVED')}
                        >
                          {updatingId === r._id ? '...' : 'Resolve'}
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}
