import axios from 'axios'

const API_URL = 'https://three4th-street-backend.onrender.com'

export const createGist = async (payload, token) => {
  const res = await axios.post(`${API_URL}/feed`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  return res.data
}
