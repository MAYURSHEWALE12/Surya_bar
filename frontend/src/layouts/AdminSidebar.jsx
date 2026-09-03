import { useState } from "react"
import { NavLink } from "react-router-dom"

export default function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true"
  })

  // Synchronize with parent or local state
  const isSlim = isCollapsed !== undefined ? isCollapsed : collapsed

  const toggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isSlim)
    } else {
      const next = !collapsed
      setCollapsed(next)
      localStorage.setItem("sidebar_collapsed", String(next))
    }
  }

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile()
    }
  }

  const linkClass = ({ isActive }) =>
    `flex items-center ${
      isSlim ? "md:justify-center md:px-0 px-3 py-2" : "gap-2.5 px-3 py-2"
    } rounded-xl text-xs font-semibold transition-all relative group ${
      isActive
        ? "bg-slate-900 dark:bg-blue-600 text-white shadow-sm font-bold"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100"
    }`

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen max-h-[100dvh] flex flex-col justify-between transition-all duration-300 z-50 overflow-hidden ${
          /* Mobile Sheet vs Desktop Sidebar */
          `fixed inset-y-0 left-0 w-[280px] max-w-[85vw] rounded-r-3xl md:rounded-none p-4 ${
            isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } md:translate-x-0 md:static md:sticky top-0 md:shadow-none`
        } ${isSlim ? "md:w-20 md:p-3" : "md:w-60 md:p-4"}`}
      >
        <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden touch-scroll no-scrollbar min-h-0 pr-1 pb-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-800 md:border-b-0 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                SB
              </div>
              {(!isSlim || isMobileOpen) && (
                <div className="overflow-hidden">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                    Surya Bar & Resto
                  </h2>
                  <span className="text-[9px] font-semibold text-slate-400 tracking-wide">
                    Management Portal
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Arrow */}
            <button
              onClick={toggle}
              title={isSlim ? "Expand Sidebar" : "Collapse Sidebar"}
              className="hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-300 ${isSlim ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* Mobile Close Button - Sleek circular button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="space-y-3">
            {/* Terminal */}
            <div>
              {(!isSlim || isMobileOpen) && (
                <span className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Terminal
                </span>
              )}
              <ul className="mt-1 space-y-0.5">
                <li>
                  <NavLink to="/admin/dashboard" onClick={handleLinkClick} className={linkClass} title="Dashboard">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Dashboard</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/pos" onClick={handleLinkClick} className={linkClass} title="POS Billing">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>POS Billing</span>}
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Inventory & Stock */}
            <div>
              {(!isSlim || isMobileOpen) && (
                <span className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Inventory & Inward
                </span>
              )}
              {isSlim && !isMobileOpen && <div className="border-t border-slate-100 my-1.5"></div>}
              <ul className="mt-1 space-y-0.5">
                <li>
                  <NavLink to="/admin/products" onClick={handleLinkClick} className={linkClass} title="Liquor Products">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Liquor Products</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/inventory" onClick={handleLinkClick} className={linkClass} title="Live Stock Inventory">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Live Stock</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/purchases" onClick={handleLinkClick} className={linkClass} title="Inward Purchases">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Inward Purchases</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/vendors" onClick={handleLinkClick} className={linkClass} title="Suppliers / Vendors">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Vendors</span>}
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Sales & Analytics */}
            <div>
              {(!isSlim || isMobileOpen) && (
                <span className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Sales & Reports
                </span>
              )}
              {isSlim && !isMobileOpen && <div className="border-t border-slate-100 my-1.5"></div>}
              <ul className="mt-1 space-y-0.5">
                <li>
                  <NavLink to="/admin/sales" onClick={handleLinkClick} className={linkClass} title="Sales Receipts">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Sales Receipts</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/non-tp-analytics" onClick={handleLinkClick} className={linkClass} title="Non-TP Analytics">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Non-TP Analytics</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/analytics" onClick={handleLinkClick} className={linkClass} title="TP Analytics">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>TP Analytics</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/combined-analytics" onClick={handleLinkClick} className={linkClass} title="Combined Analytics">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Combined Analytics</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/reports" onClick={handleLinkClick} className={linkClass} title="Reports Center">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Reports</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/customers" onClick={handleLinkClick} className={linkClass} title="Customer Credit & Khata">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Customer Khata</span>}
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Administration */}
            <div>
              {(!isSlim || isMobileOpen) && (
                <span className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Settings
                </span>
              )}
              {isSlim && !isMobileOpen && <div className="border-t border-slate-100 my-1.5"></div>}
              <ul className="mt-1 space-y-0.5">
                <li>
                  <NavLink to="/admin/users" onClick={handleLinkClick} className={linkClass} title="Users & Staff">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Users & Staff</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/settings" onClick={handleLinkClick} className={linkClass} title="Bar Settings">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Bar Settings</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/audit-logs" onClick={handleLinkClick} className={linkClass} title="Audit Trail">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {(!isSlim || isMobileOpen) && <span>Audit Trail</span>}
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        {(!isSlim || isMobileOpen) ? (
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 px-2 flex items-center justify-between font-medium">
            <span className="font-bold text-slate-500">Surya Bar POS</span>
            <span className="text-[9px] text-slate-400">v1.0</span>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 flex justify-center text-slate-300">
            •
          </div>
        )}
      </aside>
    </>
  )
}