import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../store/authStore"
import { getInventory, adjustInventoryStock } from "../services/api"

export default function Inventory() {
  const [inventoryList, setInventoryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("ALL")
  const [adjustModes, setAdjustModes] = useState({}) // { [id]: "SET" | "ADD" }
  const [adjustInputs, setAdjustInputs] = useState({}) // { [id]: string }
  const [updatingId, setUpdatingId] = useState(null)
  const [toast, setToast] = useState(null)
  const { role } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (role === "ADMIN") {
      loadInventory()
    } else {
      navigate("/cashier/pos")
    }
  }, [role])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const data = await getInventory()
      setInventoryList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading inventory:", error)
      setInventoryList([])
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setToast({ msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAdjustSubmit = async (item) => {
    const key = item._id
    const mode = adjustModes[key] || "SET"
    const inputVal = adjustInputs[key]

    if (inputVal === undefined || inputVal === "") {
      alert("Please enter a stock quantity")
      return
    }

    const valNum = Number(inputVal)
    if (isNaN(valNum)) {
      alert("Invalid number entered")
      return
    }

    if (mode === "SET" && valNum < 0) {
      alert("Stock quantity cannot be negative")
      return
    }

    try {
      setUpdatingId(key)
      const payload = {
        productId: item.product?._id || item.product,
        stockType: item.stockType,
        mode,
        quantity: valNum,
      }

      const data = await adjustInventoryStock(payload)
      if (data && data.success) {
        showToast(
          `Stock updated for ${item.product?.name || "Product"} (${item.stockType}): ${
            data.inventory?.quantity ?? inputVal
          }`
        )
        setInventoryList((prev) =>
          prev.map((inv) =>
            inv._id === item._id ? { ...inv, quantity: data.inventory?.quantity ?? Number(inputVal) } : inv
          )
        )
        setAdjustInputs((prev) => ({ ...prev, [key]: "" }))
      } else {
        alert(data.message || "Failed to adjust stock")
      }
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // Summary metrics
  const totalUnits = inventoryList.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
  const totalValuation = inventoryList.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.sellingPrice) || 0), 0)
  const lowStockCount = inventoryList.filter((i) => (Number(i.quantity) || 0) <= (Number(i.minimumStock) || 0) && (Number(i.minimumStock) || 0) > 0).length

  // Filter items based on activeTab and searchTerm
  const filteredList = inventoryList.filter((item) => {
    if (!item.product) return false
    const matchesTab =
      activeTab === "ALL" ||
      (activeTab === "TP" && item.stockType === "TP") ||
      (activeTab === "NON_TP" && item.stockType === "NON_TP") ||
      (activeTab === "LOW_STOCK" && (Number(item.quantity) || 0) <= (Number(item.minimumStock) || 0))

    const term = searchTerm.toLowerCase().trim()
    const pName = item.product?.name?.toLowerCase() || ""
    const bName = item.product?.brand?.name?.toLowerCase() || ""
    const matchesSearch = !term || pName.includes(term) || bName.includes(term)

    return matchesTab && matchesSearch
  })

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-150">
          <span className="text-emerald-400 font-black">✓</span> {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900">
            Live Inventory & Physical Stock Register
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Monitor real-time bottle inventory, verify excise TP stock, and apply quick count adjustments
          </p>
        </div>
        <button
          onClick={loadInventory}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
        >
          Refresh Register
        </button>
      </div>

      {/* Metric Quick Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total SKUs</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{inventoryList.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Catalog items tracked</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Physical Stock</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{totalUnits.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-medium">Bottles & units on floor</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Stock Valuation</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">₹{totalValuation.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-medium">At current retail price</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Stock Health</span>
          <p className={`text-lg sm:text-2xl font-black mt-0.5 ${lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {lowStockCount > 0 ? `${lowStockCount} Low Items` : "Healthy"}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">{lowStockCount > 0 ? "Reorder recommended" : "All levels adequate"}</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {/* Filters Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { key: "ALL", label: `All (${inventoryList.length})` },
              { key: "TP", label: `TP Excise (${inventoryList.filter((i) => i.stockType === "TP").length})` },
              { key: "NON_TP", label: `Non-TP (${inventoryList.filter((i) => i.stockType === "NON_TP").length})` },
              { key: "LOW_STOCK", label: `Low Stock (${lowStockCount})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === t.key
                    ? "bg-slate-950 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              placeholder="Search bottle or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Mobile Cards List (Visible on mobile screens < md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading inventory register...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No matching inventory items found.</div>
          ) : (
            filteredList.map((item) => {
              const key = item._id
              const isUpdating = updatingId === key
              const mode = adjustModes[key] || "SET"
              const inputVal = adjustInputs[key] ?? ""
              const isLow = (Number(item.quantity) || 0) <= (Number(item.minimumStock) || 0) && (Number(item.minimumStock) || 0) > 0
              const isZero = (Number(item.quantity) || 0) === 0

              return (
                <div key={key} className="p-3.5 space-y-2.5 bg-white">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs leading-snug">
                        {item.product?.name || "Unknown Product"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.product?.brand?.name || "Standard"} {item.product?.size ? `• ${item.product.size}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.stockType === "TP" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {item.stockType === "TP" ? "TP" : "Non-TP"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-black border ${
                          isZero
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isLow
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-900 border-slate-200"
                        }`}
                      >
                        {item.quantity ?? 0} units
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Selling: <strong className="text-slate-900 font-bold">₹{item.sellingPrice ?? 0}</strong></span>
                    <span>Min Alert: <strong>{item.minimumStock ?? 0}</strong></span>
                  </div>

                  {/* Stock Adjustment Row */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAdjustModes((prev) => ({
                          ...prev,
                          [key]: mode === "SET" ? "ADD" : "SET",
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0"
                    >
                      {mode === "SET" ? "Set Qty" : "+ Add"}
                    </button>

                    <input
                      type="number"
                      placeholder={mode === "SET" ? "New Qty" : "+10 / -5"}
                      value={inputVal}
                      onChange={(e) =>
                        setAdjustInputs((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleAdjustSubmit(item)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-center font-bold focus:outline-none bg-slate-50 focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={() => handleAdjustSubmit(item)}
                      disabled={isUpdating || inputVal === ""}
                      className="px-4 py-1.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-black transition-all disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Inventory Table (Visible on md: and up) */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Product / Brand</th>
                <th className="p-3.5 text-center">Stock Type</th>
                <th className="p-3.5 text-center">Current Stock</th>
                <th className="p-3.5 text-center">Min Threshold</th>
                <th className="p-3.5 text-center">Selling Price</th>
                <th className="p-3.5 text-right w-80">Adjust Stock Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    Loading inventory register...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const key = item._id
                  const isUpdating = updatingId === key
                  const mode = adjustModes[key] || "SET"
                  const inputVal = adjustInputs[key] ?? ""
                  const isLow = (Number(item.quantity) || 0) <= (Number(item.minimumStock) || 0) && (Number(item.minimumStock) || 0) > 0
                  const isZero = (Number(item.quantity) || 0) === 0

                  return (
                    <tr key={key} className="hover:bg-slate-50 transition-colors">
                      {/* Product Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.product?.name || "Unknown Product"}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.product?.brand?.name || "Standard"} {item.product?.size ? `• ${item.product.size}` : ""}
                        </div>
                      </td>

                      {/* Stock Type */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            item.stockType === "TP" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {item.stockType === "TP" ? "TP" : "Non-TP"}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-black border ${
                            isZero
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isLow
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-900 border-slate-200"
                          }`}
                        >
                          {item.quantity ?? 0} units
                        </span>
                      </td>

                      {/* Min Threshold */}
                      <td className="p-3.5 text-center text-slate-600 font-medium">
                        {item.minimumStock ?? 0}
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 text-center font-bold text-slate-900">
                        ₹{item.sellingPrice ?? 0}
                      </td>

                      {/* Action Controls */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustModes((prev) => ({
                                ...prev,
                                [key]: mode === "SET" ? "ADD" : "SET",
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                            title="Toggle between Set New Stock or Add/Deduct Stock"
                          >
                            {mode === "SET" ? "Set Qty" : "+ Add"}
                          </button>

                          <input
                            type="number"
                            placeholder={mode === "SET" ? "New Qty" : "+10 / -5"}
                            value={inputVal}
                            onChange={(e) =>
                              setAdjustInputs((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => e.key === "Enter" && handleAdjustSubmit(item)}
                            className="w-24 px-2.5 py-1.5 border border-slate-200 focus:border-slate-900 rounded-lg text-xs text-center font-bold focus:outline-none bg-slate-50 focus:bg-white transition-all"
                          />

                          <button
                            type="button"
                            onClick={() => handleAdjustSubmit(item)}
                            disabled={isUpdating || inputVal === ""}
                            className="px-3.5 py-1.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-lg text-xs font-black transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                          >
                            {isUpdating ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}