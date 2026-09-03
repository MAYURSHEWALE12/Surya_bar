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
      const tax = subtotal * 0.10 // 10% Liquor VAT (Government excise/commercial norm)
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

  const handlePrintPurchaseInvoice = (pur) => {
    const printWindow = window.open("", "_blank", "width=800,height=900")
    if (!printWindow) {
      alert("Please allow popups to print invoices")
      return
    }

    const items = pur.items || []
    const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || (Number(item.quantity) * Number(item.purchasePrice || 0))), 0)
    const vat = subtotal * 0.10
    const grandTotal = pur.grandTotal || (subtotal + vat)
    const dateStr = new Date(pur.createdAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    const vendorName = pur.vendor?.name || pur.vendorName || "Direct / Open Market"
    const vendorGstin = pur.vendor?.gstin || "N/A"
    const vendorPhone = pur.vendor?.phone || "N/A"

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Tax Invoice - ${pur.invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #0f172a; background: #fff; font-size: 13px; }
            .invoice-box { max-width: 750px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
            .badge { display: inline-block; padding: 3px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
            .card h4 { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
            .card p { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #0f172a; color: #fff; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
            tr:last-child td { border-bottom: 2px solid #e2e8f0; }
            .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; background: #e0e7ff; color: #3730a3; }
            .tag-non-tp { background: #f3e8ff; color: #6b21a8; }
            .totals-container { display: flex; justify-content: flex-end; margin-bottom: 20px; }
            .totals-table { width: 320px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
            .totals-row.grand { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 10px 0; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 6px; }
            .footer { border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 0; background: #fff; }
              .invoice-box { border: none; box-shadow: none; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div>
                <div class="title">SURYA BAR & RESTAURANT</div>
                <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Inward Goods Procurement & Restock Receipt</div>
                <div class="badge">Inward Stock Voucher</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 15px; font-weight: 900; font-family: monospace; color: #0f172a;">#${pur.invoiceNumber}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${dateStr}</div>
                <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">Status: ${pur.status || "RECEIVED"}</div>
              </div>
            </div>

            <div class="meta-grid">
              <div class="card">
                <h4>Vendor / Distributor Details</h4>
                <p><strong>${vendorName}</strong></p>
                <p style="font-size: 11px; color: #64748b; margin-top: 2px;">GSTIN: ${vendorGstin} | Ph: ${vendorPhone}</p>
                <p style="font-size: 11px; color: #64748b;">Payment Mode: <strong style="color: #0f172a; text-transform: uppercase;">${pur.paymentMethod || "CASH"}</strong></p>
              </div>
              <div class="card">
                <h4>Consignee / Destination</h4>
                <p><strong>SURYA BAR & RESTAURANT</strong></p>
                <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Main Bar & Resto Parlour Cellar</p>
                <p style="font-size: 11px; color: #64748b;">Excise Channel: <strong style="color: #0f172a;">TP & Commercial Trade</strong></p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th>Item / Bottle Description</th>
                  <th style="text-align: center;">Channel</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Cost / Bottle</th>
                  <th style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((it, i) => `
                  <tr>
                    <td style="text-align: center; color: #94a3b8; font-weight: 700;">${i + 1}</td>
                    <td>
                      <strong style="color: #0f172a;">${it.product?.name || it.productName || "Liquor Item"}</strong>
                      <div style="font-size: 10px; color: #64748b;">${it.size || it.product?.size || "750ml"}</div>
                    </td>
                    <td style="text-align: center;">
                      <span class="tag ${it.stockType === "NON_TP" ? "tag-non-tp" : ""}">${it.stockType}</span>
                    </td>
                    <td style="text-align: right; font-weight: 800; color: #0f172a;">${it.quantity}</td>
                    <td style="text-align: right; font-weight: 600;">₹${Number(it.purchasePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align: right; font-weight: 800; color: #0f172a;">₹${(Number(it.total) || (Number(it.quantity) * Number(it.purchasePrice || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="totals-container">
              <div class="totals-table">
                <div class="totals-row">
                  <span>Inward Subtotal:</span>
                  <span style="font-weight: 700; color: #0f172a;">₹${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="totals-row">
                  <span>Liquor VAT (10%):</span>
                  <span style="font-weight: 700; color: #0f172a;">₹${vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="totals-row grand">
                  <span>Grand Total:</span>
                  <span>₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>Generated by Surya Bar & Resto ERP • Authorized Inward Stock Document</p>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
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
                  <div className="text-slate-600">Liquor VAT (10%): <span className="font-bold text-slate-900">₹{(calculateSubtotal() * 0.10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="text-sm sm:text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                    Grand Total: ₹{(calculateSubtotal() * 1.10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                
                <button
                  type="button"
                  onClick={() => handlePrintPurchaseInvoice(pur)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>Print Tax Invoice</span>
                </button>
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
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
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
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handlePrintPurchaseInvoice(pur)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                        title="Print Inward Tax Invoice"
                      >
                        <span>🖨️</span>
                        <span>Invoice</span>
                      </button>
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
