// Chat Rooms API service
import api from './client'

export const fetchChatRooms = async () => {
  const res = await api.get('/chatrooms')
  return res.data
}

export const fetchChatRoomById = async (chatroomId) => {
  const res = await api.get(`/chatrooms/${chatroomId}`)
  return res.data
}

export const fetchChatRoomMessages = async (chatroomId) => {
  const res = await api.get(`/api/chatroom-messages/${chatroomId}/messages`)
  return res.data
}

export const sendChatRoomMessage = async (payload) => {
  const res = await api.post(`/api/chatroom-messages/${payload.chatroomId}`, payload)
  return res.data
}

export const addReactionToMessage = async (messageId, emoji) => {
  const res = await api.put(`/api/chatroom-messages/${messageId}/reaction`, { emoji })
  return res.data
}

export const deleteRoomMessage = async (messageId) => {
  const res = await api.delete(`/api/chatroom-messages/${messageId}`)
  return res.data
}
