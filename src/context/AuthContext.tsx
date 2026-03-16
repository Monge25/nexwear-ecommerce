import React, { createContext, useContext, useEffect, useReducer } from "react"
import type { User, LoginCredentials, RegisterData } from "@/types"
import authService from "@/services/authService"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: authService.isAuthenticated(),
  loading: false,
  error: null,
}

type AuthAction =
  | { type: "SET_LOADING" }
  | { type: "SET_USER"; payload: User }
  | { type: "SET_ERROR"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: true, error: null }

    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      }

    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload }

    case "LOGOUT":
      return {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      }

    case "CLEAR_ERROR":
      return { ...state, error: null }

    default:
      return state
  }
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    if (authService.isAuthenticated()) {
      authService
        .getMe()
        .then((user) => dispatch({ type: "SET_USER", payload: user }))
        .catch(() => dispatch({ type: "LOGOUT" }))
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: "SET_LOADING" })

    try {
      const user = await authService.login(credentials)

      dispatch({ type: "SET_USER", payload: user })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión"

      dispatch({ type: "SET_ERROR", payload: message })
      throw err
    }
  }

  const register = async (data: RegisterData) => {
    dispatch({ type: "SET_LOADING" })

    try {
      const user = await authService.register(data)

      dispatch({ type: "SET_USER", payload: user })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al registrarse"

      dispatch({ type: "SET_ERROR", payload: message })
      throw err
    }
  }

  const logout = async () => {
    await authService.logout()
    dispatch({ type: "LOGOUT" })
  }

  const clearError = () => dispatch({ type: "CLEAR_ERROR" })

  const isAdmin = state.user?.role === "Admin"

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }

  return ctx
}