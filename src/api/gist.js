import axios from 'axios'
import api from './client'

const API_URL = 'https://three4th-street-backend.onrender.com'

export const fetchTodayGist = async () => {
  const res = await api.get('/feed/today')
  return res.data
}

export const fetchGistById = async (gistId) => {
  const res = await api.get(`/feed/${gistId}`)
  return res.data
}

export const voteOnGist = async (gistId, voteType) => {
  const res = await api.post(`/feed/${gistId}/vote`, { type: voteType })
  return res.data
}

export const fetchGistComments = async (gistId) => {
  const res = await api.get(`/feed/${gistId}/comments`)
  return res.data
}

export const addGistComment = async (gistId, text) => {
  const res = await api.post(`/feed/${gistId}/comments`, { text })
  return res.data
}

export const createGist = async (payload, token) => {
  if (token) {
    const res = await axios.post(`${API_URL}/feed`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    return res.data
  }

  const res = await api.post('/feed', payload)
  return res.data
}
