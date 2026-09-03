import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { exportStyledAnalyticsExcel } from "../utils/excelExport"
import CustomSelect from "../components/CustomSelect"
import { TableSkeleton, Skeleton } from "../components/Skeleton"

export default function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedPayment, setSelectedPayment] = useState("ALL")
  const [selectedStockType, setSelectedStockType] = useState("ALL")
  const [selectedDateRange, setSelectedDateRange] = useState("ALL")
  const [activeModalSale, setActiveModalSale] = useState(null)
  const [voidingId, setVoidingId] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const { user, role } = useAuthStore()

  useEffect(() => {
    fetchSalesData()
  }, [role])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const url =
        role === "ADMIN"
          ? `${API_BASE_URL}/api/sales`
          : `${API_BASE_URL}/api/sales?cashier=${user?._id || ""}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setSales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const [voidConfirmSale, setVoidConfirmSale] = useState(null) // { id, invoiceNumber, grandTotal, items }

  const handleVoidSale = (sale) => {
    setVoidConfirmSale(sale)
  }

  const executeVoidSale = async () => {
    if (!voidConfirmSale) return
    const saleId = voidConfirmSale._id || voidConfirmSale.id
    const invoiceNum = voidConfirmSale.invoiceNumber

    setVoidingId(saleId)
    try {
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/sales/${saleId}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Voided by Admin" }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast(`Invoice #${invoiceNum} has been voided & bottles returned to inventory!`)
        setVoidConfirmSale(null)
        setActiveModalSale(null)
        await fetchSalesData()
      } else {
        alert(data.message || "Failed to void sale")
      }
    } catch (err) {
      alert("Error voiding sale: " + err.message)
    } finally {
      setVoidingId(null)
    }
  }

  const handlePrintReceipt = (sale) => {
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (!printWindow) {
      alert("Please allow popups to print receipts")
      return
    }

    let storedSettings = {}
    try {
      const raw = localStorage.getItem("surya_bar_settings")
      if (raw) storedSettings = JSON.parse(raw)
    } catch (e) {}

    const shopName = storedSettings.shopName || "SURYA BAR & RESTAURANT"
    const address = storedSettings.address || "Main Road, City Center"
    const gstin = storedSettings.showLicenseOnBill !== false && storedSettings.gstin ? storedSettings.gstin : ""
    const receiptSize = storedSettings.receiptSize || "80mm"
    const footerMsg = storedSettings.footerMessage || "Thank You! Visit Again"

    const tpSubtotal = sale.items?.reduce((sum, i) => (i.stockType === "TP" ? sum + (i.total || 0) : sum), 0) || 0
    const nonTpSubtotal = sale.items?.reduce((sum, i) => (i.stockType === "NON_TP" ? sum + (i.total || 0) : sum), 0) || 0

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Surya Bar - Receipt ${sale.invoiceNumber || ""}</title>
        <style>
          @page { size: ${receiptSize} auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${receiptSize};
            margin: 0;
            padding: 8px;
            color: #000;
            font-size: 12px;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .header { margin-bottom: 6px; }
          .header h1 { font-size: 16px; margin: 0; }
          .header p { margin: 2px 0; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; font-size: 11px; }
          td { padding: 3px 0; font-size: 11px; vertical-align: top; }
          .totals-row { display: flex; justify-content: space-between; margin: 2px 0; }
          .grand-total { font-size: 14px; font-weight: bold; margin-top: 4px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; }
          .footer { margin-top: 12px; font-size: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <h1 class="bold">${shopName.toUpperCase()}</h1>
          <p>${address}</p>
          ${gstin ? `<p>Lic / GST: ${gstin}</p>` : ""}
        </div>

        <div class="divider"></div>

        <div>
          <div><strong>Bill No:</strong> ${sale.invoiceNumber || sale.billNumber || `#${sale._id.slice(-6)}`}</div>
          <div><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleString()}</div>
          <div><strong>Cashier:</strong> ${sale.cashier?.name || "Admin"}</div>
          <div><strong>Payment:</strong> ${sale.paymentMethod || "CASH"}</div>
          ${sale.status === "VOIDED" ? '<div style="color:red;font-weight:bold;text-align:center;margin:4px 0;">*** VOIDED BILL ***</div>' : ""}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              ?.map(
                (item) => `
              <tr>
                <td>${item.productName || item.product?.name || "Item"}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">₹${item.price || item.unitPrice}</td>
                <td class="text-right bold">₹${item.total}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="totals-row">
          <span>Subtotal:</span>
          <span>₹${(sale.subtotal || (tpSubtotal + nonTpSubtotal) || sale.grandTotal || 0).toFixed(2)}</span>
        </div>
        ${sale.tax ? `<div class="totals-row"><span>Tax (GST):</span><span>₹${sale.tax.toFixed(2)}</span></div>` : ""}
        ${sale.discount ? `<div class="totals-row"><span>Discount:</span><span>-₹${sale.discount.toFixed(2)}</span></div>` : ""}

        <div class="totals-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>₹${(sale.grandTotal || 0).toFixed(2)}</span>
        </div>

        <div class="footer">
          <p class="bold">*** ${footerMsg.toUpperCase()} ***</p>
          <p>Liquor consumption is injurious to health.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(receiptHtml)
    printWindow.document.close()
  }

  // Filtered Sales Logic
  const filteredSales = useMemo(() => {
    const now = new Date()
    return sales.filter((sale) => {
      // Status Filter
      if (selectedStatus !== "ALL" && sale.status !== selectedStatus) {
        return false
      }

      // Payment Filter
      if (selectedPayment !== "ALL" && (sale.paymentMethod || "CASH") !== selectedPayment) {
        return false
      }

      // Stock Type Filter
      if (selectedStockType === "TP_ONLY") {
        const hasTp = sale.items?.some((i) => i.stockType === "TP")
        const hasNonTp = sale.items?.some((i) => i.stockType === "NON_TP")
        if (!hasTp || hasNonTp) return false
      } else if (selectedStockType === "NON_TP_ONLY") {
        const hasNonTp = sale.items?.some((i) => i.stockType === "NON_TP")
        const hasTp = sale.items?.some((i) => i.stockType === "TP")
        if (!hasNonTp || hasTp) return false
      } else if (selectedStockType === "HAS_TP") {
        if (!sale.items?.some((i) => i.stockType === "TP")) return false
      } else if (selectedStockType === "HAS_NON_TP") {
        if (!sale.items?.some((i) => i.stockType === "NON_TP")) return false
      }

      // Date Range Filter
      if (selectedDateRange !== "ALL") {
        const d = new Date(sale.createdAt)
        if (selectedDateRange === "TODAY") {
          const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          if (!isToday) return false
        } else if (selectedDateRange === "YESTERDAY") {
          const yest = new Date()
          yest.setDate(now.getDate() - 1)
          const isYest =
            d.getDate() === yest.getDate() &&
            d.getMonth() === yest.getMonth() &&
            d.getFullYear() === yest.getFullYear()
          if (!isYest) return false
        } else if (selectedDateRange === "7_DAYS") {
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(now.getDate() - 7)
          if (d < sevenDaysAgo) return false
        } else if (selectedDateRange === "30_DAYS") {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(now.getDate() - 30)
          if (d < thirtyDaysAgo) return false
        }
      }

      // Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const invMatch = sale.invoiceNumber?.toLowerCase().includes(term)
        const cashierMatch = sale.cashier?.name?.toLowerCase().includes(term)
        const itemMatch = sale.items?.some((i) =>
          (i.productName || i.product?.name || "").toLowerCase().includes(term)
        )
        if (!invMatch && !cashierMatch && !itemMatch) return false
      }

      return true
    })
  }, [sales, selectedStatus, selectedPayment, selectedStockType, selectedDateRange, searchTerm])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0
    let totalGross = 0
    let totalDiscount = 0
    let totalTp = 0
    let totalNonTp = 0
    let totalBottles = 0
    let activeBillsCount = 0

    filteredSales.forEach((s) => {
      if (s.status !== "VOIDED") {
        totalRevenue += s.grandTotal || 0
        totalGross += s.subtotal || (s.grandTotal + (s.discount || 0))
        totalDiscount += s.discount || 0
        activeBillsCount++

        s.items?.forEach((i) => {
          totalBottles += i.quantity || 0
          if (i.stockType === "TP") {
            totalTp += i.total || 0
          } else {
            totalNonTp += i.total || 0
          }
        })
      }
    })

    const avgOrderValue = activeBillsCount > 0 ? totalRevenue / activeBillsCount : 0

    return {
      totalRevenue,
      totalGross,
      totalDiscount,
      totalTp,
      totalNonTp,
      totalBottles,
      activeBillsCount,
      avgOrderValue,
    }
  }, [filteredSales])

  const handleExportExcel = async () => {
    const metrics = [
      { label: "Net Sales Turnover", stockType: "All Categories", value: `₹ ${summaryMetrics.totalRevenue.toLocaleString()}`, note: `${summaryMetrics.activeBillsCount} active bills` },
      { label: "Gross Billing Value", stockType: "All Categories", value: `₹ ${summaryMetrics.totalGross.toLocaleString()}`, note: "Before discounts" },
      { label: "Total Discounts Given", stockType: "All Categories", value: `₹ ${summaryMetrics.totalDiscount.toLocaleString()}`, note: "Promotions & waivers" },
      { label: "TP Liquor Sales", stockType: "TP Stock", value: `₹ ${summaryMetrics.totalTp.toLocaleString()}`, note: "Regulated stock" },
      { label: "Non-TP Liquor Sales", stockType: "Non-TP Stock", value: `₹ ${summaryMetrics.totalNonTp.toLocaleString()}`, note: "Commercial stock" },
      { label: "Total Bottles Dispatched", stockType: "All Categories", value: `${summaryMetrics.totalBottles} Bottles`, note: "Volume sold" },
      { label: "Average Order Value", stockType: "All Categories", value: `₹ ${summaryMetrics.avgOrderValue.toFixed(2)}`, note: "Per receipt" },
    ]

    const prodMap = {}
    const salesLog = []

    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const pName = item.productName || item.product?.name || "Item"
        if (!prodMap[pName]) {
          prodMap[pName] = {
            name: pName,
            quantity: 0,
            revenue: 0,
            stockType: item.stockType === "NON_TP" ? "Non-TP Stock" : "TP Stock",
          }
        }
        prodMap[pName].quantity += item.quantity || 0
        prodMap[pName].revenue += item.total || 0

        salesLog.push({
          invoiceNumber: sale.invoiceNumber || sale.billNumber || "-",
          date: new Date(sale.createdAt).toLocaleString(),
          productName: pName,
          stockType: item.stockType,
          quantity: item.quantity,
          price: item.price || item.unitPrice,
          total: item.total,
          discount: sale.discount || 0,
          paymentMethod: sale.paymentMethod || "CASH",
        })
      })
    })

    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue)

    await exportStyledAnalyticsExcel({
      reportTitle: "SALES INVOICES & REVENUE REPORT",
      stockTypeName: "Sales Orders Log",
      themeColor: "1E3A8A", // Navy Blue
      accentColor: "2563EB",
      metrics,
      topProducts,
      salesLog,
      filename: "SuryaBar_Sales_Invoices",
    })
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-150">
          <span className="text-emerald-400 font-black">✓</span> {toast}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Sales History & Invoices Register
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Audit customer receipts, reprint thermal bills, track TP excise splits, and export financial logs
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
          >
            Download Excel
          </button>
          <Link
            to="/admin/pos"
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center cursor-pointer"
          >
            POS Billing Terminal
          </Link>
        </div>
      </div>

      {/* Primary KPI Command Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Turnover */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Net Sales Turnover</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-black">Net</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{summaryMetrics.totalRevenue.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1 sm:mt-2 text-xs font-bold text-slate-600">
            <span>{summaryMetrics.activeBillsCount} receipts</span>
            <span>•</span>
            <span>Gross: ₹{summaryMetrics.totalGross.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Discounts */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Discounts Given</span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-black">Waivers</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-rose-600 mt-1 sm:mt-1.5 tracking-tight">
            ₹{summaryMetrics.totalDiscount.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1 sm:mt-2 text-xs font-bold text-slate-600">
            <span>{summaryMetrics.totalGross > 0 ? `${((summaryMetrics.totalDiscount / summaryMetrics.totalGross) * 100).toFixed(1)}%` : "0%"} rate</span>
            <span>•</span>
            <span>Promotions</span>
          </div>
        </div>

        {/* TP Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">TP Liquor (Excise)</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black">TP</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{summaryMetrics.totalTp.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1 sm:mt-2 text-xs font-bold text-blue-700">
            <span>{summaryMetrics.totalRevenue > 0 ? `${((summaryMetrics.totalTp / summaryMetrics.totalRevenue) * 100).toFixed(1)}%` : "0%"} share</span>
            <span>•</span>
            <span>Regulated</span>
          </div>
        </div>

        {/* Non-TP Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Non-TP / Commercial</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-black">Non-TP</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{summaryMetrics.totalNonTp.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1 sm:mt-2 text-xs font-bold text-purple-700">
            <span>{summaryMetrics.totalRevenue > 0 ? `${((summaryMetrics.totalNonTp / summaryMetrics.totalRevenue) * 100).toFixed(1)}%` : "0%"} share</span>
            <span>•</span>
            <span>Commercial</span>
          </div>
        </div>
      </div>

      {/* Modern Filter Controls */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search by Bill #, Bottle Name, Cashier..."
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

          {/* Date Range Selector */}
          <div>
            <CustomSelect
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              options={[
                { value: "ALL", label: "All Time" },
                { value: "TODAY", label: "Today's Orders" },
                { value: "YESTERDAY", label: "Yesterday" },
                { value: "7_DAYS", label: "Last 7 Days" },
                { value: "30_DAYS", label: "Last 30 Days" },
              ]}
              placeholder="Date Range"
              searchable={false}
            />
          </div>

          {/* Stock Type Filter */}
          <div>
            <CustomSelect
              value={selectedStockType}
              onChange={(e) => setSelectedStockType(e.target.value)}
              options={[
                { value: "ALL", label: "All Categories" },
                { value: "HAS_TP", label: "Includes TP Bottles" },
                { value: "HAS_NON_TP", label: "Includes Non-TP" },
                { value: "TP_ONLY", label: "TP Only Bills" },
                { value: "NON_TP_ONLY", label: "Non-TP Only Bills" },
              ]}
              placeholder="All Categories"
              searchable={false}
            />
          </div>

          {/* Payment Filter */}
          <div>
            <CustomSelect
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              options={[
                { value: "ALL", label: "All Payments" },
                { value: "CASH", label: "Cash" },
                { value: "UPI", label: "UPI" },
                { value: "CARD", label: "Card" },
              ]}
              placeholder="All Payments"
              searchable={false}
            />
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
            {["ALL", "ACTIVE", "VOIDED"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === st
                    ? st === "VOIDED"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-950 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All Receipts" : st === "ACTIVE" ? "Active" : "Voided"}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-slate-500">
            Showing <strong className="text-slate-900">{filteredSales.length}</strong> of {sales.length} receipts
          </span>
        </div>
      </div>

      {/* Main Sales Table & Mobile Cards */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {/* Mobile Receipt Cards View (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No sales receipts match your criteria.</div>
          ) : (
            filteredSales.map((sale) => {
              const tpAmt = sale.items?.reduce((sum, i) => (i.stockType === "TP" ? sum + (i.total || 0) : sum), 0) || 0
              const nonTpAmt = sale.items?.reduce((sum, i) => (i.stockType === "NON_TP" ? sum + (i.total || 0) : sum), 0) || 0
              const isVoided = sale.status === "VOIDED"

              return (
                <div key={sale._id} className={`p-3.5 space-y-2.5 bg-white ${isVoided ? "bg-rose-50/40 opacity-75" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <button
                        onClick={() => setActiveModalSale(sale)}
                        className="font-black text-xs text-slate-900 hover:underline cursor-pointer block text-left"
                      >
                        {sale.invoiceNumber || sale.billNumber || `#${sale._id.slice(-6)}`}
                      </button>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(sale.createdAt).toLocaleDateString()} • {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • By {sale.cashier?.name || "Admin"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        isVoided
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {isVoided ? "VOIDED" : "PAID"}
                    </span>
                  </div>

                  {/* Items Mini-list */}
                  <div className="bg-slate-50/80 p-2.5 rounded-xl text-xs space-y-1">
                    {sale.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span className="truncate">
                          {item.productName || item.product?.name} × {item.quantity}
                        </span>
                        <span className="font-bold text-slate-900 ml-2">₹{item.total}</span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Row */}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                    <div className="flex gap-2 text-[10px] font-bold text-slate-500">
                      {tpAmt > 0 && <span className="text-blue-700">TP: ₹{tpAmt}</span>}
                      {nonTpAmt > 0 && <span className="text-purple-700">Non-TP: ₹{nonTpAmt}</span>}
                      {sale.discount > 0 && <span className="text-rose-600 font-black">Disc: -₹{sale.discount}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-black mr-1">Net:</span>
                      <strong className={`font-black text-sm ${isVoided ? "line-through text-slate-400" : "text-slate-900"}`}>
                        ₹{sale.grandTotal}
                      </strong>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handlePrintReceipt(sale)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => setActiveModalSale(sale)}
                      className="flex-1 py-1.5 bg-slate-950 hover:bg-black text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Sales Table (md: and up) */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Bill / Invoice #</th>
                <th className="p-3.5 text-left">Date & Time</th>
                <th className="p-3.5 text-left">Purchased Items</th>
                <th className="p-3.5 text-right">TP Amt</th>
                <th className="p-3.5 text-right">Non-TP Amt</th>
                <th className="p-3.5 text-right">Discount</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, r) => (
                  <tr key={r} className="p-3.5">
                    <td colSpan="10" className="p-3.5">
                      <div className="flex gap-4 items-center">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400">
                    No sales receipts matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const tpAmt = sale.items?.reduce((sum, i) => (i.stockType === "TP" ? sum + (i.total || 0) : sum), 0) || 0
                  const nonTpAmt = sale.items?.reduce((sum, i) => (i.stockType === "NON_TP" ? sum + (i.total || 0) : sum), 0) || 0
                  const isVoided = sale.status === "VOIDED"

                  return (
                    <tr
                      key={sale._id}
                      className={`hover:bg-slate-50 transition-colors ${isVoided ? "bg-rose-50/40 opacity-75" : ""}`}
                    >
                      {/* Bill Number */}
                      <td className="p-3.5">
                        <button
                          onClick={() => setActiveModalSale(sale)}
                          className="font-bold font-mono text-slate-900 hover:underline cursor-pointer block text-left"
                        >
                          {sale.invoiceNumber || sale.billNumber || `#${sale._id.slice(-6)}`}
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">
                          By {sale.cashier?.name || "Admin"}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800 text-xs">
                          {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>

                      {/* Items */}
                      <td className="p-3.5">
                        <div className="space-y-1 max-w-xs">
                          {sale.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-800">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                  item.stockType === "NON_TP"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {item.stockType === "NON_TP" ? "Non-TP" : "TP"}
                              </span>
                              <span className="font-medium truncate">
                                {item.productName || item.product?.name || "Bottle"}
                              </span>
                              <strong className="text-slate-900 font-bold ml-auto">× {item.quantity}</strong>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* TP Amount */}
                      <td className="p-3.5 text-right">
                        {tpAmt > 0 ? (
                          <span className="font-bold text-slate-800">₹{tpAmt.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Non-TP Amount */}
                      <td className="p-3.5 text-right">
                        {nonTpAmt > 0 ? (
                          <span className="font-bold text-slate-800">₹{nonTpAmt.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Discount Amount */}
                      <td className="p-3.5 text-right">
                        {sale.discount > 0 ? (
                          <span className="font-bold text-rose-600">
                            -₹{sale.discount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="p-3.5 text-right">
                        <span className={`text-sm font-black ${isVoided ? "line-through text-slate-400" : "text-slate-900"}`}>
                          ₹{(sale.grandTotal || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            sale.paymentMethod === "UPI"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : sale.paymentMethod === "CARD"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}
                        >
                          {sale.paymentMethod || "CASH"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                            isVoided
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {isVoided ? "VOIDED" : "PAID"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrintReceipt(sale)}
                            title="Print Thermal Receipt"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Print
                          </button>
                          <button
                            onClick={() => setActiveModalSale(sale)}
                            title="View Full Bill Details"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          {role === "ADMIN" && !isVoided && (
                            <button
                              onClick={() => handleVoidSale(sale)}
                              disabled={voidingId === sale._id}
                              title="Void Bill & Restore Inventory"
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Void
                            </button>
                          )}
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

      {/* Bill Details Modal */}
      {activeModalSale && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Receipt Details</span>
                <h3 className="text-xl font-black mt-0.5">
                  {activeModalSale.invoiceNumber || activeModalSale.billNumber || "Invoice"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(activeModalSale.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveModalSale(null)}
                className="text-slate-400 hover:text-white font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Meta information */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Cashier</span>
                  <strong className="text-slate-900 font-bold">{activeModalSale.cashier?.name || "Admin"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Payment</span>
                  <strong className="text-slate-900 font-bold">{activeModalSale.paymentMethod || "CASH"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <strong className={activeModalSale.status === "VOIDED" ? "text-rose-600 font-black" : "text-emerald-700 font-black"}>
                    {activeModalSale.status || "PAID"}
                  </strong>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="p-2.5 text-left">Bottle</th>
                      <th className="p-2.5 text-center">Type</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeModalSale.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.productName || item.product?.name || "Item"}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.stockType}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right">₹{item.price}</td>
                        <td className="p-2.5 text-right font-black text-slate-900">₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bill Totals Summary */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">₹{activeModalSale.subtotal || activeModalSale.grandTotal}</span>
                </div>
                {activeModalSale.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-bold">₹{activeModalSale.tax}</span>
                  </div>
                )}
                {activeModalSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>
                      Discount {activeModalSale.discountType === "PERCENT" && activeModalSale.discountValue ? `(${activeModalSale.discountValue}%)` : ""}:
                    </span>
                    <span>-₹{activeModalSale.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-slate-950">₹{activeModalSale.grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3">
              <button
                onClick={() => handlePrintReceipt(activeModalSale)}
                className="px-4 py-2 bg-slate-950 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                Print Thermal Bill
              </button>

              <div className="flex gap-2">
                {role === "ADMIN" && activeModalSale.status !== "VOIDED" && (
                  <button
                    onClick={() => handleVoidSale(activeModalSale)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Void Sale
                  </button>
                )}
                <button
                  onClick={() => setActiveModalSale(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styled Void Confirmation Modal */}
      {voidConfirmSale && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
                ⚠️
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Void Invoice #{voidConfirmSale.invoiceNumber}?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This action will cancel this customer bill of <strong className="text-slate-900">₹{(voidConfirmSale.grandTotal || 0).toLocaleString()}</strong> and automatically restore all bottle quantities back into live bar inventory.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left text-xs space-y-1 max-h-36 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bottles To Return to Stock:</span>
                {voidConfirmSale.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 font-medium">
                    <span>{it.productName || it.product?.name || "Item"} ({it.stockType})</span>
                    <strong className="text-emerald-700">+ {it.quantity} units</strong>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidConfirmSale(null)}
                  disabled={voidingId !== null}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeVoidSale}
                  disabled={voidingId !== null}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {voidingId ? "Restoring Stock..." : "Confirm & Void Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}