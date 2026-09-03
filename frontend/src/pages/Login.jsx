import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"

export default function Login() {
  const [activeRoleTab, setActiveRoleTab] = useState("ADMIN") // "ADMIN" | "CASHIER"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { login, isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

  const handleRoleTabChange = (role) => {
    setActiveRoleTab(role)
    setErrorMessage("")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMessage("")
    setLoading(true)

    try {
      const data = await login({
        email: email.trim(),
        password,
      })

      const userRole = data?.user?.role || data?.role || "ADMIN"
      if (userRole === "CASHIER") {
        navigate("/cashier/pos")
      } else {
        navigate("/admin/dashboard")
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
        "Incorrect email or password. Please check your credentials."
      )
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-300 rounded-xl p-8 max-w-sm w-full text-center shadow-sm space-y-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-base mx-auto">
            SB
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Current Session Active</h3>
            <p className="text-xs text-slate-500 mt-1">
              Logged in as <strong className="text-slate-800">{user.name || user.email}</strong> ({user.role})
            </p>
          </div>
          <button
            onClick={() => navigate(user.role === "CASHIER" ? "/cashier/pos" : "/admin/dashboard")}
            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Open POS Terminal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 font-sans">
      {/* Centered Login Box */}
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 pb-4 text-center border-b border-slate-100">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm mx-auto mb-3">
              SB
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              Surya Bar & Restaurant
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Point of Sale & Inventory Sign In
            </p>
          </div>

          <div className="p-6 pt-5 space-y-4">
            {/* Account Role Selector Pills */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleTabChange("ADMIN")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeRoleTab === "ADMIN"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Admin Account
              </button>
              <button
                type="button"
                onClick={() => handleRoleTabChange("CASHIER")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeRoleTab === "CASHIER"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cashier Account
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@suryabar.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-lg text-xs text-slate-900 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-lg text-xs text-slate-900 focus:outline-none transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-black active:scale-[0.99] text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? "Signing In..." : "Sign In to Terminal"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}