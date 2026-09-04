import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { login, isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

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
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 pb-5 text-center border-b border-slate-100">
            <div className="w-11 h-11 bg-slate-950 text-white rounded-xl flex items-center justify-center font-black text-sm mx-auto mb-3 shadow-sm">
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
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your registered email"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-slate-950 rounded-xl text-xs text-slate-900 focus:outline-none transition-colors font-medium"
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
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-slate-950 rounded-xl text-xs text-slate-900 focus:outline-none transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-950 hover:bg-black active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
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