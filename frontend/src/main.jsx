import React, { useState, useEffect } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./store/authStore"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import Pos from "./pages/Pos"
import AdminPos from "./pages/AdminPos"
import Products from "./pages/Products"
import Sales from "./pages/Sales"
import Inventory from "./pages/Inventory"
import Purchases from "./pages/Purchases"
import Vendors from "./pages/Vendors"
import SaleReturns from "./pages/SaleReturns"
import VoidedBills from "./pages/VoidedBills"
import TPAnalytics from "./pages/TPAnalytics"
import NonTPAnalytics from "./pages/NonTPAnalytics"
import CombinedAnalytics from "./pages/CombinedAnalytics"
import Reports from "./pages/Reports"
import Customers from "./pages/Customers"
import MySales from "./pages/MySales"
import Settings from "./pages/Settings"
import Users from "./pages/Users"
import AuditLogs from "./pages/AuditLogs"
import NotFound from "./components/NotFound"
import AdminSidebar from "./layouts/AdminSidebar"
import CashierSidebar from "./layouts/CashierSidebar"
import "./index.css"

import { API_BASE_URL } from "./config/api"

function App() {
  const { user, isAuthenticated, logout, checkAuth, role } = useAuthStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true"
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const toggleSidebar = (val) => {
    const next = typeof val === "boolean" ? val : !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem("sidebar_collapsed", String(next))
  }

  useEffect(() => {
    checkAuth()

    // Warm up Render backend immediately on page open & keep alive every 10 min while app is open
    const warmUpBackend = () => {
      fetch(`${API_BASE_URL}/health`).catch(() => {})
    }
    warmUpBackend()
    const interval = setInterval(warmUpBackend, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
          {/* Sidebar */}
          {role === "ADMIN" ? (
            <AdminSidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              isMobileOpen={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          ) : (
            <CashierSidebar
              isMobileOpen={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          )}

          <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden transition-all duration-300">
            {/* Header / Nav */}
            <nav className="bg-white border-b border-slate-200 px-3.5 md:px-5 py-2.5 md:py-3 sticky top-0 z-30 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Mobile Menu Hamburger Button */}
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Open Menu"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <h1 className="text-sm md:text-base font-bold text-slate-900 truncate">
                    Surya Bar & Resto POS
                  </h1>
                </div>

                <div className="flex items-center gap-2.5 md:gap-4">
                  <div className="text-right">
                    <p className="text-[11px] md:text-xs font-bold text-slate-800 leading-tight">
                      {user?.name || (role === "ADMIN" ? "Admin" : "Cashier")}
                    </p>
                    <span className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase">
                      {role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 md:px-3.5 md:py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-3 md:p-5 w-full min-w-0 no-scrollbar">
              <Routes>
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/pos" element={<AdminPos />} />
                <Route path="/admin/products" element={<Products />} />
                <Route path="/admin/inventory" element={<Inventory />} />
                <Route path="/admin/purchases" element={<Purchases />} />
                <Route path="/admin/vendors" element={<Vendors />} />
                <Route path="/admin/sale-returns" element={<SaleReturns />} />
                <Route path="/admin/voided-bills" element={<VoidedBills />} />
                <Route path="/admin/sales" element={<Sales />} />
                <Route path="/admin/analytics" element={<TPAnalytics />} />
                <Route path="/admin/non-tp-analytics" element={<NonTPAnalytics />} />
                <Route path="/admin/combined-analytics" element={<CombinedAnalytics />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/customers" element={<Customers />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/cashier/pos" element={<Pos />} />
                <Route path="/cashier/my-sales" element={<MySales />} />
                <Route path="/cashier/customers" element={<Customers />} />
                <Route path="/cashier/held-bills" element={<div className="p-6 bg-white rounded shadow">Held Bills</div>} />
                <Route path="/pos" element={<Navigate to={role === "ADMIN" ? "/admin/pos" : "/cashier/pos"} replace />} />
                <Route
                  path="/"
                  element={
                    <Navigate to={role === "ADMIN" ? "/admin/dashboard" : "/cashier/pos"} replace />
                  }
                />
                <Route path="/login" element={<Navigate to={role === "ADMIN" ? "/admin/dashboard" : "/cashier/pos"} replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </Router>
  )
}

const container = document.getElementById("root")
if (!container._reactRoot) {
  container._reactRoot = ReactDOM.createRoot(container)
}
container._reactRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

export default App