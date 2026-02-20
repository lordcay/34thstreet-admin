

import api from './client'

export const fetchReports = async () => {
  const res = await api.get('/reports')
  return res.data
}

export const updateReportStatus = async (id, status) => {
  const res = await api.patch(`/reports/${id}/status`, { status })
  return res.data
}
