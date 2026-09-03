import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from "react"
import { useAuthStore } from "../store/authStore"
import { exportStyledAnalyticsExcel } from "../utils/excelExport"
import CustomSelect from "../components/CustomSelect"

export default function Reports() {
  const { role } = useAuthStore()
  const [activeTab, setActiveTab] = useState("SALES") // SALES, INVENTORY, PURCHASES, FINANCIAL, COMPLIANCE
  const [dateFilter, setDateFilter] = useState("ALL") // TODAY, YESTERDAY, 7_DAYS, 30_DAYS, ALL
  const [loading, setLoading] = useState(true)

  const [sales, setSales] = useState([])
  const [inventory, setInventory] = useState([])
  const [purchases, setPurchases] = useState([])
  const [vendors, setVendors] = useState([])

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const headers = { Authorization: `Bearer ${token}` }

      const [salesRes, invRes, purRes, vendRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/sales`, { headers }),
        fetch(`${API_BASE_URL}/api/inventory`, { headers }),
        fetch(`${API_BASE_URL}/api/purchases`, { headers }),
        fetch(`${API_BASE_URL}/api/vendors`, { headers }),
      ])

      const salesData = await salesRes.json()
      const invData = await invRes.json()
      const purData = await purRes.json()
      const vendData = await vendRes.json()

      setSales(Array.isArray(salesData) ? salesData : [])
      setInventory(Array.isArray(invData) ? invData : [])
      setPurchases(Array.isArray(purData) ? purData : [])
      setVendors(Array.isArray(vendData) ? vendData : [])
    } catch (err) {
      console.error("Error loading reports data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Filter Sales based on Date Range
  const filteredSales = useMemo(() => {
    const now = new Date()
    return sales.filter((s) => {
      if (dateFilter === "ALL") return true
      const d = new Date(s.createdAt)
      if (dateFilter === "TODAY") {
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      } else if (dateFilter === "YESTERDAY") {
        const yest = new Date()
        yest.setDate(now.getDate() - 1)
        return (
          d.getDate() === yest.getDate() &&
          d.getMonth() === yest.getMonth() &&
          d.getFullYear() === yest.getFullYear()
        )
      } else if (dateFilter === "7_DAYS") {
        const past = new Date()
        past.setDate(now.getDate() - 7)
        return d >= past
      } else if (dateFilter === "30_DAYS") {
        const past = new Date()
        past.setDate(now.getDate() - 30)
        return d >= past
      } else if (dateFilter === "YEARLY") {
        const past = new Date()
        past.setDate(now.getDate() - 365)
        return d >= past
      }
      return true
    })
  }, [sales, dateFilter])

  // Filter Purchases based on Date Range
  const filteredPurchases = useMemo(() => {
    const now = new Date()
    return purchases.filter((p) => {
      if (dateFilter === "ALL") return true
      const d = new Date(p.createdAt)
      if (dateFilter === "TODAY") {
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      } else if (dateFilter === "YESTERDAY") {
        const yest = new Date()
        yest.setDate(now.getDate() - 1)
        return (
          d.getDate() === yest.getDate() &&
          d.getMonth() === yest.getMonth() &&
          d.getFullYear() === yest.getFullYear()
        )
      } else if (dateFilter === "7_DAYS") {
        const past = new Date()
        past.setDate(now.getDate() - 7)
        return d >= past
      } else if (dateFilter === "30_DAYS") {
        const past = new Date()
        past.setDate(now.getDate() - 30)
        return d >= past
      } else if (dateFilter === "YEARLY") {
        const past = new Date()
        past.setDate(now.getDate() - 365)
        return d >= past
      }
      return true
    })
  }, [purchases, dateFilter])

  // Calculated Metrics
  const metrics = useMemo(() => {
    let salesRev = 0
    let grossRev = 0
    let totalDiscount = 0
    let tpSales = 0
    let nonTpSales = 0
    let tpUnitsSold = 0
    let nonTpUnitsSold = 0

    filteredSales.forEach((s) => {
      if (s.status !== "VOIDED") {
        salesRev += s.grandTotal || 0
        grossRev += s.subtotal || (s.grandTotal + (s.discount || 0))
        totalDiscount += s.discount || 0
        s.items?.forEach((item) => {
          if (item.stockType === "TP") {
            tpSales += item.total || 0
            tpUnitsSold += item.quantity || 0
          } else {
            nonTpSales += item.total || 0
            nonTpUnitsSold += item.quantity || 0
          }
        })
      }
    })

    let purchaseTotal = 0
    filteredPurchases.forEach((p) => {
      purchaseTotal += p.grandTotal || 0
    })

    let totalStockVal = 0
    let tpStockVal = 0
    let nonTpStockVal = 0
    let totalBottles = 0
    let lowStockCount = 0

    inventory.forEach((inv) => {
      const qty = inv.quantity || 0
      const price = inv.sellingPrice || inv.purchasePrice || 0
      const val = qty * price
      totalStockVal += val
      totalBottles += qty

      if (inv.stockType === "TP") {
        tpStockVal += val
      } else {
        nonTpStockVal += val
      }

      if (qty <= 5) lowStockCount++
    })

    const grossProfit = Math.max(0, salesRev - purchaseTotal * 0.6)

    return {
      salesRev,
      grossRev,
      totalDiscount,
      tpSales,
      nonTpSales,
      tpUnitsSold,
      nonTpUnitsSold,
      totalUnitsSold: tpUnitsSold + nonTpUnitsSold,
      purchaseTotal,
      totalStockVal,
      tpStockVal,
      nonTpStockVal,
      totalBottles,
      lowStockCount,
      grossProfit,
      ordersCount: filteredSales.filter((s) => s.status !== "VOIDED").length,
    }
  }, [filteredSales, filteredPurchases, inventory])

  // Handle Export to Excel
  const handleExport = async () => {
    const kpiMetrics = [
      { label: "Report Type", stockType: activeTab, value: `${activeTab} REPORT`, note: `Period: ${dateFilter}` },
      { label: "Net Sales Turnover", stockType: "All Categories", value: `₹ ${metrics.salesRev.toLocaleString()}`, note: `${metrics.ordersCount} receipts` },
      { label: "Total Discounts Given", stockType: "All Categories", value: `₹ ${metrics.totalDiscount.toLocaleString()}`, note: "Promotions & waivers" },
      { label: "TP Liquor Sales", stockType: "TP Stock", value: `₹ ${metrics.tpSales.toLocaleString()}`, note: `${metrics.tpUnitsSold} bottles` },
      { label: "Non-TP Liquor Sales", stockType: "Non-TP Stock", value: `₹ ${metrics.nonTpSales.toLocaleString()}`, note: `${metrics.nonTpUnitsSold} bottles` },
      { label: "Inward Stock Cost", stockType: "Purchases", value: `₹ ${metrics.purchaseTotal.toLocaleString()}`, note: `${filteredPurchases.length} invoices` },
      { label: "Live Stock Valuation", stockType: "Inventory", value: `₹ ${metrics.totalStockVal.toLocaleString()}`, note: `${metrics.totalBottles} bottles in stock` },
    ]

    const inventoryList = inventory.map((inv) => ({
      productName: inv.product?.name || "Bottle",
      size: inv.product?.size || "",
      stockType: inv.stockType,
      quantity: inv.quantity || 0,
      price: inv.sellingPrice || inv.purchasePrice || 0,
    }))

    const salesLog = []
    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        salesLog.push({
          invoiceNumber: sale.invoiceNumber || sale.billNumber || "-",
          date: new Date(sale.createdAt).toLocaleString(),
          productName: item.productName || item.product?.name || "Item",
          stockType: item.stockType,
          quantity: item.quantity,
          price: item.price || item.unitPrice,
          total: item.total,
          discount: sale.discount || 0,
          paymentMethod: sale.paymentMethod || "CASH",
        })
      })
    })

    const topProducts = [
      { name: "TP Liquor", quantity: metrics.tpUnitsSold, revenue: metrics.tpSales, stockType: "TP Stock" },
      { name: "Non-TP Liquor", quantity: metrics.nonTpUnitsSold, revenue: metrics.nonTpSales, stockType: "Non-TP Stock" },
    ]

    await exportStyledAnalyticsExcel({
      reportTitle: `SURYA BAR - ${activeTab} REPORT`,
      stockTypeName: `${activeTab} Summary`,
      themeColor: activeTab === "INVENTORY" ? "065F46" : activeTab === "PURCHASES" ? "92400E" : "1E3A8A",
      accentColor: "2563EB",
      metrics: kpiMetrics,
      topProducts,
      inventoryList,
      salesLog,
      filename: `SuryaBar_Report_${activeTab}`,
    })
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold text-xs">Loading reports data...</div>
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Executive Business Reports
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Audit bar revenue, live stock valuation, distributor procurement ledgers, and compliance registers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Date Range Picker */}
          <div className="w-full sm:w-44">
            <CustomSelect
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Time" },
                { value: "TODAY", label: "Today (Daily)" },
                { value: "YESTERDAY", label: "Yesterday" },
                { value: "7_DAYS", label: "Last 7 Days (Weekly)" },
                { value: "30_DAYS", label: "Last 30 Days (Monthly)" },
                { value: "YEARLY", label: "This Year (Yearly)" },
              ]}
              placeholder="All Time"
              searchable={false}
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            Download Report (.xlsx)
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Gross Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Sales Turnover</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-black">Total</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.salesRev.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-600 mt-1 sm:mt-2">
            {metrics.ordersCount} orders • {metrics.totalUnitsSold} btls
          </p>
        </div>

        {/* Live Inventory */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Stock Valuation</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black">Live</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.totalStockVal.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-emerald-700 mt-1 sm:mt-2">
            {metrics.totalBottles.toLocaleString()} bottles in inventory
          </p>
        </div>

        {/* Non-TP Revenue */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Non-TP Commercial</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-black">Non-TP</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.nonTpSales.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-purple-700 mt-1 sm:mt-2">
            {metrics.nonTpUnitsSold.toLocaleString()} bottles sold
          </p>
        </div>

        {/* Purchases */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Procurement Spend</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-black">Inward</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{Math.round(metrics.purchaseTotal).toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-600 mt-1 sm:mt-2">
            {filteredPurchases.length} shipments logged
          </p>
        </div>
      </div>

      {/* Report Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "SALES", label: "Sales Register", count: filteredSales.length },
          { id: "INVENTORY", label: "Stock Valuation", count: inventory.length },
          { id: "PURCHASES", label: "Inward Procurement", count: filteredPurchases.length },
          { id: "COMPLIANCE", label: "Excise Compliance", count: "TP / Non-TP" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? "bg-slate-950 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${activeTab === tab.id ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-600"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: SALES REPORT */}
      {activeTab === "SALES" && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-black text-slate-900 text-xs sm:text-sm">Customer Sales Register</h3>
            <span className="text-xs font-semibold text-slate-500">{filteredSales.length} bills recorded</span>
          </div>

          {/* Mobile Sales Cards */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredSales.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No sales records for selected period.</div>
            ) : (
              filteredSales.map((s) => {
                const tp = s.items?.reduce((sum, i) => (i.stockType === "TP" ? sum + (i.total || 0) : sum), 0) || 0
                const nonTp = s.items?.reduce((sum, i) => (i.stockType === "NON_TP" ? sum + (i.total || 0) : sum), 0) || 0
                return (
                  <div key={s._id} className="p-3.5 space-y-2 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-black text-xs text-slate-900">{s.invoiceNumber || `#${s._id.slice(-6)}`}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(s.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${s.status === "VOIDED" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                        {s.status || "PAID"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl space-y-1 text-xs text-slate-700 border border-slate-100">
                      {s.items?.map((i, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${i.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                              {i.stockType === "NON_TP" ? "N-TP" : "TP"}
                            </span>
                            <span className="truncate font-medium">{i.productName || "Item"}</span>
                          </div>
                          <span className="font-black text-slate-900 shrink-0">× {i.quantity} (₹{i.total})</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded border border-slate-200">
                          {s.paymentMethod || "CASH"}
                        </span>
                        {tp > 0 && <span className="text-[10px] font-bold text-slate-700">TP: ₹{tp}</span>}
                        {nonTp > 0 && <span className="text-[10px] font-bold text-slate-700">N-TP: ₹{nonTp}</span>}
                      </div>
                      <span className="font-black text-sm text-slate-900">₹{s.grandTotal?.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Sales Table */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3.5 text-left">Bill #</th>
                  <th className="p-3.5 text-left">Date & Time</th>
                  <th className="p-3.5 text-left">Items Sold</th>
                  <th className="p-3.5 text-right">TP Amt</th>
                  <th className="p-3.5 text-right">Non-TP Amt</th>
                  <th className="p-3.5 text-right">Discount</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5 text-center">Payment</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400">
                      No sales records for selected period.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => {
                    const tp = s.items?.reduce((sum, i) => (i.stockType === "TP" ? sum + (i.total || 0) : sum), 0) || 0
                    const nonTp = s.items?.reduce((sum, i) => (i.stockType === "NON_TP" ? sum + (i.total || 0) : sum), 0) || 0
                    return (
                      <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold font-mono text-slate-900">{s.invoiceNumber || `#${s._id.slice(-4)}`}</td>
                        <td className="p-3.5 text-slate-600">{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="p-3.5">
                          <div className="space-y-1 max-w-sm">
                            {s.items?.map((i, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${i.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                  {i.stockType === "NON_TP" ? "Non-TP" : "TP"}
                                </span>
                                <span className="font-medium text-slate-800">{i.productName || "Item"}</span>
                                <strong className="text-slate-900 font-bold ml-auto">× {i.quantity}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-800">
                          {tp > 0 ? `₹${tp.toLocaleString()}` : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-800">
                          {nonTp > 0 ? `₹${nonTp.toLocaleString()}` : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3.5 text-right font-bold text-rose-600">
                          {s.discount > 0 ? `-₹${s.discount.toLocaleString()}` : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 text-sm">₹{s.grandTotal?.toLocaleString()}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-bold rounded text-[10px] uppercase">
                            {s.paymentMethod || "CASH"}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded border font-black text-[10px] ${s.status === "VOIDED" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                            {s.status || "PAID"}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: INVENTORY VALUATION */}
      {activeTab === "INVENTORY" && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-black text-slate-900 text-xs sm:text-sm">Live Stock Valuation & Storage Register</h3>
            <span className="text-xs text-slate-900 font-black">Cellar Total: ₹{metrics.totalStockVal.toLocaleString()}</span>
          </div>

          {/* Mobile Inventory Cards */}
          <div className="block md:hidden divide-y divide-slate-100">
            {inventory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No inventory records found.</div>
            ) : (
              inventory.map((inv) => {
                const qty = inv.quantity || 0
                const price = inv.sellingPrice || inv.purchasePrice || 0
                const val = qty * price
                return (
                  <div key={inv._id} className="p-3.5 space-y-2 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-xs text-slate-900">{inv.product?.name || "Bottle"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">{inv.product?.size || "-"}</span>
                          <span className={`px-1.5 py-0.2 rounded font-black text-[9px] ${inv.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                            {inv.stockType === "NON_TP" ? "Non-TP" : "TP"}
                          </span>
                        </div>
                      </div>
                      {qty === 0 ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 font-black rounded text-[9px]">Out of Stock</span>
                      ) : qty <= 5 ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-black rounded text-[9px]">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-black rounded text-[9px]">Healthy</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <span>Stock: <strong className="text-slate-900 font-black">{qty}</strong></span>
                        <span>@ ₹{price}</span>
                      </div>
                      <span className="font-black text-slate-900">Val: ₹{val.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Inventory Table */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3.5 text-left">Bottle Name</th>
                  <th className="p-3.5 text-center">Size</th>
                  <th className="p-3.5 text-center">Category</th>
                  <th className="p-3.5 text-right">Stock in Hand</th>
                  <th className="p-3.5 text-right">Selling Price</th>
                  <th className="p-3.5 text-right">Total Valuation</th>
                  <th className="p-3.5 text-center">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  inventory.map((inv) => {
                    const qty = inv.quantity || 0
                    const price = inv.sellingPrice || inv.purchasePrice || 0
                    const val = qty * price
                    return (
                      <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{inv.product?.name || "Bottle"}</td>
                        <td className="p-3.5 text-center text-slate-500">{inv.product?.size || "-"}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${inv.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                            {inv.stockType === "NON_TP" ? "Non-TP" : "TP"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">{qty}</td>
                        <td className="p-3.5 text-right text-slate-700 font-medium">₹{price}</td>
                        <td className="p-3.5 text-right font-black text-slate-900">₹{val.toLocaleString()}</td>
                        <td className="p-3.5 text-center">
                          {qty === 0 ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 font-black rounded text-[10px]">Out of Stock</span>
                          ) : qty <= 5 ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-black rounded text-[10px]">Low Stock</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-black rounded text-[10px]">Healthy ({qty})</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PURCHASES REGISTER */}
      {activeTab === "PURCHASES" && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-black text-slate-900 text-xs sm:text-sm">Inward Distributor Procurement Ledger</h3>
            <span className="text-xs text-slate-900 font-black">Inward: ₹{Math.round(metrics.purchaseTotal).toLocaleString()}</span>
          </div>

          {/* Mobile Purchases Cards */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredPurchases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No inward purchase invoices found for this period.</div>
            ) : (
              filteredPurchases.map((p) => (
                <div key={p._id} className="p-3.5 space-y-2 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-black text-xs text-slate-900">{p.invoiceNumber}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{new Date(p.createdAt).toLocaleDateString()} • {p.vendor?.name || "Supplier"}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 font-bold rounded text-[10px] text-slate-800 border border-slate-200">
                      {p.paymentMethod || "CASH"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs text-slate-700 border border-slate-100">
                    {p.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${item.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                            {item.stockType === "NON_TP" ? "N-TP" : "TP"}
                          </span>
                          <span className="truncate font-medium">{item.product?.name || item.productName || "Item"}</span>
                        </div>
                        <span className="font-black text-slate-900 shrink-0">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1 border-t border-slate-100">
                    <span className="text-xs font-black text-slate-900">
                      Total: ₹{Math.round(p.grandTotal || p.subtotal || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Purchases Table */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3.5 text-left">Invoice #</th>
                  <th className="p-3.5 text-left">Date</th>
                  <th className="p-3.5 text-left">Vendor / Firm</th>
                  <th className="p-3.5 text-left">Bottles Inwarded</th>
                  <th className="p-3.5 text-center">Payment</th>
                  <th className="p-3.5 text-right">Grand Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No inward purchase invoices found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-slate-900">{p.invoiceNumber}</td>
                      <td className="p-3.5 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 font-bold text-slate-800">{p.vendor?.name || "Direct Supplier"}</td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {p.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${item.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                {item.stockType === "NON_TP" ? "Non-TP" : "TP"}
                              </span>
                              <span className="font-medium text-slate-800">{item.product?.name || item.productName || "Item"}</span>
                              <strong className="text-slate-900 font-bold ml-auto">× {item.quantity}</strong>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-bold rounded text-[10px] uppercase">
                          {p.paymentMethod || "CASH"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900 text-sm">
                        ₹{Math.round(p.grandTotal || p.subtotal || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: COMPLIANCE TP vs Non-TP */}
      {activeTab === "COMPLIANCE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/90 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">TP Regulated Excise Stock</h3>
                <p className="text-xs text-slate-500">Government permit quota & regulated distributor supply</p>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-black text-[10px]">TP Stock</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">TP Sales Revenue:</span>
                <strong className="text-slate-950 font-black text-sm">₹{metrics.tpSales.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">TP Bottles Dispatched:</span>
                <strong className="text-slate-900 font-bold">{metrics.tpUnitsSold} Bottles</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Live TP Cellar Valuation:</span>
                <strong className="text-emerald-700 font-bold">₹{metrics.tpStockVal.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Bar Revenue Contribution:</span>
                <strong className="text-slate-950 font-black">
                  {metrics.salesRev > 0 ? ((metrics.tpSales / metrics.salesRev) * 100).toFixed(1) : 0}%
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/90 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">Non-TP Commercial Trade Stock</h3>
                <p className="text-xs text-slate-500">Open market procurement, cigarettes, snacks & beverages</p>
              </div>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-black text-[10px]">Non-TP Stock</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Non-TP Sales Revenue:</span>
                <strong className="text-slate-950 font-black text-sm">₹{metrics.nonTpSales.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Non-TP Units Dispatched:</span>
                <strong className="text-slate-900 font-bold">{metrics.nonTpUnitsSold} Units</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Live Non-TP Stock Valuation:</span>
                <strong className="text-emerald-700 font-bold">₹{metrics.nonTpStockVal.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Bar Revenue Contribution:</span>
                <strong className="text-slate-950 font-black">
                  {metrics.salesRev > 0 ? ((metrics.nonTpSales / metrics.salesRev) * 100).toFixed(1) : 0}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}