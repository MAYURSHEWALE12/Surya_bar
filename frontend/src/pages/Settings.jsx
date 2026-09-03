import { API_BASE_URL } from "../config/api"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import CustomSelect from "../components/CustomSelect"

const DEFAULT_SETTINGS = {
  shopName: "Surya Bar & Restaurant",
  address: "Main Road, City Center",
  gstin: "29ABCDE1234F1Z5",
  contactPhone: "+91 98765 43210",
  receiptSize: "80mm",
  footerMessage: "Thank You! Visit Again",
  defaultPaymentMethod: "CASH",
  showLicenseOnBill: true,
}

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [savedToast, setSavedToast] = useState(false)
  const [dbStats, setDbStats] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [restorePreview, setRestorePreview] = useState(null)
  const [restoreMode, setRestoreMode] = useState("REPLACE") // "REPLACE" | "MERGE"
  const [restoring, setRestoring] = useState(false)
  const [restoreSuccessModal, setRestoreSuccessModal] = useState(null)
  const navigate = useNavigate()
  const { role } = useAuthStore()

  useEffect(() => {
    try {
      const stored = localStorage.getItem("surya_bar_settings")
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      }
    } catch (e) {
      console.error("Error reading stored settings:", e)
    }

    if (role === "ADMIN") {
      fetchDbStats()
    }
  }, [role])

  const fetchDbStats = async () => {
    try {
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/backup/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setDbStats(data.counts)
      }
    } catch (e) {
      console.error("Error loading db stats:", e)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    try {
      localStorage.setItem("surya_bar_settings", JSON.stringify(settings))
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 3000)
    } catch (e) {
      alert("Error saving settings: " + e.message)
    }
  }

  const handleReset = () => {
    if (window.confirm("Reset all settings to default values?")) {
      setSettings(DEFAULT_SETTINGS)
      localStorage.setItem("surya_bar_settings", JSON.stringify(DEFAULT_SETTINGS))
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 3000)
    }
  }

  // 1-Click Backup Export
  const handleExportBackup = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/backup/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to export backup")
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      const now = new Date()
      const pad = (n) => String(n).padStart(2, "0")
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      a.href = url
      a.download = `surya_bar_backup_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setSavedToast("Backup downloaded successfully!")
      setTimeout(() => setSavedToast(false), 3000)
    } catch (err) {
      alert("Export failed: " + err.message)
    } finally {
      setExporting(false)
    }
  }

  // Handle File Selection for Restore
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result)
        if (!json.meta || !json.data) {
          alert("Invalid backup file. Missing Surya Bar metadata header.")
          setRestoreFile(null)
          setRestorePreview(null)
          return
        }
        setRestoreFile(json)
        setRestorePreview(json.meta)
      } catch (err) {
        alert("Corrupted JSON file: " + err.message)
        setRestoreFile(null)
        setRestorePreview(null)
      }
    }
    reader.readAsText(file)
  }

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreFile) return

    const confirmMsg =
      restoreMode === "REPLACE"
        ? "WARNING: 'Clean Replace' will wipe current database and restore the exact state from this backup snapshot. Continue?"
        : "Proceed with merging records from this backup snapshot?"

    if (!window.confirm(confirmMsg)) return

    try {
      setRestoring(true)
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/backup/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          backupData: restoreFile,
          mode: restoreMode,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.message || "Restore failed")

      setRestoreSuccessModal(result)
      setRestoreFile(null)
      setRestorePreview(null)
      fetchDbStats()
    } catch (err) {
      alert("Restore Error: " + err.message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto font-sans pb-16">
      {savedToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-150">
          <span className="text-emerald-400 font-black">✓</span> {typeof savedToast === "string" ? savedToast : "Settings saved successfully!"}
        </div>
      )}

      {/* Restore Success Modal */}
      {restoreSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black border border-emerald-200">
              ✓
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Database Restored Successfully!</h3>
            <p className="text-xs text-slate-500 font-medium">
              Your bar catalog, sales, inventory, and customer khata ledgers have been synchronized.
            </p>
            
            {/* Restored record pill grid */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-left grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
              <div>📦 Products: <span className="font-black text-slate-950">{restoreSuccessModal.restoredCounts?.products || 0}</span></div>
              <div>🧾 Invoices: <span className="font-black text-slate-950">{restoreSuccessModal.restoredCounts?.sales || 0}</span></div>
              <div>👥 Customers: <span className="font-black text-slate-950">{restoreSuccessModal.restoredCounts?.customers || 0}</span></div>
              <div>🍾 Inventory: <span className="font-black text-slate-950">{restoreSuccessModal.restoredCounts?.inventories || 0}</span></div>
            </div>

            <button
              onClick={() => {
                setRestoreSuccessModal(null)
                window.location.reload()
              }}
              className="w-full py-3 bg-slate-950 hover:bg-black text-white font-black rounded-xl text-xs sm:text-sm cursor-pointer shadow-xs transition-all"
            >
              Refresh Application
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Bar & POS System Settings
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Configure outlet identity, thermal bill headers, excise license parameters, and data safety backups
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
        >
          Reset to Defaults
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
        {/* 1. Bar Identity & License Details */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Bar Profile & Excise License Details
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Printed at the top header of every customer bill</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Bar / Outlet Name *
              </label>
              <input
                type="text"
                required
                name="shopName"
                value={settings.shopName}
                onChange={handleChange}
                placeholder="e.g. Surya Bar & Restaurant"
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                name="contactPhone"
                value={settings.contactPhone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Address / Location
              </label>
              <input
                type="text"
                name="address"
                value={settings.address}
                onChange={handleChange}
                placeholder="e.g. Main Road, Hinjewadi, Pune"
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                GSTIN / Excise License No.
              </label>
              <input
                type="text"
                name="gstin"
                value={settings.gstin}
                onChange={handleChange}
                placeholder="e.g. 29ABCDE1234F1Z5"
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center pt-2 sm:pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  name="showLicenseOnBill"
                  checked={settings.showLicenseOnBill}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-slate-950 focus:ring-slate-900 border-slate-300"
                />
                <span>Print GSTIN / License Number on Receipts</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. POS & Thermal Receipt Preferences */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Thermal Receipt & POS Billing Preferences
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Parameters for counter checkout, printer roll width, and thermal headers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Thermal Receipt Size
              </label>
              <CustomSelect
                value={settings.receiptSize}
                onChange={(e) => setSettings({ ...settings, receiptSize: e.target.value })}
                options={[
                  { value: "80mm", label: "80mm (Standard POS Thermal)" },
                  { value: "58mm", label: "58mm (Compact Receipt)" },
                ]}
                placeholder="Select Receipt Size"
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Default Payment Channel
              </label>
              <CustomSelect
                value={settings.defaultPaymentMethod}
                onChange={(e) => setSettings({ ...settings, defaultPaymentMethod: e.target.value })}
                options={[
                  { value: "CASH", label: "Cash Payment" },
                  { value: "UPI", label: "UPI / QR Code" },
                  { value: "CARD", label: "Card / POS Terminal" },
                ]}
                placeholder="Select Default Channel"
                searchable={false}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Receipt Footer Greeting
              </label>
              <input
                type="text"
                name="footerMessage"
                value={settings.footerMessage}
                onChange={handleChange}
                placeholder="e.g. Thank You! Visit Again"
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* ADMIN DATA SAFETY: 1-Click Database Backup & Restore (At bottom of page) */}
      {role === "ADMIN" && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-blue-200/80 space-y-5 relative overflow-hidden mt-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/60 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Data Safety & 1-Click Database Backup / Restore
                </h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-md">
                  Admin Control
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Download encrypted full-system snapshots to USB/Drive or restore entire bar history in 5 seconds
              </p>
            </div>
          </div>

          {/* Live Database Status Counts */}
          {dbStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Products</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{dbStats.products || 0}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inventories</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{dbStats.inventories || 0}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sales Bills</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{dbStats.sales || 0}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Khata Customers</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{dbStats.customers || 0}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inward Stock</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{dbStats.purchases || 0}</div>
              </div>
            </div>
          )}

          {/* Backup & Restore Action Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Download Backup Panel */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Create Database Snapshot
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Downloads all products, sales history, customer khata debts, and live inventory into a single JSON file.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                disabled={exporting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {exporting ? (
                  <span>Generating Snapshot...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Full Backup (.json)</span>
                  </>
                )}
              </button>
            </div>

            {/* Restore Backup Panel */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Restore from Backup
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a previously exported backup file to restore your entire database.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* Restore Preview & Mode */}
              {restorePreview && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2.5 animate-in fade-in duration-100">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1.5">
                    <span>Snapshot: <strong className="text-slate-900">{new Date(restorePreview.exportTimestamp).toLocaleDateString()}</strong></span>
                    <span>By: <strong className="text-slate-900">{restorePreview.exportedBy}</strong></span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700">Restore Mode:</span>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="REPLACE"
                          checked={restoreMode === "REPLACE"}
                          onChange={() => setRestoreMode("REPLACE")}
                        />
                        <span className="text-[10px] font-bold text-rose-700">Clean Replace</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="MERGE"
                          checked={restoreMode === "MERGE"}
                          onChange={() => setRestoreMode("MERGE")}
                        />
                        <span className="text-[10px] font-bold text-blue-700">Merge</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={restoring}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg font-black text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {restoring ? "Restoring Database..." : "Confirm & Restore Now"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
