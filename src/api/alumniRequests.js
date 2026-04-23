import api from './client'

export const fetchAlumniRequests = async (params = {}) => {
  const res = await api.get('/alumni-requests', { params })
  return res.data
}

export const fetchAlumniRequestStats = async () => {
  const res = await api.get('/alumni-requests/stats')
  return res.data
}

export const fetchAlumniRequestById = async (id) => {
  const res = await api.get(`/alumni-requests/${id}`)
  return res.data
}

export const approveAlumniRequest = async (id) => {
  const res = await api.post(`/alumni-requests/${id}/approve`)
  return res.data
}

export const denyAlumniRequest = async (id, reason) => {
  const res = await api.post(`/alumni-requests/${id}/deny`, { reason })
  return res.data
}
