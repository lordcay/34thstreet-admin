import api from './client'

export const fetchSchoolRequests = async (params = {}) => {
  const res = await api.get('/school-requests', { params })
  return res.data
}

export const fetchSchoolRequestStats = async () => {
  const res = await api.get('/school-requests/stats')
  return res.data
}

export const fetchSchoolRequestById = async (id) => {
  const res = await api.get(`/school-requests/${id}`)
  return res.data
}

export const approveSchoolRequest = async (id) => {
  const res = await api.post(`/school-requests/${id}/approve`)
  return res.data
}

export const denySchoolRequest = async (id, reason) => {
  const res = await api.post(`/school-requests/${id}/deny`, { reason })
  return res.data
}
