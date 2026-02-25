import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableBody,
  CTableHeaderCell,
  CTableDataCell,
  CTableRow,
  CButton,
  CButtonGroup,
  CBadge,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilCloudDownload, cilXCircle, cilCheckAlt } from '@coreui/icons'
import api from 'src/api/client'
import * as XLSX from 'xlsx'
import html2pdf from 'html2pdf.js'

export default function Users() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all, verified, non-verified
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, filter, searchTerm])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/accounts')
      const raw = response.data || []
      // Normalize user objects to a consistent shape used by this component
      const normalized = (Array.isArray(raw) ? raw : raw.accounts || []).map((u) => ({
        id: u._id || u.id || u._meta?.id || '',
        firstName: u.firstName || u.firstname || u.name?.split?.(' ')?.[0] || '',
        lastName: u.lastName || u.lastname || u.name?.split?.(' ')?.slice(1).join(' ') || '',
        email: u.email || u.emailAddress || '',
        phone: u.phone || u.phoneNumber || u.phone_number || '',
        type: u.type || u.accountType || '',
        gender: u.gender || u.sex || '',
        verified: u.verified === true || u.verified === 'true' || u.isVerified === true || u.isVerified === 'true',
        created: u.createdAt || u.created || u.created_at || Date.now(),
        role: u.role || 'User',
        bio: u.bio || '',
        industry: u.industry || '',
        currentRole: u.currentRole || u.current_role || '',
        origin: u.origin || '',
      }))

      setUsers(normalized)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err?.response?.data?.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    // Filter by verification status
    if (filter === 'verified') {
      filtered = filtered.filter((user) => user.verified === true)
    } else if (filter === 'non-verified') {
      filtered = filtered.filter((user) => user.verified === false)
    }

    // Filter by search term (email, name)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.email?.toLowerCase().includes(term) ||
          user.firstName?.toLowerCase().includes(term) ||
          user.lastName?.toLowerCase().includes(term),
      )
    }

    setFilteredUsers(filtered)
  }

  const exportToExcel = () => {
    if (filteredUsers.length === 0) {
      alert('No users to export')
      return
    }

    const data = filteredUsers.map((user) => ({
      'First Name': user.firstName || '',
      'Last Name': user.lastName || '',
      Email: user.email || '',
      Phone: user.phone || '',
      Type: user.type || '',
      Gender: user.gender || '',
      Verified: user.verified ? 'Yes' : 'No',
      Created: new Date(user.created).toLocaleDateString() || '',
      Role: user.role || 'User',
      Bio: user.bio || '',
      Industry: user.industry || '',
      'Current Role': user.currentRole || '',
      Origin: user.origin || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users')

    // Auto-fit columns
    const colWidths = [
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ]
    worksheet['!cols'] = colWidths

    XLSX.writeFile(workbook, `users_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    if (filteredUsers.length === 0) {
      alert('No users to export')
      return
    }

    // html2pdf cannot render hidden elements reliably, so clone the table, make it visible,
    // append to body, render to PDF, then remove the clone.
    const src = document.getElementById('users-table-pdf')
    if (!src) {
      alert('PDF element not found')
      return
    }
    const clone = src.cloneNode(true)
    clone.style.display = 'block'
    clone.style.padding = '20px'
    clone.id = 'users-table-pdf-clone'
    document.body.appendChild(clone)

    const opt = {
      margin: 10,
      filename: `users_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
    }

    html2pdf()
      .set(opt)
      .from(clone)
      .save()
      .finally(() => {
        // cleanup
        const c = document.getElementById('users-table-pdf-clone')
        if (c && c.parentNode) c.parentNode.removeChild(c)
      })
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/accounts/${userId}`)
        setUsers(users.filter((u) => u.id !== userId))
        alert('User deleted successfully')
      } catch (err) {
        alert('Failed to delete user: ' + err?.response?.data?.message)
      }
    }
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol xs={12} md={8}>
          <CInputGroup>
            <CInputGroupText>
              <CIcon icon={cilSearch} />
            </CInputGroupText>
            <CFormInput
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CInputGroup>
        </CCol>
        <CCol xs={12} md={4} className="text-end">
          <CButtonGroup role="group">
            <CButton
              color={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All ({users.length})
            </CButton>
            <CButton
              color={filter === 'verified' ? 'success' : 'secondary'}
              onClick={() => setFilter('verified')}
              size="sm"
            >
              Verified ({users.filter((u) => u.verified).length})
            </CButton>
            <CButton
              color={filter === 'non-verified' ? 'warning' : 'secondary'}
              onClick={() => setFilter('non-verified')}
              size="sm"
            >
              Non-Verified ({users.filter((u) => !u.verified).length})
            </CButton>
          </CButtonGroup>
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CButton
            color="success"
            size="sm"
            onClick={exportToExcel}
            className="me-2"
            disabled={filteredUsers.length === 0}
          >
            <CIcon icon={cilCloudDownload} className="me-2" />
            Export to Excel
          </CButton>
          <CButton
            color="danger"
            size="sm"
            onClick={exportToPDF}
            disabled={filteredUsers.length === 0}
          >
            <CIcon icon={cilCloudDownload} className="me-2" />
            Export to PDF
          </CButton>
          <CButton color="info" size="sm" onClick={fetchUsers} className="float-end">
            Refresh
          </CButton>
        </CCol>
      </CRow>

      {error && <CAlert color="danger">{error}</CAlert>}

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Users Management</strong>
          <span className="text-muted">
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center">
              <CSpinner color="primary" />
              <p className="mt-2">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <CAlert color="info">No users found</CAlert>
          ) : (
            <>
              {/* Hidden table for PDF export */}
              <div id="users-table-pdf" style={{ display: 'none' }}>
                <h2>Users Report - {new Date().toLocaleDateString()}</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Name</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Phone</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {user.firstName} {user.lastName}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.phone || '-'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.type || '-'}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {user.verified ? 'Verified' : 'Pending'}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          {new Date(user.created).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visible table */}
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '200px' }}>Name</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '220px' }}>Email</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '120px' }}>Phone</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '100px' }}>Type</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '100px' }}>Gender</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '110px' }} className="text-center">
                      Status
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '120px' }}>Created</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '60px' }} className="text-center">
                      Actions
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredUsers.map((user) => (
                    <CTableRow key={user.id}>
                      <CTableDataCell>
                        <strong>
                          {user.firstName} {user.lastName}
                        </strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        <small>{user.email}</small>
                      </CTableDataCell>
                      <CTableDataCell>
                        <small>{user.phone || '-'}</small>
                      </CTableDataCell>
                      <CTableDataCell>
                        <small>{user.type || '-'}</small>
                      </CTableDataCell>
                      <CTableDataCell>
                        <small>{user.gender || '-'}</small>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        {user.verified ? (
                          <CBadge color="success">
                            <CIcon icon={cilCheckAlt} className="me-1" />
                            Verified
                          </CBadge>
                        ) : (
                          <CBadge color="warning">
                            <CIcon icon={cilXCircle} className="me-1" />
                            Pending
                          </CBadge>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        <small>{new Date(user.created).toLocaleDateString()}</small>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton
                          color="danger"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete user"
                        >
                          Delete
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}
