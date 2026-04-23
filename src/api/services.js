import api from './client'

// Get all services (admin view with filters)
export const fetchAllServices = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.status) query.append('status', params.status)
  if (params.category) query.append('category', params.category)
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  const { data } = await api.get(`/services/admin/all?${query}`)
  return data
}

// Get pending services
export const fetchPendingServices = async (page = 1, limit = 50) => {
  const { data } = await api.get(`/services/admin/pending?page=${page}&limit=${limit}`)
  return data
}

// Approve a service
export const approveService = async (serviceId, notes = '') => {
  const { data } = await api.post(`/services/${serviceId}/approve`, { notes })
  return data
}

// Reject a service
export const rejectService = async (serviceId, reason) => {
  const { data } = await api.post(`/services/${serviceId}/reject`, { reason })
  return data
}

// Suspend a service
export const suspendService = async (serviceId, reason) => {
  const { data } = await api.post(`/services/${serviceId}/suspend`, { reason })
  return data
}

// Unsuspend a service
export const unsuspendService = async (serviceId) => {
  const { data } = await api.post(`/services/${serviceId}/unsuspend`)
  return data
}

// Admin delete a service
export const adminDeleteService = async (serviceId) => {
  const { data } = await api.delete(`/services/${serviceId}/admin-delete`)
  return data
}
