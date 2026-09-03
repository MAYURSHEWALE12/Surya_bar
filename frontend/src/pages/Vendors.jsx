import { API_BASE_URL } from "../config/api"
import { useState, useEffect } from "react"

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    contactNumber: "",
    email: "",
    address: "",
    gstin: "",
    paymentTerms: "30_DAYS",
    openingBalance: 0,
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setVendors(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error loading vendors:", err)
    } finally {
      setLoading(false)
    }
  }

  const showToastMsg = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (res.ok) {
        showToastMsg("Vendor created successfully!")
        setShowForm(false)
        setFormData({
          name: "",
          contactNumber: "",
          email: "",
          address: "",
          gstin: "",
          paymentTerms: "30_DAYS",
          openingBalance: 0,
          notes: "",
        })
        loadVendors()
      } else {
        alert(data.message || "Failed to create vendor")
      }
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState("")

  const gstVerifiedCount = vendors.filter((v) => v.gstin && v.gstin.trim().length > 0).length

  const filteredVendors = vendors.filter((v) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    const name = v.name?.toLowerCase() || ""
    const phone = v.contactNumber?.toLowerCase() || ""
    const gstin = v.gstin?.toLowerCase() || ""
    const addr = v.address?.toLowerCase() || ""
    return name.includes(term) || phone.includes(term) || gstin.includes(term) || addr.includes(term)
  })

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-150">
          <span className="text-emerald-400 font-black">✓</span> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900">
            Distributor & Vendor Directory
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage registered liquor distributors, brewery accounts, wholesale suppliers, and tax credentials
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          {showForm ? "Cancel / Close Form" : "+ Register New Vendor"}
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Registered Suppliers</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{vendors.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Active trade accounts</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">GST Compliant Vendors</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{gstVerifiedCount}</p>
          <p className="text-[10px] text-slate-500 font-medium">With registered GSTIN number</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Supply Channels</span>
          <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5">Verified</p>
          <p className="text-[10px] text-slate-500 font-medium">Excise & Commercial channels</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">Register Vendor / Distributor</h3>
              <p className="text-xs text-slate-500">Add profile details to associate with inward purchase shipments</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Vendor / Firm Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KSBC Depot, United Spirits, Som Distilleries"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  GSTIN Tax Registration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="orders@distributor.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Depot Location / Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, State, PIN"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting || !formData.name}
                className="px-6 py-3 bg-slate-950 hover:bg-black active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving..." : "Save Distributor Profile"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendors Directory */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          <div>
            <h3 className="font-black text-slate-900 text-xs sm:text-sm">Registered Vendors Directory</h3>
            <span className="text-[11px] text-slate-500 font-semibold">{vendors.length} vendors registered</span>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search vendor, phone, or GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Mobile Vendor Cards (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No vendors found matching search. Tap "+ Register New Vendor" above.
            </div>
          ) : (
            filteredVendors.map((v) => (
              <div key={v._id} className="p-3.5 space-y-2 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{v.name}</h4>
                    {v.contactNumber && (
                      <a
                        href={`tel:${v.contactNumber}`}
                        className="text-xs text-slate-700 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        {v.contactNumber}
                      </a>
                    )}
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-md">
                    ACTIVE
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-100">
                  {v.gstin && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">GSTIN:</span>
                      <span className="font-mono font-bold text-slate-900">{v.gstin}</span>
                    </div>
                  )}
                  {v.address && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Address:</span>
                      <span className="font-medium text-slate-800 truncate pl-2">{v.address}</span>
                    </div>
                  )}
                  {v.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Email:</span>
                      <span className="font-medium text-slate-800">{v.email}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Vendors Table (md: and up) */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Vendor / Distributor</th>
                <th className="p-3.5 text-left">Contact Phone</th>
                <th className="p-3.5 text-left">GSTIN Registration</th>
                <th className="p-3.5 text-left">Depot / Location</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    Loading vendors...
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    No vendors registered yet. Click "+ Register New Vendor" above.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>{v.name}</div>
                      {v.email && <div className="text-[10px] text-slate-400 font-normal">{v.email}</div>}
                    </td>
                    <td className="p-3.5 text-slate-800 font-medium">
                      {v.contactNumber ? (
                        <a href={`tel:${v.contactNumber}`} className="hover:underline">
                          {v.contactNumber}
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {v.gstin ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">{v.gstin}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {v.address || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-md">
                        ACTIVE
                      </span>
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
