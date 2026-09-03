import { create } from "zustand"
import { persist } from "zustand/middleware"
import { login as apiLogin } from "../services/api"

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      login: async (credentialsOrToken, user, role) => {
        if (typeof credentialsOrToken === "object" && credentialsOrToken !== null && !user) {
          const data = await apiLogin(credentialsOrToken)
          const userObj = data.user || data
          const token = data.token
          const userRole = userObj.role || data.role || "ADMIN"
          set({
            token,
            user: userObj,
            role: userRole,
            isAuthenticated: true,
          })
          if (token) {
            localStorage.setItem("surya_bar_token", token)
          }
          return data
        } else {
          const resolvedRole = role || user?.role || "ADMIN"
          set({ token: credentialsOrToken, user, role: resolvedRole, isAuthenticated: true })
          if (credentialsOrToken) {
            localStorage.setItem("surya_bar_token", credentialsOrToken)
          }
        }
      },
      logout: () => {
        set({ user: null, token: null, role: null, isAuthenticated: false })
        localStorage.removeItem("surya_bar_token")
      },
      checkAuth: () => {
        const token = localStorage.getItem("surya_bar_token")
        if (token) {
          set({ token, isAuthenticated: true })
        }
      },
    }),
    { name: "surya-bar-auth" }
  )
)

export { useAuthStore, useAuthStore as useStore }
export default useAuthStore