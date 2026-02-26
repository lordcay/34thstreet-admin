// import { Navigate } from 'react-router-dom'

// export default function ProtectedRoute({ children }) {
//   const token = localStorage.getItem('adminToken')
//   if (!token) return <Navigate to="/login" replace />
//   return children
// }


import React from 'react'
import { Navigate } from 'react-router-dom'
import { isCurrentUserAdmin } from 'src/utils/auth'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem('adminToken')
  if (!token) return <Navigate to="/login" replace />

  if (requireAdmin && !isCurrentUserAdmin()) {
    return <Navigate to="/home" replace />
  }

  return children
}
