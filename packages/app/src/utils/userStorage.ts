/**
 * User-specific localStorage utilities
 * Ensures data isolation between different user accounts
 */

let cachedUserId: string | null = null

/**
 * Fetches the current user's ID from the backend
 * Caches the result to avoid repeated API calls
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId

  try {
    // Call a backend endpoint to get current user info
    const response = await fetch('/api/current-user', {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      cachedUserId = data.accountId ? String(data.accountId) : null
      return cachedUserId
    }
  } catch (error) {
    console.error('Failed to fetch current user ID:', error)
  }

  return null
}

/**
 * Clears the cached user ID (call on logout)
 */
export function clearCachedUserId() {
  cachedUserId = null
}

/**
 * Creates a user-specific localStorage key
 */
function getUserKey(key: string, userId: string | null): string {
  if (!userId) return `guest_${key}`
  return `user_${userId}_${key}`
}

/**
 * Sets a value in localStorage with user-specific namespacing
 */
export async function setUserItem(key: string, value: string): Promise<void> {
  const userId = await getCurrentUserId()
  const userKey = getUserKey(key, userId)
  localStorage.setItem(userKey, value)
}

/**
 * Gets a value from localStorage with user-specific namespacing
 */
export async function getUserItem(key: string): Promise<string | null> {
  const userId = await getCurrentUserId()
  const userKey = getUserKey(key, userId)
  return localStorage.getItem(userKey)
}

/**
 * Removes a value from localStorage with user-specific namespacing
 */
export async function removeUserItem(key: string): Promise<void> {
  const userId = await getCurrentUserId()
  const userKey = getUserKey(key, userId)
  localStorage.removeItem(userKey)
}

/**
 * Clears all user-specific data from localStorage
 * Call this when a user logs out
 */
export async function clearUserStorage(): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  const keysToRemove: string[] = []
  const prefix = `user_${userId}_`

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key))
  clearCachedUserId()
}

/**
 * Synchronous version - use only when userId is already known
 * Prefer async versions above when possible
 */
export const userStorageSync = {
  setItem(userId: string, key: string, value: string) {
    const userKey = getUserKey(key, userId)
    localStorage.setItem(userKey, value)
  },

  getItem(userId: string, key: string): string | null {
    const userKey = getUserKey(key, userId)
    return localStorage.getItem(userKey)
  },

  removeItem(userId: string, key: string) {
    const userKey = getUserKey(key, userId)
    localStorage.removeItem(userKey)
  }
}
