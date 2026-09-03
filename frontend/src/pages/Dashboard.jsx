import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
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
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts"

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("TODAY") // "TODAY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL"

  const [rawSales, setRawSales] = useState([])
  const [rawPurchases, setRawPurchases] = useState([])
  const [rawInventories, setRawInventories] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
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
    } catch (err) {
      console.error("Error loading dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Filter sales based on selected time range
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

  // Filter purchases based on selected time range
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

  // Calculated Metrics
  const { stats, topProducts, salesTrendData, categorySplitData, recentSales, lowStockList } = useMemo(() => {
    let netSales = 0
    let grossSales = 0
    let totalDiscount = 0
    let tpSales = 0
    let nonTpSales = 0
    let tpUnits = 0
    let nonTpUnits = 0
    const prodMap = {}

    filteredSales.forEach((sale) => {
      const grandTotal = sale.grandTotal || 0
      netSales += grandTotal
      grossSales += sale.subtotal || (grandTotal + (sale.discount || 0))
      totalDiscount += sale.discount || 0

      sale.items?.forEach((item) => {
        const itemTotal = item.total || 0
        const qty = item.quantity || 0

        if (item.stockType === "TP") {
          tpSales += itemTotal
          tpUnits += qty
        } else if (item.stockType === "NON_TP") {
          nonTpSales += itemTotal
          nonTpUnits += qty
        }

        const pName = item.productName || item.product?.name || "Item"
        if (!prodMap[pName]) {
          prodMap[pName] = { name: pName, quantity: 0, revenue: 0, stockType: item.stockType }
        }
        prodMap[pName].quantity += qty
        prodMap[pName].revenue += itemTotal
      })
    })

    let totalPurchases = 0
    filteredPurchases.forEach((p) => {
      totalPurchases += p.grandTotal || 0
    })

    let totalStockValue = 0
    let totalBottlesInStock = 0
    const lowStock = []

    if (Array.isArray(rawInventories)) {
      rawInventories.forEach((inv) => {
        const qty = inv.quantity || 0
        const price = inv.sellingPrice || inv.purchasePrice || 0
        totalStockValue += qty * price
        totalBottlesInStock += qty

        if (qty <= 5) {
          lowStock.push({
            _id: inv._id,
            name: inv.product?.name || "Bottle",
            size: inv.product?.size || "",
            stockType: inv.stockType,
            quantity: qty,
          })
        }
      })
    }

    // Top Selling 5 items
    const top = Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Sales Trend Chart Data
    let trend = []
    if (filteredSales.length > 0) {
      trend = filteredSales
        .slice(0, 10)
        .reverse()
        .map((s, idx) => ({
          bill: s.invoiceNumber ? `#${s.invoiceNumber.slice(-4)}` : `#${idx + 1}`,
          amount: s.grandTotal || 0,
          itemsCount: s.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
        }))
    }

    // Category Split
    const catSplit = [
      { name: "TP Liquor", value: tpSales },
      { name: "Non-TP Liquor", value: nonTpSales },
    ]

    return {
      stats: {
        netSales,
        grossSales,
        totalDiscount,
        ordersCount: filteredSales.length,
        tpSales,
        nonTpSales,
        tpUnits,
        nonTpUnits,
        totalPurchases,
        totalStockValue,
        totalBottlesInStock,
        lowStockCount: lowStock.length,
      },
      topProducts: top,
      salesTrendData: trend,
      categorySplitData: catSplit,
      recentSales: filteredSales.slice(0, 6),
      lowStockList: lowStock,
    }
  }, [filteredSales, filteredPurchases, rawInventories])

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case "TODAY":
        return "Today"
      case "WEEKLY":
        return "Last 7 Days"
      case "MONTHLY":
        return "Last 30 Days"
      case "YEARLY":
        return "This Year"
      case "ALL":
        return "All Time"
      default:
        return "Selected Period"
    }
  }, [timeRange])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold text-xs">
        Loading live business dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Surya Bar & Restaurant
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Operational Overview • {timeRangeLabel} Counter Activity & Stock Valuation
          </p>
        </div>

        {/* Time Period Filter Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Segmented Button Bar (Tablet/Desktop) */}
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
          <div className="block sm:hidden w-full">
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
              placeholder="Select Period"
              searchable={false}
            />
          </div>

          {/* Quick Action POS Button */}
          <Link
            to="/admin/pos"
            className="px-4 py-2 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            POS Billing
          </Link>
        </div>
      </div>

      {/* Primary KPI Command Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-400 uppercase">
              Sales Turnover ({timeRangeLabel})
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 uppercase">
              {timeRange}
            </span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">₹{stats.netSales.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 font-semibold">
            <span>{stats.ordersCount} receipts</span>
            <span>•</span>
            <span>₹{stats.ordersCount > 0 ? Math.round(stats.netSales / stats.ordersCount) : 0} avg</span>
          </div>
        </div>

        {/* TP Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-400 uppercase">TP Liquor</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">EXCISE</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">₹{stats.tpSales.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 font-semibold">
            <span>{stats.tpUnits} bottles</span>
            <span>•</span>
            <span>{stats.netSales > 0 ? ((stats.tpSales / stats.netSales) * 100).toFixed(0) : 0}% of turnover</span>
          </div>
        </div>

        {/* Non-TP Sales */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-400 uppercase">Non-TP / Commercial</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">NON-TP</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">₹{stats.nonTpSales.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 font-semibold">
            <span>{stats.nonTpUnits} units</span>
            <span>•</span>
            <span>{stats.netSales > 0 ? ((stats.nonTpSales / stats.netSales) * 100).toFixed(0) : 0}% of turnover</span>
          </div>
        </div>

        {/* Live Inventory Valuation */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-400 uppercase">Bar Stock Valuation</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">ASSET</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">₹{stats.totalStockValue.toLocaleString()}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 font-semibold">
            <span>{stats.totalBottlesInStock} units in stock</span>
            {stats.lowStockCount > 0 ? (
              <span className="text-amber-600 font-bold">{stats.lowStockCount} low</span>
            ) : (
              <span className="text-emerald-600 font-bold">Optimal</span>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Operational Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Purchases Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Inward Procurement Spend</span>
            <p className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 mt-1">₹{stats.totalPurchases.toLocaleString()}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Procurement cost logged for {timeRangeLabel.toLowerCase()}</p>
        </div>

        {/* Revenue Balance Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Turnover Balance</span>
              <span className="text-[11px] font-bold text-slate-700">
                TP: {stats.netSales > 0 ? ((stats.tpSales / stats.netSales) * 100).toFixed(0) : 0}% | N-TP: {stats.netSales > 0 ? ((stats.nonTpSales / stats.netSales) * 100).toFixed(0) : 0}%
              </span>
            </div>
            {/* Split Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mt-3">
              <div
                style={{ width: `${stats.netSales > 0 ? (stats.tpSales / stats.netSales) * 100 : 50}%` }}
                className="bg-blue-600 h-full"
              ></div>
              <div
                style={{ width: `${stats.netSales > 0 ? (stats.nonTpSales / stats.netSales) * 100 : 50}%` }}
                className="bg-purple-700 h-full"
              ></div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold mt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> TP Liquor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-700"></span> Non-TP / Commercial</span>
          </div>
        </div>

        {/* Stock Health */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Inventory Health</span>
              <p className={`text-lg sm:text-xl md:text-2xl font-black mt-1 ${stats.lowStockCount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                {stats.lowStockCount > 0 ? `${stats.lowStockCount} Low Items` : "Stock Levels Healthy"}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${stats.lowStockCount > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
              {stats.lowStockCount > 0 ? "REORDER" : "OK"}
            </span>
          </div>
          <Link to="/admin/inventory" className="text-xs font-black text-slate-900 hover:text-blue-600 mt-2 inline-flex items-center gap-1">
            <span>Manage Inventory Register</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 lg:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">Order Sales Velocity ({timeRangeLabel})</h3>
              <p className="text-xs text-slate-400 font-medium">Ticket size across customer orders in selected period</p>
            </div>
            <Link to="/admin/sales" className="text-xs text-slate-900 hover:text-blue-600 font-bold">
              View All Bills →
            </Link>
          </div>

          {salesTrendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              No sales recorded for {timeRangeLabel.toLowerCase()}.
            </div>
          ) : (
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="bill" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px", fontWeight: "bold" }}
                    itemStyle={{ color: "#38bdf8" }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, "Order Amount"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#0f172a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Ratio Donut */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-sm sm:text-base">Turnover Mix</h3>
            <p className="text-xs text-slate-400 font-medium mb-2">Excise TP vs Commercial Non-TP ({timeRangeLabel})</p>
          </div>

          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySplitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#7e22ce" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff", fontSize: "11px" }}
                  formatter={(v) => `₹${v.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Turnover</span>
              <span className="text-sm font-black text-slate-900">₹{stats.netSales.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-around pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="font-bold text-slate-800">TP: ₹{stats.tpSales.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-700"></span>
              <span className="font-bold text-slate-800">N-TP: ₹{stats.nonTpSales.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Tables: Recent Sales & Top Products / Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Transactions Table & Mobile Cards */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Recent Counter Sales</h3>
            <Link to="/admin/sales" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
              View All Bills →
            </Link>
          </div>

          {/* Mobile Recent Sales Cards (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No sales recorded yet.</div>
            ) : (
              recentSales.map((sale) => (
                <div key={sale._id} className="p-3.5 space-y-1.5 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-xs text-blue-700">{sale.invoiceNumber || `#${sale._id.slice(-6)}`}</span>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      ₹{sale.grandTotal?.toLocaleString() || 0}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl text-[11px] text-slate-700 border border-slate-100 flex items-center justify-between">
                    <span className="truncate pr-2">
                      {sale.items?.map((i) => `${i.productName || "Item"} (${i.quantity})`).join(", ") || "-"}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[9px] shrink-0">
                      {sale.paymentMethod || "CASH"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Recent Sales Table (md:) */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="p-3 text-left">Bill #</th>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Bottles</th>
                  <th className="p-3 text-center">Payment</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-400">
                      No sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-blue-700">{sale.invoiceNumber || `#${sale._id.slice(-4)}`}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3 text-slate-800">
                        {sale.items?.map((i) => `${i.productName || "Item"} (${i.quantity})`).join(", ") || "-"}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                          {sale.paymentMethod || "CASH"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        ₹{sale.grandTotal?.toLocaleString() || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Fast-Moving Products & Low Stock */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Top Fast-Moving Liquors</h3>
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">By Revenue</span>
          </div>
          <div className="divide-y divide-slate-100 p-2">
            {topProducts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No products sold yet</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-slate-900">{p.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">{p.quantity} bottles dispatched</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-blue-900">₹{p.revenue.toLocaleString()}</p>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded ${p.stockType === "NON_TP" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                      {p.stockType === "NON_TP" ? "Non-TP" : "TP"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}