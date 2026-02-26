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
  const chatroomId = payload?.chatroomId
  const roomId = payload?.roomId || chatroomId
  const messageText = payload?.message || payload?.text || payload?.content || ''

  const candidates = [
    {
      endpoint: `/api/chatroom-messages/${chatroomId}`,
      body: {
        chatroomId,
        roomId,
        message: messageText,
        text: messageText,
        content: messageText,
        senderId: payload?.senderId,
        sender: payload?.senderId,
        senderName: payload?.senderName,
        replyTo: payload?.replyTo,
      },
    },
    {
      endpoint: `/api/chatroom-messages/${chatroomId}/messages`,
      body: {
        chatroomId,
        roomId,
        message: messageText,
        text: messageText,
        content: messageText,
        senderId: payload?.senderId,
        sender: payload?.senderId,
        senderName: payload?.senderName,
        replyTo: payload?.replyTo,
      },
    },
    {
      endpoint: '/api/chatroom-messages/messages',
      body: {
        chatroomId,
        roomId,
        message: messageText,
        text: messageText,
        content: messageText,
        senderId: payload?.senderId,
        sender: payload?.senderId,
        senderName: payload?.senderName,
        replyTo: payload?.replyTo,
      },
    },
    {
      endpoint: `/chatrooms/${chatroomId}/messages`,
      body: {
        chatroomId,
        roomId,
        content: messageText,
        text: messageText,
        message: messageText,
        senderId: payload?.senderId,
        sender: payload?.senderId,
        senderName: payload?.senderName,
        replyTo: payload?.replyTo,
      },
    },
    {
      endpoint: `/chatroom-messages/${chatroomId}`,
      body: {
        chatroomId,
        roomId,
        message: messageText,
        text: messageText,
        content: messageText,
        senderId: payload?.senderId,
        sender: payload?.senderId,
        senderName: payload?.senderName,
        replyTo: payload?.replyTo,
      },
    },
    {
      endpoint: `/chatroom-messages/${chatroomId}/messages`,
      body: {
        chatroomId,
        roomId,
        message: messageText,
        text: messageText,
        content: messageText,
        senderId: payload?.senderId,
        sender: payload?.senderId,
        senderName: payload?.senderName,
        replyTo: payload?.replyTo,
      },
    },
  ]

  let lastError = null
  for (const candidate of candidates) {
    try {
      const res = await api.post(candidate.endpoint, candidate.body)
      return res.data
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Failed to send chatroom message')
}

export const addReactionToMessage = async (messageId, emoji) => {
  const res = await api.put(`/api/chatroom-messages/${messageId}/reaction`, { emoji })
  return res.data
}

export const deleteRoomMessage = async (messageId) => {
  const res = await api.delete(`/api/chatroom-messages/${messageId}`)
  return res.data
}
