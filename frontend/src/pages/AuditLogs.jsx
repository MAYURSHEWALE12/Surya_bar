import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from "react"

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching audit logs:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const userMatch = log.user?.name?.toLowerCase().includes(term) || log.user?.email?.toLowerCase().includes(term)
        const entityMatch = log.entity?.toLowerCase().includes(term)
        const descMatch = JSON.stringify(log.details || {}).toLowerCase().includes(term)
        if (!userMatch && !entityMatch && !descMatch) return false
      }
      return true
    })
  }, [logs, actionFilter, searchTerm])

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
      case "CREATE":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "UPDATE":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "DELETE":
        return "bg-rose-100 text-rose-800 border-rose-200"
      case "VOID":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "LOGIN":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Security & System Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Track user logins, sales transactions, inventory adjustments, and administrative changes
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center"
        >
          Refresh Logs
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by user, entity, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Action:</span>
          {["ALL", "CREATE", "UPDATE", "DELETE", "VOID", "LOGIN"].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                actionFilter === act
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table & Mobile Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Mobile Audit Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No audit log records found.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log._id} className="p-3.5 space-y-2 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-xs text-slate-900">{log.user?.name || "System"}</span>
                    <p className="text-[10px] text-slate-400 font-medium">{log.user?.email || "internal"}</p>
                  </div>
                  <span className={`px-2 py-0.5 font-black rounded-full text-[9px] border uppercase ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">Entity: <strong className="text-blue-700 font-extrabold">{log.entity}</strong></span>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                </div>

                {log.details && (
                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] font-mono text-slate-600 break-all border border-slate-100">
                    {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Audit Table (md:) */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Timestamp</th>
                <th className="p-3.5 text-left">User / Actor</th>
                <th className="p-3.5 text-center">Action</th>
                <th className="p-3.5 text-left">Entity</th>
                <th className="p-3.5 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">No audit log records found.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {log.user?.name || "System"} ({log.user?.email || "internal"})
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 font-extrabold rounded text-[10px] border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{log.entity}</td>
                    <td className="p-3.5 text-slate-600 font-mono text-[11px] max-w-md truncate">
                      {typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
