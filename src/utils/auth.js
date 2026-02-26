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

const parseStoredUser = () => {
  const userJsonKeys = ['adminUser', 'user', 'currentUser']
  for (const key of userJsonKeys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore malformed JSON
    }
  }
  return null
}

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const getCurrentUserRole = () => {
  const user = parseStoredUser()
  if (user?.isAdmin === true || user?.admin === true) return 'admin'
  const roleFromUser =
    user?.role ||
    user?.userRole ||
    user?.accountType ||
    user?.type ||
    user?.currentRole ||
    (Array.isArray(user?.roles) ? user.roles[0] : user?.roles)

  if (roleFromUser) return String(roleFromUser).toLowerCase()

  const token = localStorage.getItem('adminToken') || localStorage.getItem('token')
  const payload = decodeJwtPayload(token)
  if (payload?.isAdmin === true || payload?.admin === true) return 'admin'
  const roleFromToken =
    payload?.role ||
    payload?.userRole ||
    payload?.accountType ||
    payload?.type ||
    payload?.currentRole ||
    (Array.isArray(payload?.roles) ? payload.roles[0] : payload?.roles)

  return roleFromToken ? String(roleFromToken).toLowerCase() : ''
}

export const isCurrentUserAdmin = () => {
  const role = getCurrentUserRole()
  return role === 'admin' || role === 'superadmin' || role === 'super_admin'
}
