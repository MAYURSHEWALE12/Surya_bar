import { NavLink } from "react-router-dom"

export default function CashierSidebar({ isMobileOpen, onCloseMobile }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
      isActive
        ? "bg-slate-900 text-white shadow-sm font-bold"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`bg-white border-r border-slate-200 h-screen max-h-[100dvh] flex flex-col justify-between transition-all duration-300 z-50 overflow-hidden ${
          `fixed inset-y-0 left-0 ${
            isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } md:translate-x-0 md:static md:sticky top-0`
        } w-64 p-4`}
      >
        <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden touch-scroll no-scrollbar min-h-0 pb-4">
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                SB
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Surya Bar POS</h2>
                <span className="text-[10px] font-semibold text-slate-500">Cashier Terminal</span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Counter
            </span>
            <ul className="space-y-1">
              <li>
                <NavLink to="/cashier/pos" onClick={onCloseMobile} className={linkClass}>
                  <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>POS Billing</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/cashier/my-sales" onClick={onCloseMobile} className={linkClass}>
                  <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>My Sales</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/cashier/customers" onClick={onCloseMobile} className={linkClass}>
                  <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Customer Khata</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 px-2 text-center font-medium">
          Surya Bar POS • Cashier
        </div>
      </aside>
    </>
  )
}