// Users/Discovery API service
import api from './client'

export const fetchAllUsers = async (filters = {}) => {
  const res = await api.get('/accounts', { params: filters })
  return res.data
}

export const fetchUserById = async (userId) => {
  const res = await api.get(`/accounts/${userId}`)
  return res.data
}

export const updateUserProfile = async (userId, payload) => {
  const res = await api.put(`/accounts/${userId}`, payload)
  return res.data
}

export const deleteUser = async (userId, hard = false) => {
  const res = await api.delete(`/accounts/${userId}`, { params: { hard } })
  return res.data
}

export const checkBlockStatus = async (userId) => {
  const res = await api.get(`/blocks/status/${userId}`)
  return res.data
}

export const toggleBlockUser = async (userId) => {
  const res = await api.post('/blocks', { blocked: userId })
  return res.data
}

export const reportUser = async (payload) => {
  const res = await api.post('/reports', payload)
  return res.data
}
