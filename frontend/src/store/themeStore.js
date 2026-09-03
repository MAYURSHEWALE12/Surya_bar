import { create } from "zustand"

export const useThemeStore = create((set) => ({
  isDark: (() => {
    try {
      const stored = localStorage.getItem("surya_bar_theme")
      if (stored) return stored === "dark"
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    } catch {
      return false
    }
  })(),

  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark
      try {
        localStorage.setItem("surya_bar_theme", next ? "dark" : "light")
        if (next) {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      } catch {}
      return { isDark: next }
    }),

  initTheme: () => {
    try {
      const stored = localStorage.getItem("surya_bar_theme")
      const isDark = stored ? stored === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      if (isDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      set({ isDark })
    } catch {}
  },
}))
