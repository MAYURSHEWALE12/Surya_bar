import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo, useRef } from "react"
import { useAuthStore } from "../store/authStore"
import { useNavigate } from "react-router-dom"
import { getProducts, getCategories, getSales, createSale } from "../services/api"
import ThermalReceipt from "../components/ThermalReceipt"
import CustomerSelect from "../components/CustomerSelect"

export default function Pos() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [discountType, setDiscountType] = useState("PERCENT") // "PERCENT" | "FLAT"
  const [discountInput, setDiscountInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [shortcutFeedback, setShortcutFeedback] = useState(null)
  const searchInputRef = useRef(null)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Global Keyboard Shortcuts (Speed Billing)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If completed receipt modal is open
      if (completedSale) {
        if (e.key === "Enter") {
          e.preventDefault()
          window.print()
          return
        }
        if (e.key === "Escape") {
          e.preventDefault()
          setCompletedSale(null)
          return
        }
        return
      }

      // F1: Focus Search Item
      if (e.key === "F1") {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        triggerShortcutNotification("F1: Search Focus")
        return
      }

      // F2: Cash Payment
      if (e.key === "F2") {
        e.preventDefault()
        setPaymentMethod("CASH")
        triggerShortcutNotification("F2: Cash Mode")
        return
      }

      // F3: UPI Payment
      if (e.key === "F3") {
        e.preventDefault()
        setPaymentMethod("UPI")
        triggerShortcutNotification("F3: UPI Mode")
        return
      }

      // F4: Borrow (Khata)
      if (e.key === "F4") {
        e.preventDefault()
        setPaymentMethod("BORROW")
        triggerShortcutNotification("F4: Borrow Mode")
        return
      }

      // Escape: Clear Search or Cart
      if (e.key === "Escape") {
        if (searchTerm) {
          e.preventDefault()
          setSearchTerm("")
          triggerShortcutNotification("Search Cleared")
        } else if (searchInputRef.current === document.activeElement) {
          searchInputRef.current?.blur()
        }
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [completedSale, searchTerm, cart, paymentMethod])

  const triggerShortcutNotification = (text) => {
    setShortcutFeedback(text)
    setTimeout(() => setShortcutFeedback(null), 1500)
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const [prodData, catData, salesData, custData] = await Promise.all([
        getProducts(),
        getCategories(),
        getSales({ limit: 2000 }).catch(() => []),
        fetch(`${API_BASE_URL}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()).catch(() => ({ customers: [] })),
      ])

      setCustomers(custData.customers || [])

      // Compute units sold per product from past sales
      const salesMap = {}
      if (Array.isArray(salesData)) {
        salesData.forEach((s) => {
          if (s.status !== "VOIDED" && Array.isArray(s.items)) {
            s.items.forEach((item) => {
              const pid = item.product?._id || item.product || item.productId?._id || item.productId
              const pName = item.productName || item.product?.name
              const qty = Number(item.quantity) || 0
              if (pid) {
                const pidStr = String(pid)
                salesMap[pidStr] = (salesMap[pidStr] || 0) + qty
              }
              if (pName) {
                const nameKey = pName.toLowerCase().trim()
                salesMap[nameKey] = (salesMap[nameKey] || 0) + qty
              }
            })
          }
        })
      }

      const prodsWithSales = (Array.isArray(prodData) ? prodData : []).map((p) => {
        const idCount = salesMap[String(p._id)] || 0
        const nameCount = p.name ? (salesMap[p.name.toLowerCase().trim()] || 0) : 0
        return {
          ...p,
          salesCount: Math.max(idCount, nameCount),
        }
      })

      setProducts(prodsWithSales)
      setCategories(Array.isArray(catData) ? catData : [])
    } catch (error) {
      console.error("Error loading POS catalog:", error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product, stockType) => {
    const isTp = stockType === "TP"
    const maxStock = Number(isTp ? product.tp?.quantity : product.nonTp?.quantity) || 0
    const price = Number(isTp ? product.tp?.sellingPrice : product.nonTp?.sellingPrice) || 0

    if (maxStock <= 0) {
      alert(`No ${stockType} stock available for ${product.name}!`)
      return
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === product._id && i.stockType === stockType
      )

      if (existingIndex > -1) {
        const item = prev[existingIndex]
        if (item.quantity >= maxStock) {
          alert(`Cannot add more than ${maxStock} available ${stockType} bottles!`)
          return prev
        }
        const updated = [...prev]
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
          total: (item.quantity + 1) * price,
        }
        return updated
      } else {
        return [
          ...prev,
          {
            productId: product._id,
            productName: product.name,
            size: product.size,
            stockType,
            unitPrice: price,
            quantity: 1,
            total: price,
            maxStock,
          },
        ]
      }
    })
  }

  const updateQuantity = (productId, stockType, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.stockType === stockType) {
            const nextQty = item.quantity + delta
            if (nextQty <= 0) return null
            if (nextQty > item.maxStock) {
              alert(`Maximum available ${stockType} stock is ${item.maxStock}`)
              return item
            }
            return {
              ...item,
              quantity: nextQty,
              total: nextQty * item.unitPrice,
            }
          }
          return item
        })
        .filter(Boolean)
    )
  }

  const removeFromCart = (productId, stockType) => {
    setCart((prev) =>
      prev.filter((i) => !(i.productId === productId && i.stockType === stockType))
    )
  }

  const clearCart = () => {
    setCart([])
    setDiscountInput("")
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountVal = parseFloat(discountInput) || 0
  const discountAmount =
    discountType === "PERCENT"
      ? Math.min(subtotal, Math.round((subtotal * Math.min(100, Math.max(0, discountVal))) / 100))
      : Math.min(subtotal, Math.max(0, discountVal))
  const grandTotal = Math.max(0, subtotal - discountAmount)
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return

    if (paymentMethod === "BORROW") {
      if (!customerName.trim()) {
        alert("Please enter Customer Name for credit / borrow billing.")
        return
      }
      const cleanPhone = customerPhone.trim().replace(/\D/g, "")
      if (cleanPhone.length !== 10) {
        alert(`Mobile number must be exactly 10 digits (currently ${cleanPhone.length} digits).`)
        return
      }
    }

    setIsCheckingOut(true)
    try {
      const salePayload = {
        items: cart.map((item) => ({
          product: item.productId,
          stockType: item.stockType,
          quantity: item.quantity,
        })),
        paymentMethod,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        discount: discountAmount,
        discountType,
        discountValue: discountVal,
        subtotal,
        grandTotal,
      }
      const res = await createSale(salePayload)
      setCompletedSale(res)
      setCart([])
      setDiscountInput("")
      setSelectedCustomerId("")
      setCustomerName("")
      setCustomerPhone("")
      setMobileCartOpen(false)
      await loadCatalog()
    } catch (error) {
      alert("Checkout failed: " + (error.response?.data?.message || error.message))
    } finally {
      setIsCheckingOut(false)
    }
  }

  const lowStockCount = useMemo(() => {
    return products.filter((p) => {
      const tpQty = p.tp?.enabled ? (Number(p.tp?.quantity) || 0) : null
      const nonTpQty = p.nonTp?.enabled ? (Number(p.nonTp?.quantity) || 0) : null
      const tpThreshold = p.tp?.minStock || 5
      const nonTpThreshold = p.nonTp?.minStock || 5

      const tpLow = tpQty !== null && tpQty <= tpThreshold
      const nonTpLow = nonTpQty !== null && nonTpQty <= nonTpThreshold
      return tpLow || nonTpLow
    }).length
  }, [products])

  const filteredProducts = products
    .filter((p) => {
      let matchesCat = true
      if (selectedCategory === "ALL") {
        matchesCat = true
      } else if (selectedCategory === "LOW_STOCK") {
        const tpQty = p.tp?.enabled ? (Number(p.tp?.quantity) || 0) : null
        const nonTpQty = p.nonTp?.enabled ? (Number(p.nonTp?.quantity) || 0) : null
        const tpThreshold = p.tp?.minStock || 5
        const nonTpThreshold = p.nonTp?.minStock || 5
        matchesCat = (tpQty !== null && tpQty <= tpThreshold) || (nonTpQty !== null && nonTpQty <= nonTpThreshold)
      } else {
        matchesCat = p.category?._id === selectedCategory || p.category?.name === selectedCategory
      }

      const term = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.size?.toLowerCase().includes(term) ||
        p.brand?.name?.toLowerCase().includes(term)

      return matchesCat && matchesSearch
    })
    .sort((a, b) => {
      const diff = (b.salesCount || 0) - (a.salesCount || 0)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5.5rem)] w-full overflow-hidden relative">
      {/* LEFT: Product Catalog */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full min-w-0 pb-16 lg:pb-0">
        {/* Top Header / Search */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-80">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search bottle or size (Press F1)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-14 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1">
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              ) : (
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded">
                  F1
                </kbd>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredProducts.length}</span> items
          </div>
        </div>

        {/* Speed Shortcut Command Bar */}
        <div className="px-3 py-1.5 bg-slate-900 text-slate-300 border-b border-slate-800 flex items-center justify-between text-[11px] overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-3 font-semibold whitespace-nowrap">
            <span className="text-amber-400 font-black uppercase tracking-wider text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Speed Mode:
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[9px] font-mono border border-slate-700">F1</kbd> Search
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded text-[9px] font-mono border border-slate-700">F2</kbd> Cash
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-blue-400 rounded text-[9px] font-mono border border-slate-700">F3</kbd> UPI
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-400 rounded text-[9px] font-mono border border-slate-700">F4</kbd> Borrow
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[9px] font-mono border border-slate-700">Enter</kbd> Print
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-mono border border-slate-700">Esc</kbd> Clear
            </span>
          </div>
          {shortcutFeedback && (
            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px] uppercase tracking-wide animate-pulse shrink-0 ml-2">
              {shortcutFeedback}
            </span>
          )}
        </div>

        {/* Category Filter Bar */}
        <div className="p-2.5 border-b border-slate-200 bg-white flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 items-center">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-slate-950 text-white shadow-xs ring-1 ring-slate-950"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
            }`}
          >
            All Categories
          </button>
          {lowStockCount > 0 && (
            <button
              onClick={() => setSelectedCategory("LOW_STOCK")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === "LOW_STOCK"
                  ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-600"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Low Stock Alerts ({lowStockCount})</span>
            </button>
          )}
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c._id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === c._id
                  ? "bg-slate-950 text-white shadow-xs ring-1 ring-slate-950"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto no-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm font-medium">Loading POS catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-base font-bold">No products found</p>
              <p className="text-xs mt-1">Try another category or search filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-2.5">
              {filteredProducts.map((p) => {
                const tpStock = Number(p.tp?.quantity) || 0
                const tpInCart = cart.find((i) => i.productId === p._id && i.stockType === "TP")?.quantity || 0
                const tpRemaining = Math.max(0, tpStock - tpInCart)
                const hasTP = p.tp?.enabled
                const tpAvailable = hasTP && tpRemaining > 0
                const tpThreshold = p.tp?.minStock || 5
                const isTpLow = hasTP && tpRemaining <= tpThreshold && tpRemaining > 0
                const isTpOut = hasTP && tpRemaining === 0

                const nonTpStock = Number(p.nonTp?.quantity) || 0
                const nonTpInCart = cart.find((i) => i.productId === p._id && i.stockType === "NON_TP")?.quantity || 0
                const nonTpRemaining = Math.max(0, nonTpStock - nonTpInCart)
                const hasNonTP = p.nonTp?.enabled
                const nonTpAvailable = hasNonTP && nonTpRemaining > 0
                const nonTpThreshold = p.nonTp?.minStock || 5
                const isNonTpLow = hasNonTP && nonTpRemaining <= nonTpThreshold && nonTpRemaining > 0
                const isNonTpOut = hasNonTP && nonTpRemaining === 0

                const isLowOverall = (hasTP && isTpLow) || (hasNonTP && isNonTpLow)
                const isOutOverall = (hasTP || hasNonTP) && (!hasTP || isTpOut) && (!hasNonTP || isNonTpOut)
                const minRemaining = Math.min(
                  hasTP ? tpRemaining : 999,
                  hasNonTP ? nonTpRemaining : 999
                )

                return (
                  <div
                    key={p._id}
                    className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-2.5 sm:p-3 relative group ${
                      isLowOverall
                        ? "border-rose-300 ring-1 ring-rose-200/70"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div>
                      {/* Product Header & Live Stock Alert Badges */}
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-black text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-1 flex-1">
                          {p.name}
                        </h4>
                        {isOutOverall ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded uppercase shrink-0">
                            Out
                          </span>
                        ) : minRemaining <= 2 && minRemaining > 0 ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded uppercase shrink-0 animate-pulse shadow-2xs">
                            {minRemaining} left
                          </span>
                        ) : isLowOverall ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded uppercase shrink-0">
                            Low: {minRemaining}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {p.brand?.name || p.category?.name || "Standard Item"}
                      </p>

                      {/* Attribute Pills */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {p.size && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            {p.size}
                          </span>
                        )}
                        {p.salesCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md truncate">
                            {p.salesCount} sold
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for TP and Non-TP with low stock indicator */}
                    <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-100">
                      {/* TP Liquor Button */}
                      {tpAvailable ? (
                        <button
                          onClick={() => addToCart(p, "TP")}
                          className={`p-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-xs transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                            isTpLow ? "ring-2 ring-rose-500/80" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-100">
                              TP ({tpRemaining})
                            </span>
                            {isTpLow && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-ping"></span>
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5">
                            ₹{p.tp.sellingPrice}
                          </span>
                        </button>
                      ) : (
                        <div className="p-2 bg-slate-100 text-slate-400 rounded-xl border border-slate-200/60 flex flex-col items-center justify-center text-center select-none">
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {!hasTP ? "N/A" : tpStock > 0 ? "IN CART" : "OUT"}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                            {tpStock > 0 ? `${tpInCart} cart` : "0 stock"}
                          </span>
                        </div>
                      )}

                      {/* Non-TP Liquor Button */}
                      {nonTpAvailable ? (
                        <button
                          onClick={() => addToCart(p, "NON_TP")}
                          className={`p-2 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white rounded-xl shadow-xs transition-all flex flex-col items-center justify-center text-center cursor-pointer relative ${
                            isNonTpLow ? "ring-2 ring-rose-500/80" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-purple-200">
                              N-TP ({nonTpRemaining})
                            </span>
                            {isNonTpLow && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-ping"></span>
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5">
                            ₹{p.nonTp.sellingPrice}
                          </span>
                        </button>
                      ) : (
                        <div className="p-2 bg-slate-100 text-slate-400 rounded-xl border border-slate-200/60 flex flex-col items-center justify-center text-center select-none">
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {!hasNonTP ? "N/A" : nonTpStock > 0 ? "IN CART" : "OUT"}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                            {nonTpStock > 0 ? `${nonTpInCart} cart` : "0 stock"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop RIGHT: Cart & Checkout Panel (hidden on mobile) */}
      <div className="hidden lg:flex w-96 shrink-0 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 text-sm">Current Cart</h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full">
              {totalCartItems} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="w-12 h-12 mx-auto mb-2 text-slate-300 flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-600">Your cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Click on any TP or Non-TP product button to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.productId}-${item.stockType}`} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-black text-slate-900 truncate">{item.productName}</h5>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        item.stockType === "TP" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {item.stockType}
                    </span>
                    {item.size && <span className="text-[10px] text-slate-500 font-medium">{item.size}</span>}
                    <span className="text-[11px] text-slate-600 font-semibold">@ ₹{item.unitPrice}</span>
                  </div>
                </div>

                {/* Qty controller */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.productId, item.stockType, -1)}
                    className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-black text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-black text-xs text-slate-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.stockType, 1)}
                    disabled={item.quantity >= item.maxStock}
                    className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-black text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title={item.quantity >= item.maxStock ? `Max ${item.maxStock} in stock` : "Add one more"}
                  >
                    +
                  </button>
                </div>

                <div className="text-right w-16">
                  <div className="font-black text-slate-900 text-xs sm:text-sm">₹{item.total}</div>
                  <button
                    onClick={() => removeFromCart(item.productId, item.stockType)}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Checkout Section */}
        {cart.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Payment Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "CASH", label: "Cash", shortcut: "F2" },
                  { id: "UPI", label: "UPI", shortcut: "F3" },
                  { id: "CARD", label: "Card", shortcut: null },
                  { id: "BORROW", label: "Borrow", shortcut: "F4" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-1.5 text-[11px] font-black rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                      paymentMethod === m.id
                        ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{m.label}</span>
                    {m.shortcut && (
                      <span className={`text-[8px] font-mono font-bold ${
                        paymentMethod === m.id ? "text-slate-400" : "text-slate-400"
                      }`}>
                        [{m.shortcut}]
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* If Borrow / Credit Selected: Customer Picker & Quick Add */}
            {paymentMethod === "BORROW" && (
              <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl space-y-2 animate-in fade-in duration-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">Customer Khata Profile</span>
                  {(selectedCustomerId || customerName || customerPhone) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId("")
                        setCustomerName("")
                        setCustomerPhone("")
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 underline font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sleek Custom Customer Dropdown */}
                <CustomerSelect
                  customers={customers}
                  selectedId={selectedCustomerId}
                  onSelect={(cust) => {
                    if (cust) {
                      setSelectedCustomerId(cust._id)
                      setCustomerName(cust.name)
                      setCustomerPhone(cust.phone)
                    } else {
                      setSelectedCustomerId("")
                      setCustomerName("")
                      setCustomerPhone("")
                    }
                  }}
                  placeholder="-- Quick Select Existing Customer --"
                />

                {/* Name & 10-Digit Phone Inputs */}
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 focus:border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
                  />
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit Phone *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 ${
                        customerPhone && customerPhone.length === 10
                          ? "border-emerald-500 ring-1 ring-emerald-500/20"
                          : customerPhone
                          ? "border-amber-400 ring-1 ring-amber-400/20"
                          : "border-amber-200 focus:border-slate-900"
                      }`}
                    />
                    {customerPhone && (
                      <span className={`absolute right-1.5 top-2 text-[9px] font-black ${
                        customerPhone.length === 10 ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        {customerPhone.length}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Discount Control Box */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Bill Discount</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENT")}
                    className={`px-2 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                      discountType === "PERCENT"
                        ? "bg-slate-950 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("FLAT")}
                    className={`px-2 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                      discountType === "FLAT"
                        ? "bg-slate-950 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    ₹
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1.5 text-xs font-black text-slate-400">
                    {discountType === "PERCENT" ? "%" : "₹"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={discountType === "PERCENT" ? "100" : subtotal}
                    step="any"
                    placeholder={discountType === "PERCENT" ? "e.g. 10%" : "e.g. 50"}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                {discountAmount > 0 && (
                  <span className="text-xs font-black text-rose-600 shrink-0">
                    -₹{discountAmount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Subtotal and Grand Total Breakdown */}
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-bold text-slate-700">₹{subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-rose-600 font-medium">
                    Discount {discountType === "PERCENT" ? `(${discountVal}%)` : ""}
                  </span>
                  <span className="font-bold text-rose-600">-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                <span className="text-xs text-slate-900 font-black uppercase">Net Grand Total</span>
                <span className="text-2xl font-black text-slate-950">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center"
            >
              {isCheckingOut ? "Processing..." : `Complete & Print Bill (₹${grandTotal.toLocaleString()})`}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Floating Sticky Cart Bar (lg:hidden) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
        <button
          onClick={() => setMobileCartOpen(true)}
          className="w-full bg-slate-900 hover:bg-black text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between transition-transform active:scale-98 cursor-pointer border border-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-sm">
              {totalCartItems}
            </div>
            <div className="text-left">
              <p className="text-[11px] font-bold text-slate-300 leading-tight">
                {totalCartItems === 0 ? "Cart is empty" : `${totalCartItems} item${totalCartItems > 1 ? "s" : ""} added`}
              </p>
              <p className="text-sm font-black text-white">₹{grandTotal}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span>View Cart & Pay</span>
            <span>→</span>
          </div>
        </button>
      </div>

      {/* Mobile Full-Screen / Bottom-Sheet Cart Drawer Modal */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl shadow-2xl h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">Current Cart</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  {totalCartItems}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setMobileCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Cart Items List */}
            <div className="flex-1 p-4 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-sm font-bold text-slate-700">Your cart is empty</p>
                  <p className="text-xs text-slate-400 mt-1">Tap any product to add to cart</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={`m-${item.productId}-${item.stockType}`} className="py-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{item.productName}</h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            item.stockType === "TP" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {item.stockType}
                        </span>
                        {item.size && <span className="text-[10px] text-slate-500">{item.size}</span>}
                        <span className="text-xs font-semibold text-slate-700">₹{item.unitPrice}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => updateQuantity(item.productId, item.stockType, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white shadow-xs text-slate-700 rounded-lg font-bold text-sm cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.stockType, 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="w-7 h-7 flex items-center justify-center bg-white shadow-xs text-slate-700 rounded-lg font-bold text-sm disabled:opacity-30 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right w-16">
                      <div className="font-black text-slate-900 text-sm">₹{item.total}</div>
                      <button
                        onClick={() => removeFromCart(item.productId, item.stockType)}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Checkout Section */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "CASH", label: "Cash" },
                      { id: "UPI", label: "UPI" },
                      { id: "CARD", label: "Card" },
                      { id: "BORROW", label: "Borrow" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`py-2 text-[11px] font-black rounded-xl border transition-all cursor-pointer ${
                          paymentMethod === m.id
                            ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Borrow Customer Info */}
                {paymentMethod === "BORROW" && (
                  <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">Customer Khata Profile</span>
                    <CustomerSelect
                      customers={customers}
                      selectedId={selectedCustomerId}
                      onSelect={(cust) => {
                        if (cust) {
                          setSelectedCustomerId(cust._id)
                          setCustomerName(cust.name)
                          setCustomerPhone(cust.phone)
                        } else {
                          setSelectedCustomerId("")
                          setCustomerName("")
                          setCustomerPhone("")
                        }
                      }}
                      placeholder="-- Select Existing Customer --"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Customer Name *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-200 focus:border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
                      />
                      <div className="relative">
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit Phone *"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          required
                          className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 ${
                            customerPhone && customerPhone.length === 10
                              ? "border-emerald-500 ring-1 ring-emerald-500/20"
                              : customerPhone
                              ? "border-amber-400 ring-1 ring-amber-400/20"
                              : "border-amber-200 focus:border-slate-900"
                          }`}
                        />
                        {customerPhone && (
                          <span className={`absolute right-1.5 top-2 text-[9px] font-black ${
                            customerPhone.length === 10 ? "text-emerald-700" : "text-amber-700"
                          }`}>
                            {customerPhone.length}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Discount Box */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Bill Discount</span>
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDiscountType("PERCENT")}
                        className={`px-2 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                          discountType === "PERCENT"
                            ? "bg-slate-950 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("FLAT")}
                        className={`px-2 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                          discountType === "FLAT"
                            ? "bg-slate-950 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ₹
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1.5 text-xs font-black text-slate-400">
                        {discountType === "PERCENT" ? "%" : "₹"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={discountType === "PERCENT" ? "100" : subtotal}
                        step="any"
                        placeholder={discountType === "PERCENT" ? "e.g. 10%" : "e.g. 50"}
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:outline-none transition-all"
                      />
                    </div>
                    {discountAmount > 0 && (
                      <span className="text-xs font-black text-rose-600 shrink-0">
                        -₹{discountAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="font-bold text-slate-700">₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-rose-600 font-medium">
                        Discount {discountType === "PERCENT" ? `(${discountVal}%)` : ""}
                      </span>
                      <span className="font-bold text-rose-600">-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-900 font-black uppercase">Net Grand Total</span>
                    <span className="text-2xl font-black text-slate-950">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCheckingOut ? "Processing Sale..." : `Complete Sale • ₹${grandTotal.toLocaleString()}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sale Success & Thermal Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl my-6 flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sale Receipt</h3>
                <p className="text-xs text-gray-500">Invoice #{completedSale.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setCompletedSale(null)}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Realistic Thermal Paper Preview Container */}
            <div className="my-4 p-3 bg-gray-100 rounded-xl border border-gray-200 overflow-y-auto max-h-[50vh] flex justify-center">
              <div className="bg-white shadow-md border border-gray-300 rounded-sm">
                <ThermalReceipt sale={completedSale} width="80mm" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Print Thermal Receipt
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}