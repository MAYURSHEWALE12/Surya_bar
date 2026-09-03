import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from "react"
import { useStore } from "../store/authStore"
import { useNavigate } from "react-router-dom"
import { exportStyledAnalyticsExcel } from "../utils/excelExport"
import CustomSelect from "../components/CustomSelect"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

export default function CombinedAnalytics() {
  const [timeRange, setTimeRange] = useState("TODAY") // "TODAY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL"
  const [rawSales, setRawSales] = useState([])
  const [rawPurchases, setRawPurchases] = useState([])
  const [rawInventories, setRawInventories] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { role } = useStore()

  useEffect(() => {
    if (role !== "ADMIN") {
      setLoading(false)
      return
    }
    fetchData()
  }, [role])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const headers = { Authorization: `Bearer ${token}` }
      const [salesRes, purchasesRes, invRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/sales`, { headers }),
        fetch(`${API_BASE_URL}/api/purchases`, { headers }),
        fetch(`${API_BASE_URL}/api/inventory`, { headers }),
      ])

      const sales = await salesRes.json()
      const purchases = await purchasesRes.json()
      const inventories = await invRes.json()

      setRawSales(Array.isArray(sales) ? sales : [])
      setRawPurchases(Array.isArray(purchases) ? purchases : [])
      setRawInventories(Array.isArray(inventories) ? inventories : [])
    } catch (error) {
      console.error("Error fetching Combined analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter sales by time range
  const filteredSales = useMemo(() => {
    if (!Array.isArray(rawSales)) return []
    const now = new Date()

    return rawSales.filter((sale) => {
      if (sale.status === "VOIDED") return false
      if (timeRange === "ALL") return true
      if (!sale.createdAt) return false
      const d = new Date(sale.createdAt)

      if (timeRange === "TODAY") {
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      } else if (timeRange === "WEEKLY") {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return d >= past7
      } else if (timeRange === "MONTHLY") {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return d >= past30
      } else if (timeRange === "YEARLY") {
        const past365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        return d >= past365
      }
      return true
    })
  }, [rawSales, timeRange])

  // Filter purchases by time range
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(rawPurchases)) return []
    const now = new Date()

    return rawPurchases.filter((p) => {
      if (timeRange === "ALL") return true
      const dateVal = p.createdAt || p.date
      if (!dateVal) return false
      const d = new Date(dateVal)

      if (timeRange === "TODAY") {
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      } else if (timeRange === "WEEKLY") {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return d >= past7
      } else if (timeRange === "MONTHLY") {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return d >= past30
      } else if (timeRange === "YEARLY") {
        const past365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        return d >= past365
      }
      return true
    })
  }, [rawPurchases, timeRange])

  // Process live inventory list
  const { inventoryList, totalStockValue, totalBottlesInStock } = useMemo(() => {
    const list = []
    let val = 0
    let bottles = 0

    if (Array.isArray(rawInventories)) {
      rawInventories.forEach((inv) => {
        const qty = inv.quantity || 0
        const price = inv.sellingPrice || inv.purchasePrice || 0
        val += qty * price
        bottles += qty

        list.push({
          productName: inv.product?.name || "Bottle",
          size: inv.product?.size || "",
          stockType: inv.stockType,
          quantity: qty,
          price: price,
        })
      })
    }

    return { inventoryList: list, totalStockValue: val, totalBottlesInStock: bottles }
  }, [rawInventories])

  // Reactive Analytics Calculations
  const { dashboard, topProducts, salesComparisonData, revenueVsCostData } = useMemo(() => {
    let totalSales = 0
    let tpSales = 0
    let nonTpSales = 0
    let tpUnitsSold = 0
    let nonTpUnitsSold = 0
    let tpPurchases = 0
    let nonTpPurchases = 0
    let totalPurchases = 0
    let totalCostOfGoodsSold = 0
    const prodMap = {}

    filteredSales.forEach((sale) => {
      totalSales += sale.grandTotal || 0

      sale.items?.forEach((item) => {
        const qty = item.quantity || 0
        const itemTot = item.total || 0
        const itemCost = (Number(item.purchasePrice) || (item.unitPrice ? item.unitPrice * 0.72 : 0)) * qty
        totalCostOfGoodsSold += itemCost

        const pName = item.productName || "Unknown"
        if (!prodMap[pName]) {
          prodMap[pName] = { name: pName, quantity: 0, revenue: 0, stockType: item.stockType }
        }
        prodMap[pName].quantity += qty
        prodMap[pName].revenue += itemTot

        if (item.stockType === "TP") {
          tpSales += itemTot
          tpUnitsSold += qty
        } else if (item.stockType === "NON_TP") {
          nonTpSales += itemTot
          nonTpUnitsSold += qty
        }
      })
    })

    filteredPurchases.forEach((p) => {
      const pTotal = p.grandTotal || 0
      totalPurchases += pTotal
      if (p.stockType === "TP") {
        tpPurchases += pTotal
      } else if (p.stockType === "NON_TP") {
        nonTpPurchases += pTotal
      }
    })

    // Accurate Gross Profit = Sales Revenue - Cost of Sold Units
    const grossProfit = Math.max(0, totalSales - totalCostOfGoodsSold)
    const marginPercent = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0

    const topArr = Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)

    const compData = [
      { name: "Non-TP Sales", value: nonTpSales },
      { name: "TP Sales", value: tpSales },
    ]

    const costData = [
      { category: "TP Excise", Revenue: tpSales, Procurement: tpPurchases },
      { category: "Non-TP Commercial", Revenue: nonTpSales, Procurement: nonTpPurchases },
    ]

    return {
      dashboard: {
        totalSales,
        tpSales,
        nonTpSales,
        totalPurchases,
        tpPurchases,
        nonTpPurchases,
        grossProfit,
        marginPercent,
        totalBills: filteredSales.length,
        tpUnitsSold,
        nonTpUnitsSold,
        totalStockValue,
        totalBottlesInStock,
      },
      topProducts: topArr,
      salesComparisonData: compData,
      revenueVsCostData: costData,
    }
  }, [filteredSales, filteredPurchases, totalStockValue, totalBottlesInStock])

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case "TODAY":
        return "Daily (Today)"
      case "WEEKLY":
        return "Weekly (Last 7 Days)"
      case "MONTHLY":
        return "Monthly (Last 30 Days)"
      case "YEARLY":
        return "Yearly (This Year)"
      case "ALL":
        return "All Time"
      default:
        return "Selected Period"
    }
  }, [timeRange])

  const handleExportExcel = async () => {
    const metrics = [
      { label: "Consolidated Gross Turnover", stockType: "All Categories", value: `₹ ${dashboard.totalSales.toLocaleString()}`, note: "Combined revenue" },
      { label: "Non-TP Commercial Revenue", stockType: "Non-TP Stock", value: `₹ ${dashboard.nonTpSales.toLocaleString()}`, note: `${dashboard.totalSales > 0 ? ((dashboard.nonTpSales / dashboard.totalSales) * 100).toFixed(1) : 0}% share` },
      { label: "TP Regulated Revenue", stockType: "TP Stock", value: `₹ ${dashboard.tpSales.toLocaleString()}`, note: `${dashboard.totalSales > 0 ? ((dashboard.tpSales / dashboard.totalSales) * 100).toFixed(1) : 0}% share` },
      { label: "Inward Procurement Spend", stockType: "All Categories", value: `₹ ${dashboard.totalPurchases.toLocaleString()}`, note: "Wholesale cost" },
      { label: "Gross Operating Margin", stockType: "All Categories", value: `₹ ${dashboard.grossProfit.toLocaleString()}`, note: "Turnover - Inward" },
      { label: "Total Warehouse Stock Value", stockType: "All Categories", value: `₹ ${dashboard.totalStockValue.toLocaleString()}`, note: `${dashboard.totalBottlesInStock} bottles` },
    ]

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

    await exportStyledAnalyticsExcel({
      reportTitle: `CONSOLIDATED BAR ANALYTICS (${timeRangeLabel.toUpperCase()})`,
      stockTypeName: "Consolidated (TP + Non-TP)",
      themeColor: "0F172A",
      accentColor: "334155",
      metrics,
      topProducts,
      inventoryList,
      salesLog,
      filename: `SuryaBar_Combined_Analytics_${timeRange}`,
    })
  }

  if (loading) return <div className="p-8 text-center text-slate-500 text-xs font-bold">Loading Consolidated analytics...</div>

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Date Filter Strip */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900">
            Consolidated Business Analytics
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Combined TP + Non-TP performance • {timeRangeLabel} turnover, profit margins & procurement costs
          </p>
        </div>

        {/* Action Buttons & Time Period Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Segmented Button Bar (Desktop/Tablet) */}
          <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: "TODAY", label: "Daily" },
              { id: "WEEKLY", label: "Weekly" },
              { id: "MONTHLY", label: "Monthly" },
              { id: "YEARLY", label: "Yearly" },
              { id: "ALL", label: "All Time" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeRange(tab.id)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  timeRange === tab.id
                    ? "bg-slate-950 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dropdown Selector (Mobile) */}
          <div className="sm:hidden w-full">
            <CustomSelect
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: "TODAY", label: "Daily (Today)" },
                { value: "WEEKLY", label: "Weekly (Last 7 Days)" },
                { value: "MONTHLY", label: "Monthly (Last 30 Days)" },
                { value: "YEARLY", label: "Yearly (This Year)" },
                { value: "ALL", label: "All Time" },
              ]}
              searchable={false}
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center cursor-pointer"
          >
            Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Gross Turnover</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-black">All Channels</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{dashboard.totalSales.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-600 mt-1 sm:mt-2">
            {dashboard.totalBills} customer orders
          </p>
        </div>

        {/* Operating Margin */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Gross Margin</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black">Profit</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{dashboard.grossProfit.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-emerald-700 mt-1 sm:mt-2">
            {dashboard.marginPercent}% margin on sold stock
          </p>
        </div>

        {/* Stock Value */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Warehouse Valuation</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black">Live</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">
            ₹{dashboard.totalStockValue.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-emerald-700 mt-1 sm:mt-2">
            {dashboard.totalBottlesInStock.toLocaleString()} bottles in inventory
          </p>
        </div>

        {/* Channel Split */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Channel Mix</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-black">Split</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-purple-800">Non-TP:</span>
              <span className="font-black text-slate-900">₹{dashboard.nonTpSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-blue-700">TP:</span>
              <span className="font-black text-slate-900">₹{dashboard.tpSales.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-6">
        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-xs sm:text-sm mb-0.5">Top Selling Liquor Products</h3>
            <p className="text-[11px] text-slate-500 font-medium mb-3">Highest grossing items across all stock channels</p>
          </div>
          
          {topProducts.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-slate-400 text-xs font-medium">
              No sales recorded for this period
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11, fill: "#0f172a", fontWeight: 600 }}
                    tickFormatter={(val) => (val.length > 18 ? val.substring(0, 16) + "..." : val)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    formatter={(value, name, props) => [
                      `₹${value.toLocaleString()} (${props.payload.quantity || 0} bottles)`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#0f172a" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Channel Revenue Comparison Donut Chart */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-xs sm:text-sm mb-0.5">Turnover Share Mix</h3>
            <p className="text-[11px] text-slate-500 font-medium mb-3">Relative contribution of Non-TP Commercial vs TP Regulated</p>
          </div>
          
          {dashboard.totalSales === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-slate-400 text-xs font-medium">
              No sales data recorded for this period
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-52 sm:h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Pie
                      data={salesComparisonData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#0f172a" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Sales</span>
                  <span className="text-sm sm:text-base font-black text-slate-950">₹{dashboard.totalSales.toLocaleString()}</span>
                </div>
              </div>

              {/* Clean Legend Badges */}
              <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-slate-100 w-full text-xs">
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                  <span className="font-bold text-slate-800">
                    Non-TP: ₹{dashboard.nonTpSales.toLocaleString()} (
                    {dashboard.totalSales > 0 ? ((dashboard.nonTpSales / dashboard.totalSales) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="font-bold text-slate-800">
                    TP: ₹{dashboard.tpSales.toLocaleString()} (
                    {dashboard.totalSales > 0 ? ((dashboard.tpSales / dashboard.totalSales) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
