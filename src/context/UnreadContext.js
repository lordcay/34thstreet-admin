import React, { createContext, useState, useEffect } from 'react'
import { fetchUserConversations } from 'src/api/messages'
import { getCurrentUserId } from 'src/utils/auth'

export const UnreadContext = createContext({ counts: {}, refresh: () => {} })

export function UnreadProvider({ children }) {
  const [counts, setCounts] = useState({})

  const refresh = async () => {
    try {
      const userId = getCurrentUserId()
      if (!userId) return
      const res = await fetchUserConversations(userId)
      // expect res to be array of conversations
      const convs = Array.isArray(res) ? res : res.conversations || []
      const map = {}
      convs.forEach((c) => {
        const other = c.otherUser || c.participant || c.user || {}
        const key = other._id || other.id || String(other)
        map[key] = c.unreadCount || c.unread || 0
      })
      setCounts(map)
    } catch (e) {
      console.warn('Unread refresh failed', e)
    }
  }

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 30 * 1000) // refresh every 30s
    return () => clearInterval(iv)
  }, [])

  return <UnreadContext.Provider value={{ counts, refresh }}>{children}</UnreadContext.Provider>
}
