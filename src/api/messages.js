// Chat/Messages API service
import api from './client'

export const fetchUserConversations = async (userId) => {
  const res = await api.get(`/messages/${userId}`)
  return res.data
}

export const fetchConversationMessages = async (userId, otherUserId) => {
  const res = await api.get(`/messages/${userId}/${otherUserId}`)
  return res.data
}

export const sendPrivateMessage = async (payload) => {
  const res = await api.post('/messages', payload)
  return res.data
}

export const markMessagesAsRead = async (conversationId) => {
  const res = await api.put(`/messages/${conversationId}/read`)
  return res.data
}

export const deleteMessage = async (messageId) => {
  const res = await api.delete(`/messages/${messageId}`)
  return res.data
}
