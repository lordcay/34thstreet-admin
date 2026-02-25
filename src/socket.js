import { io } from 'socket.io-client'
import { getCurrentUserId } from 'src/utils/auth'

let socketInstance = null

export const getSocket = () => {
  if (socketInstance) return socketInstance

  const socketUrl = import.meta.env.VITE_API_BASE_URL || 'https://three4th-street-backend.onrender.com'

  socketInstance = io(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: false,
  })

  socketInstance.on('connect', () => {
    const userId = getCurrentUserId()
    if (userId) {
      socketInstance.emit('register', userId)
    }
  })

  return socketInstance
}

export const disconnectSocket = () => {
  if (!socketInstance) return
  socketInstance.disconnect()
  socketInstance = null
}
