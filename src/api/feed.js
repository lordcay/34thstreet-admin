// src/api/feed.js
import api from './client'

// GET all gists
export const fetchGists = async () => {
  const res = await api.get('/feed')
  return res.data
}

// POST create a new gist
export const createGist = async (payload) => {
  const res = await api.post('/feed', payload)
  return res.data
}

// DELETE a gist (if your backend supports it)
export const deleteGist = async (id) => {
  const res = await api.delete(`/feed/${id}`)
  return res.data
}
