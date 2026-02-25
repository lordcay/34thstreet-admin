export const getCurrentUserId = () => {
  const directKeys = ['adminId', 'userId', 'id']
  for (const key of directKeys) {
    const value = localStorage.getItem(key)
    if (value) return value
  }

  const userJsonKeys = ['adminUser', 'user', 'currentUser']
  for (const key of userJsonKeys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      const candidate = parsed?._id || parsed?.id || parsed?.userId
      if (candidate) return candidate
    } catch {
      // ignore malformed JSON
    }
  }

  const token = localStorage.getItem('adminToken') || localStorage.getItem('token')
  if (!token) return ''

  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded?._id || decoded?.id || decoded?.userId || decoded?.sub || ''
  } catch {
    return ''
  }
}

export const getCurrentUserName = () => {
  const userJsonKeys = ['adminUser', 'user', 'currentUser']
  for (const key of userJsonKeys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      const first = parsed?.firstName || parsed?.firstname || ''
      const last = parsed?.lastName || parsed?.lastname || ''
      const full = `${first} ${last}`.trim()
      if (full) return full
      if (parsed?.name) return parsed.name
    } catch {
      // ignore malformed JSON
    }
  }
  return 'User'
}
