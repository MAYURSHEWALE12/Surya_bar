import { API_BASE_URL } from "../config/api"
import { useState, useEffect } from "react"
import { useStore } from "../store/authStore"
import { getProducts, getVendors } from "../services/api"
import CustomSelect from "../components/CustomSelect"

export default function Purchases() {
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const generateInvoiceNumber = () => {
    const d = new Date()
    const dateStr = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return `PUR-${dateStr}-${randomSuffix}`
  }

  // Form State
  const [formData, setFormData] = useState({
    vendor: "",
    invoiceNumber: generateInvoiceNumber(),
    paymentMethod: "CASH",
    paymentStatus: "PAID",
    notes: "",
    items: [
      { product: "", stockType: "TP", quantity: 1, purchasePrice: 0 },
    ],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      
      const [purRes, prodData, vendRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/purchases`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getProducts(),
        fetch(`${API_BASE_URL}/api/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const purData = await purRes.json()
      const vendData = await vendRes.json()

      setPurchases(Array.isArray(purData) ? purData : [])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setVendors(Array.isArray(vendData) ? vendData : [])
    } catch (err) {
      console.error("Error loading purchases data:", err)
    } finally {
      setLoading(false)
    }
  }

  const showToastMsg = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddVendorPrompt = async () => {
    const name = window.prompt("Enter new vendor name (e.g. KSBC Depot, United Spirits Dist.):")
    if (!name || !name.trim()) return
    try {
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      const newVendor = await res.json()
      if (res.ok) {
        setVendors((prev) => [...prev, newVendor])
        setFormData((prev) => ({ ...prev, vendor: newVendor._id }))
        showToastMsg(`Vendor "${newVendor.name}" created and selected!`)
      } else {
        alert(newVendor.message || "Failed to create vendor")
      }
    } catch (err) {
      alert("Error creating vendor: " + err.message)
    }
  }

  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { product: "", stockType: "TP", quantity: 1, purchasePrice: 0 }],
    }))
  }

  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedItems = [...prev.items]
      updatedItems[index] = { ...updatedItems[index], [field]: value }

      if (field === "product" || field === "stockType") {
        const prodId = field === "product" ? value : updatedItems[index].product
        const sType = field === "stockType" ? value : updatedItems[index].stockType
        const prod = products.find((p) => p._id === prodId)
        if (prod) {
          const autoPrice = sType === "TP" ? prod.tp?.purchasePrice || 0 : prod.nonTp?.purchasePrice || 0
          updatedItems[index].purchasePrice = autoPrice
        }
      }

      return { ...prev, items: updatedItems }
    })
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.purchasePrice) || 0
      return sum + qty * price
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.items.some((i) => !i.product)) {
      alert("Please select a product for all item rows")
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem("surya_bar_token")
      const subtotal = calculateSubtotal()
      const tax = subtotal * 0.18
      const grandTotal = subtotal + tax

      const payload = {
        vendor: formData.vendor || null,
        invoiceNumber: formData.invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes,
        directReceive: true,
        subtotal,
        tax,
        grandTotal,
        items: formData.items.map((i) => ({
          product: i.product,
          stockType: i.stockType,
          quantity: Number(i.quantity) || 1,
          purchasePrice: Number(i.purchasePrice) || 0,
        })),
      }

      const res = await fetch(`${API_BASE_URL}/api/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        showToastMsg("Inward purchase added & stock updated in inventory!")
        setShowForm(false)
        setFormData({
          vendor: "",
          invoiceNumber: generateInvoiceNumber(),
          paymentMethod: "CASH",
          paymentStatus: "PAID",
          notes: "",
          items: [{ product: "", stockType: "TP", quantity: 1, purchasePrice: 0 }],
        })
        await loadData()
      } else {
        alert(data.message || "Failed to create purchase")
      }
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState("")

  const totalPurchaseSpend = purchases.reduce((sum, p) => sum + (Number(p.grandTotal) || Number(p.subtotal) || 0), 0)
  const totalInwardUnits = purchases.reduce((sum, p) => {
    const itemUnits = p.items?.reduce((iSum, item) => iSum + (Number(item.quantity) || 0), 0) || 0
    return sum + itemUnits
  }, 0)
  const uniqueVendorsCount = new Set(purchases.map((p) => p.vendor?._id || p.vendor?.name || p.vendor).filter(Boolean)).size || vendors.length

  const filteredPurchases = purchases.filter((pur) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    const inv = pur.invoiceNumber?.toLowerCase() || ""
    const vName = pur.vendor?.name?.toLowerCase() || ""
    return inv.includes(term) || vName.includes(term)
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
            Inward Stock & Purchase Invoices
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Record wholesale distributor deliveries, update supplier accounts, and restock physical bar inventory
          </p>
        </div>
        <button
          onClick={() => {
            if (!showForm) {
              setFormData((prev) => ({ ...prev, invoiceNumber: generateInvoiceNumber() }))
            }
            setShowForm(!showForm)
          }}
          className="px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          {showForm ? "Cancel / Close Form" : "+ Record Inward Stock"}
        </button>
      </div>

      {/* Inward KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Purchase Cost</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">₹{totalPurchaseSpend.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-medium">Recorded procurement spend</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Invoices Logged</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{purchases.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Distributor shipments</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Inward Units</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{totalInwardUnits.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-medium">Bottles received into stock</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90">
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Active Suppliers</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{uniqueVendorsCount}</p>
          <p className="text-[10px] text-slate-500 font-medium">Registered distributors</p>
        </div>
      </div>

      {/* New Purchase Form Modal / Card */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">Inward Shipment Entry</h3>
              <p className="text-xs text-slate-500">Items added here immediately increase physical inventory stock</p>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Vendor / Distributor
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVendorPrompt}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                  >
                    + New Vendor
                  </button>
                </div>
                <CustomSelect
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  options={vendors}
                  placeholder="Select Vendor (Optional)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Invoice / Bill # *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, invoiceNumber: generateInvoiceNumber() }))}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                  >
                    Auto Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. PUR-20260901-1234"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <CustomSelect
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  options={[
                    { value: "CASH", label: "Cash" },
                    { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT" },
                    { value: "UPI", label: "UPI" },
                    { value: "CHEQUE", label: "Cheque" },
                    { value: "CREDIT", label: "Credit (Pay Later)" },
                  ]}
                  placeholder="Select Payment Method"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-xs sm:text-sm">Inward Bottle Items</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  + Add Item Row
                </button>
              </div>

              {/* Mobile Item Rows (< sm screens) */}
              <div className="block sm:hidden space-y-2.5">
                {formData.items.map((item, idx) => {
                  const itemTotal = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)
                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="absolute right-2 top-2 text-rose-500 hover:text-rose-700 font-black text-xs cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Bottle / Item</label>
                        <CustomSelect
                          value={item.product}
                          onChange={(e) => handleItemChange(idx, "product", e.target.value)}
                          options={products.map((p) => ({
                            value: p._id,
                            label: `${p.name} ${p.size ? `(${p.size})` : ""}`,
                          }))}
                          placeholder="Select Bottle..."
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Type</label>
                          <CustomSelect
                            value={item.stockType}
                            onChange={(e) => handleItemChange(idx, "stockType", e.target.value)}
                            options={[
                              { value: "TP", label: "TP" },
                              { value: "NON_TP", label: "Non-TP" },
                            ]}
                            placeholder="Type"
                            searchable={false}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            className="w-full px-2 py-2 border border-slate-200 focus:border-slate-900 rounded-lg text-xs text-center font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Buy (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.purchasePrice}
                            onChange={(e) => handleItemChange(idx, "purchasePrice", e.target.value)}
                            className="w-full px-2 py-2 border border-slate-200 focus:border-slate-900 rounded-lg text-xs text-center font-bold bg-white"
                          />
                        </div>
                      </div>

                      <div className="text-right text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                        Row Total: ₹{itemTotal.toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Items Table (sm: and up) */}
              <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-visible">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-center w-40">Stock Channel</th>
                      <th className="p-3 text-center w-28">Quantity</th>
                      <th className="p-3 text-center w-32">Purchase Cost (₹)</th>
                      <th className="p-3 text-right w-28">Total</th>
                      <th className="p-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, idx) => {
                      const itemTotal = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)
                      return (
                        <tr key={idx}>
                          <td className="p-2.5">
                            <CustomSelect
                              value={item.product}
                              onChange={(e) => handleItemChange(idx, "product", e.target.value)}
                              options={products.map((p) => ({
                                value: p._id,
                                label: `${p.name} ${p.size ? `(${p.size})` : ""}`,
                              }))}
                              placeholder="Select Bottle..."
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <CustomSelect
                              value={item.stockType}
                              onChange={(e) => handleItemChange(idx, "stockType", e.target.value)}
                              options={[
                                { value: "TP", label: "TP" },
                                { value: "NON_TP", label: "Non-TP" },
                              ]}
                              placeholder="Type"
                              searchable={false}
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                              className="w-full px-2 py-2 border border-slate-200 focus:border-slate-900 rounded-lg text-xs text-center font-bold bg-white"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(idx, "purchasePrice", e.target.value)}
                              className="w-full px-2 py-2 border border-slate-200 focus:border-slate-900 rounded-lg text-xs text-center font-bold bg-white"
                            />
                          </td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            ₹{itemTotal.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-rose-500 hover:text-rose-700 font-black text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Card */}
              <div className="flex justify-end p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-right space-y-1 text-xs">
                  <div className="text-slate-600">Subtotal: <span className="font-bold text-slate-900">₹{calculateSubtotal().toLocaleString()}</span></div>
                  <div className="text-slate-600">Est. GST (18%): <span className="font-bold text-slate-900">₹{(calculateSubtotal() * 0.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="text-sm sm:text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                    Grand Total: ₹{(calculateSubtotal() * 1.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-slate-950 hover:bg-black active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving & Adding to Stock..." : "Confirm & Restock Inventory"}
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

      {/* Purchases History */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          <div>
            <h3 className="font-black text-slate-900 text-xs sm:text-sm">Purchase Invoices History</h3>
            <span className="text-[11px] text-slate-500 font-semibold">{purchases.length} invoices recorded</span>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search invoice # or vendor..."
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

        {/* Mobile History Cards (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading purchase records...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No purchase entries found. Click "+ Record Inward Stock" to inward stock.
            </div>
          ) : (
            filteredPurchases.map((pur) => (
              <div key={pur._id} className="p-3.5 space-y-2 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-black text-xs text-slate-900">{pur.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(pur.createdAt).toLocaleDateString()} • {pur.vendor?.name || "Direct Vendor"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">
                      ₹{pur.grandTotal?.toFixed(2) || pur.subtotal || 0}
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black rounded border border-slate-200">
                      {pur.paymentMethod || "CASH"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs text-slate-700 border border-slate-100">
                  {pur.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-2 font-medium">{item.product?.name || item.productName || "Item"} ({item.stockType})</span>
                      <span className="font-black shrink-0">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop History Table (md: and up) */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Invoice #</th>
                <th className="p-3.5 text-left">Date</th>
                <th className="p-3.5 text-left">Vendor / Supplier</th>
                <th className="p-3.5 text-left">Inward Items Summary</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No purchase entries recorded yet. Click "+ Record Inward Stock" to inward your first shipment.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => (
                  <tr key={pur._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-slate-900">{pur.invoiceNumber}</td>
                    <td className="p-3.5 text-slate-600 text-xs">
                      {new Date(pur.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-slate-800 font-medium">
                      {pur.vendor?.name || "Direct / Open Market"}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-1">
                        {pur.items?.map((item, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{item.product?.name || item.productName || "Item"}</span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                              {item.stockType}
                            </span>
                            <span className="font-bold text-slate-900">× {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded border border-slate-200">
                        {pur.paymentMethod || "CASH"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-md">
                        {pur.status || "RECEIVED"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900">
                      ₹{pur.grandTotal ? Number(pur.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (Number(pur.subtotal) || 0).toLocaleString()}
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
