/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'innovarest.auth'
const AuthContext = createContext(null)

const readStoredSession = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

const readResponseBody = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

const findApiError = (value) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findApiError(item)
      if (message) return message
    }
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const message = findApiError(item)
      if (message) return message
    }
  }
  return null
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(readStoredSession)
  const [isRestoring, setIsRestoring] = useState(true)

  const persistSession = (responseBody) => {
    const nextSession = {
      accessToken: responseBody.accessToken,
      tokenType: responseBody.tokenType,
      expiresIn: responseBody.expiresIn,
      user: responseBody.user,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return responseBody.user
  }

  useEffect(() => {
    const storedSession = readStoredSession()
    const controller = new AbortController()

    if (!storedSession?.accessToken) {
      setSession(null)
      setIsRestoring(false)
      return () => controller.abort()
    }

    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/me/', {
          headers: {
            Authorization: `Bearer ${storedSession.accessToken}`,
          },
          signal: controller.signal,
        })

        if (!response.ok) throw new Error('La sesión ya no es válida.')

        const user = await readResponseBody(response)
        const restoredSession = { ...storedSession, user }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(restoredSession))
        setSession(restoredSession)
      } catch (error) {
        if (error.name !== 'AbortError') {
          sessionStorage.removeItem(STORAGE_KEY)
          setSession(null)
        }
      } finally {
        if (!controller.signal.aborted) setIsRestoring(false)
      }
    }

    restoreSession()
    return () => controller.abort()
  }, [])

  const login = async ({ email, password }) => {
    const response = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    const body = await readResponseBody(response)

    if (!response.ok) {
      throw new Error(findApiError(body) || 'No fue posible iniciar sesión.')
    }

    return persistSession(body)
  }

  const register = async (clientData) => {
    const response = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    })
    const body = await readResponseBody(response)

    if (!response.ok) {
      throw new Error(findApiError(body) || 'No fue posible crear la cuenta.')
    }

    return persistSession(body)
  }

  const updateProfile = async (profileData) => {
    if (!session?.accessToken) throw new Error('La sesión no es válida.')

    const response = await fetch('/api/auth/me/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    })
    const body = await readResponseBody(response)

    if (!response.ok) {
      throw new Error(findApiError(body) || 'No fue posible actualizar el perfil.')
    }

    const nextSession = { ...session, user: body }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return body
  }

  const changePassword = async (passwordData) => {
    if (!session?.accessToken) throw new Error('La sesión no es válida.')

    const response = await fetch('/api/auth/password/', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passwordData),
    })
    const body = await readResponseBody(response)

    if (!response.ok) {
      throw new Error(findApiError(body) || 'No fue posible cambiar la contraseña.')
    }

    persistSession(body)
  }

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  const value = useMemo(() => ({
    accessToken: session?.accessToken ?? null,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.user),
    isRestoring,
    changePassword,
    login,
    logout,
    register,
    updateProfile,
  }), [isRestoring, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}
