import { API_BASE_URL } from "../config/api"
import React, { useState, useEffect, useMemo } from "react"
import { useAuthStore } from "../store/authStore"
import CustomSelect from "../components/CustomSelect"

export default function MySales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState("TODAY") // "TODAY" | "YESTERDAY" | "WEEKLY" | "ALL"
  const [paymentFilter, setPaymentFilter] = useState("ALL")
  const [staffFilter, setStaffFilter] = useState("ALL") // "ALL" | "MINE"
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSale, setSelectedSale] = useState(null)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchMySales()
  }, [])

  const fetchMySales = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setSales(data)
      }
    } catch (err) {
      console.error("Error fetching sales:", err)
    } finally {
      setLoading(false)
    }
  }

  // Time-filtered sales
  const timeFilteredSales = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 86400000
    const weekStart = todayStart - 6 * 86400000

    return sales.filter((s) => {
      if (staffFilter === "MINE" && (user?._id || user?.id)) {
        const cashierId = s.cashier?._id || s.cashier?.id || s.cashier
        const currentUserId = user._id || user.id
        if (String(cashierId) !== String(currentUserId)) return false
      }

      if (timeFilter === "ALL") return true
      const saleTime = new Date(s.createdAt).getTime()
      if (timeFilter === "TODAY") return saleTime >= todayStart
      if (timeFilter === "YESTERDAY") return saleTime >= yesterdayStart && saleTime < todayStart
      if (timeFilter === "WEEKLY") return saleTime >= weekStart
      return true
    })
  }, [sales, timeFilter, staffFilter, user])

  // Fully-filtered sales (with search & payment)
  const filteredSales = useMemo(() => {
    return timeFilteredSales.filter((s) => {
      if (s.status === "VOIDED") return false

      if (paymentFilter !== "ALL") {
        if (paymentFilter === "BORROW") {
          if (s.paymentMethod !== "BORROW" && s.paymentMethod !== "CREDIT") return false
        } else if (s.paymentMethod !== paymentFilter) {
          return false
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const invMatch = s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(term)
        const custMatch =
          (s.customerName && s.customerName.toLowerCase().includes(term)) ||
          (s.customerPhone && s.customerPhone.includes(term))
        const itemMatch = s.items && s.items.some((it) => it.productName?.toLowerCase().includes(term))
        if (!invMatch && !custMatch && !itemMatch) return false
      }

      return true
    })
  }, [timeFilteredSales, paymentFilter, searchTerm])

  // Shift & Revenue KPI Calculations
  const metrics = useMemo(() => {
    let grossTotal = 0
    let totalDiscount = 0
    let netTotal = 0
    let cashTotal = 0
    let upiTotal = 0
    let cardTotal = 0
    let borrowTotal = 0
    let totalBottles = 0
    let ordersCount = 0

    timeFilteredSales.forEach((s) => {
      if (s.status === "VOIDED") return
      ordersCount += 1
      const amt = Number(s.grandTotal) || 0
      const disc = Number(s.discount) || 0
      const sub = Number(s.subtotal) || amt + disc

      grossTotal += sub
      totalDiscount += disc
      netTotal += amt

      if (s.paymentMethod === "CASH") cashTotal += amt
      else if (s.paymentMethod === "UPI") upiTotal += amt
      else if (s.paymentMethod === "CARD") cardTotal += amt
      else if (s.paymentMethod === "BORROW" || s.paymentMethod === "CREDIT") borrowTotal += amt

      if (Array.isArray(s.items)) {
        s.items.forEach((it) => {
          totalBottles += Number(it.quantity) || 1
        })
      }
    })

    return {
      grossTotal,
      totalDiscount,
      netTotal,
      cashTotal,
      upiTotal,
      cardTotal,
      borrowTotal,
      totalBottles,
      ordersCount,
    }
  }, [timeFilteredSales])

  const handlePrintReceipt = (sale) => {
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (!printWindow) {
      alert("Please allow popups to print receipts")
      return
    }

    const items = sale.items || []
    const dateFormatted = new Date(sale.createdAt || Date.now()).toLocaleString("en-IN")

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale.invoiceNumber}</title>
          <style>
            body { font-family: monospace; padding: 15px; font-size: 12px; color: #000; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">SURYA BAR & RESTAURANT</div>
          <div class="center">BAR & RESTO PARLOUR</div>
          <div class="divider"></div>
          <div class="row"><span>Date:</span><span>${dateFormatted}</span></div>
          <div class="row bold"><span>Bill No:</span><span>#${sale.invoiceNumber}</span></div>
          <div class="row"><span>Pay Mode:</span><span>${sale.paymentMethod || "CASH"}</span></div>
          <div class="row"><span>Cashier:</span><span>${sale.cashier?.name || user?.name || "Cashier"}</span></div>
          ${
            sale.customerName
              ? `<div class="row bold"><span>Customer:</span><span>${sale.customerName} (${sale.customerPhone || ""})</span></div>`
              : ""
          }
          <div class="divider"></div>
          <div class="row bold"><span>ITEM</span><span>QTY</span><span>AMT</span></div>
          <div class="divider"></div>
          ${items
            .map(
              (it) =>
                `<div class="row"><span>${it.productName || it.product?.name || "Item"}</span><span>${it.quantity}</span><span>Rs.${it.total}</span></div>`
            )
            .join("")}
          <div class="divider"></div>
          ${sale.discount > 0 ? `<div class="row"><span>Discount:</span><span>- Rs.${sale.discount}</span></div>` : ""}
          <div class="row bold" style="font-size: 14px;"><span>GRAND TOTAL:</span><span>Rs.${sale.grandTotal}</span></div>
          <div class="divider"></div>
          <div class="center">THANK YOU! VISIT AGAIN</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">Counter Sales Register</h2>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-black uppercase">
              {user?.name || "Cashier"}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Audit counter sales, track cash drawer collections & monitor borrow (khata) bills
          </p>
        </div>

        {/* Filter Controls (Staff & Date) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Staff Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setStaffFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                staffFilter === "ALL"
                  ? "bg-white text-slate-950 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Counter Bills
            </button>
            <button
              onClick={() => setStaffFilter("MINE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                staffFilter === "MINE"
                  ? "bg-white text-slate-950 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Terminal Only
            </button>
          </div>

          {/* Shift Date Filter Controls */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {[
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "WEEKLY", label: "Last 7 Days" },
              { id: "ALL", label: "All Time" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timeFilter === tab.id
                    ? "bg-white text-slate-950 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Command Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Net Shift Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Shift Revenue</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black uppercase">Turnover</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.netTotal.toLocaleString()}
          </p>
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            <span>{metrics.ordersCount} total bills</span>
            <span>{metrics.totalBottles} bottles</span>
          </div>
        </div>

        {/* Physical Cash in Drawer */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Cash in Drawer</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-black uppercase">Drawer Cash</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-blue-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.cashTotal.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            Physical cash to hand over
          </p>
        </div>

        {/* Digital Collections (UPI & Card) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Digital (UPI & Card)</span>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md text-[10px] font-black uppercase">Online</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-purple-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{(metrics.upiTotal + metrics.cardTotal).toLocaleString()}
          </p>
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            <span>UPI: ₹{metrics.upiTotal.toLocaleString()}</span>
            <span>Card: ₹{metrics.cardTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Credit / Borrowed Bills */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Credit / Khata Bills</span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-black uppercase">Borrow</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.borrowTotal.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            Billed to customer khata tabs
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, customer, bottle..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-xs"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Payment Filter Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "All Modes" },
            { id: "CASH", label: "Cash" },
            { id: "UPI", label: "UPI" },
            { id: "CARD", label: "Card" },
            { id: "BORROW", label: "Borrow (Khata)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPaymentFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                paymentFilter === tab.id
                  ? "bg-white text-slate-950 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm">Shift Sales Invoices</h3>
          <span className="text-xs font-semibold text-slate-500">{filteredSales.length} bills</span>
        </div>

        {/* Mobile List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">No sales bills found for this filter.</div>
          ) : (
            filteredSales.map((s) => (
              <div key={s._id} className="p-4 space-y-2.5 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-black text-xs text-slate-900">#{s.invoiceNumber}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-950">₹{s.grandTotal}</span>
                    <span className={`block text-[10px] font-black uppercase ${
                      s.paymentMethod === "BORROW" || s.paymentMethod === "CREDIT"
                        ? "text-amber-700"
                        : s.paymentMethod === "CASH"
                        ? "text-blue-700"
                        : "text-purple-700"
                    }`}>
                      {s.paymentMethod}
                    </span>
                  </div>
                </div>

                {s.customerName && (
                  <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-200/60 text-xs flex justify-between items-center">
                    <span className="font-bold text-amber-950">{s.customerName}</span>
                    <span className="font-mono text-amber-800 text-[11px]">{s.customerPhone}</span>
                  </div>
                )}

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                  {s.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>{it.productName} [{it.stockType}]</span>
                      <span className="font-bold text-slate-900">× {it.quantity} (₹{it.total})</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handlePrintReceipt(s)}
                    className="flex-1 py-2 bg-slate-950 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Reprint Receipt</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (md:) */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Time & Date</th>
                <th className="p-3.5 text-left">Invoice #</th>
                <th className="p-3.5 text-left">Items Billed</th>
                <th className="p-3.5 text-left">Customer</th>
                <th className="p-3.5 text-center">Payment Mode</th>
                <th className="p-3.5 text-right">Discount</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                    No sales recorded for this shift.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-slate-600 font-mono">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-black text-slate-900">
                      #{s.invoiceNumber}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="space-y-0.5">
                        {s.items?.slice(0, 2).map((it, idx) => (
                          <div key={idx} className="text-slate-800 truncate">
                            <span className="font-semibold">{it.productName}</span>
                            <span className="text-[10px] text-slate-400 ml-1">×{it.quantity} [{it.stockType}]</span>
                          </div>
                        ))}
                        {s.items?.length > 2 && (
                          <span className="text-[10px] text-slate-400 italic">+{s.items.length - 2} more items</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {s.customerName ? (
                        <div>
                          <span className="font-bold text-amber-950 block">{s.customerName}</span>
                          <span className="font-mono text-[10px] text-amber-700">{s.customerPhone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Walk-in</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase ${
                        s.paymentMethod === "BORROW" || s.paymentMethod === "CREDIT"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : s.paymentMethod === "CASH"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}>
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-semibold text-rose-600">
                      {s.discount > 0 ? `-₹${s.discount}` : "-"}
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="font-black text-sm text-slate-950">₹{s.grandTotal}</span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handlePrintReceipt(s)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        Print
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
