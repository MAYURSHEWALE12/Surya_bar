import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../store/authStore"
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getCategories,
  getBrands,
} from "../services/api"
import CustomSelect from "../components/CustomSelect"

export default function Products() {
  const formRef = useRef(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    size: "",
    description: "",
    active: true,
    tp_enabled: true,
    tp_quantity: 0,
    tp_purchasePrice: 0,
    tp_sellingPrice: 0,
    tp_minStock: 0,
    nonTp_enabled: true,
    nonTp_quantity: 0,
    nonTp_purchasePrice: 0,
    nonTp_sellingPrice: 0,
    nonTp_minStock: 0,
  })
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { role } = useStore()

  const navigate = useNavigate()

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const [quickModal, setQuickModal] = useState({
    open: false,
    type: "brand",
    title: "",
    placeholder: "",
    name: "",
    loading: false,
    error: "",
  })

  const loadBrandsAndCategories = async () => {
    try {
      const [brandData, catData] = await Promise.all([
        getBrands(),
        getCategories(),
      ])
      setBrands(Array.isArray(brandData) ? brandData : [])
      setCategories(Array.isArray(catData) ? catData : [])
    } catch (error) {
      console.error("Error loading brands/categories:", error)
      setBrands([])
      setCategories([])
    }
  }

  const openAddBrandModal = () => {
    setQuickModal({
      open: true,
      type: "brand",
      title: "Add New Liquor / Product Brand",
      placeholder: "e.g. Kingfisher, Marlboro, Classic, Royal Stag",
      name: "",
      loading: false,
      error: "",
    })
  }

  const openAddCategoryModal = () => {
    setQuickModal({
      open: true,
      type: "category",
      title: "Add New Product Category",
      placeholder: "e.g. Cigarettes, Whiskey, Beer, Snacks, Soft Drinks",
      name: "",
      loading: false,
      error: "",
    })
  }

  const handleQuickModalSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!quickModal.name.trim()) {
      setQuickModal((prev) => ({ ...prev, error: "Please enter a name" }))
      return
    }
    setQuickModal((prev) => ({ ...prev, loading: true, error: "" }))
    try {
      const token = localStorage.getItem("surya_bar_token")
      const endpoint = quickModal.type === "brand" ? "/api/brands" : "/api/categories"
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: quickModal.name.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        if (quickModal.type === "brand") {
          setBrands((prev) => [...prev, data])
          setFormData((prev) => ({ ...prev, brand: data._id }))
        } else {
          setCategories((prev) => [...prev, data])
          setFormData((prev) => ({ ...prev, category: data._id }))
        }
        setQuickModal({ open: false, type: "", title: "", placeholder: "", name: "", loading: false, error: "" })
      } else {
        setQuickModal((prev) => ({ ...prev, loading: false, error: data.message || "Failed to create" }))
      }
    } catch (err) {
      setQuickModal((prev) => ({ ...prev, loading: false, error: err.message }))
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleStartEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || "",
      brand: product.brand?._id || product.brand || "",
      category: product.category?._id || product.category || "",
      size: product.size || "",
      description: product.description || "",
      active: product.active !== false,
      tp_enabled: product.tp?.enabled !== false,
      tp_quantity: product.tp?.quantity ?? 0,
      tp_purchasePrice: product.tp?.purchasePrice || 0,
      tp_sellingPrice: product.tp?.sellingPrice || 0,
      tp_minStock: product.tp?.minStock || 0,
      nonTp_enabled: product.nonTp?.enabled !== false,
      nonTp_quantity: product.nonTp?.quantity ?? 0,
      nonTp_purchasePrice: product.nonTp?.purchasePrice || 0,
      nonTp_sellingPrice: product.nonTp?.sellingPrice || 0,
      nonTp_minStock: product.nonTp?.minStock || 0,
    })

    // Scroll up smoothly on both window and main container
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      const mainEl = document.querySelector("main")
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: "smooth" })
      }
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 50)
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setFormData({
      name: "",
      brand: "",
      category: "",
      size: "",
      description: "",
      active: true,
      tp_enabled: true,
      tp_quantity: 0,
      tp_purchasePrice: 0,
      tp_sellingPrice: 0,
      tp_minStock: 0,
      nonTp_enabled: true,
      nonTp_quantity: 0,
      nonTp_purchasePrice: 0,
      nonTp_sellingPrice: 0,
      nonTp_minStock: 0,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        brand: formData.brand || null,
        category: formData.category || null,
        size: formData.size,
        description: formData.description,
        active: formData.active,
        tp: {
          enabled: formData.tp_enabled,
          quantity: Number(formData.tp_quantity) || 0,
          purchasePrice: Number(formData.tp_purchasePrice) || 0,
          sellingPrice: Number(formData.tp_sellingPrice) || 0,
          minStock: Number(formData.tp_minStock) || 0,
        },
        nonTp: {
          enabled: formData.nonTp_enabled,
          quantity: Number(formData.nonTp_quantity) || 0,
          purchasePrice: Number(formData.nonTp_purchasePrice) || 0,
          sellingPrice: Number(formData.nonTp_sellingPrice) || 0,
          minStock: Number(formData.nonTp_minStock) || 0,
        },
      }

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload)
      } else {
        await createProduct(payload)
      }

      handleCancelEdit()
      await loadData()
    } catch (error) {
      alert("Error saving product: " + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return
    try {
      await deleteProduct(productId)
      await loadData()
    } catch (error) {
      alert("Error deleting product: " + error.message)
    }
  }

  useEffect(() => {
    if (role === "ADMIN") {
      loadData()
      loadBrandsAndCategories()
    } else {
      navigate("/cashier/pos")
    }
  }, [role])

  return (
    <div ref={formRef} className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900">
            {editingProduct ? `Edit Product: ${editingProduct.name}` : "Product Master & Catalog Entry"}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Configure bottle sizes, excise TP inventory, commercial Non-TP channels, and retail price points
          </p>
        </div>
        {editingProduct && (
          <button
            onClick={handleCancelEdit}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel & Add New
          </button>
        )}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Row 1: Name & Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Kingfisher Premium, Royal Challenge"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Bottle Size / Volume (e.g. 750ml, 650ml, 180ml, 1 Stick)
              </label>
              <input
                type="text"
                name="size"
                placeholder="e.g. 750ml, 375ml, 180ml, 1 Stick, Pack 20s"
                value={formData.size}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 2: Brand & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Brand / Manufacturer
                </label>
                <button
                  type="button"
                  onClick={openAddBrandModal}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  + Add Brand
                </button>
              </div>
              <CustomSelect
                value={formData.brand}
                onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                options={brands}
                placeholder="Select Brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Product Category
                </label>
                <button
                  type="button"
                  onClick={openAddCategoryModal}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  + Add Category
                </button>
              </div>
              <CustomSelect
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                options={categories}
                placeholder="Select Category"
              />
            </div>
          </div>

          {/* Pricing & Channel Stock Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pt-1">
            {/* TP Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md">TP</span>
                  <span className="font-black text-slate-900 text-xs sm:text-sm">Excise TP Channel</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    name="tp_enabled"
                    checked={formData.tp_enabled}
                    onChange={handleChange}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  Enable TP
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Opening Stock</label>
                  <input
                    type="number"
                    name="tp_quantity"
                    value={formData.tp_quantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Selling Price (₹)</label>
                  <input
                    type="number"
                    name="tp_sellingPrice"
                    value={formData.tp_sellingPrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-black text-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    name="tp_purchasePrice"
                    value={formData.tp_purchasePrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Min Alert Level</label>
                  <input
                    type="number"
                    name="tp_minStock"
                    value={formData.tp_minStock}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Non-TP Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-md">NON-TP</span>
                  <span className="font-black text-slate-900 text-xs sm:text-sm">Commercial Non-TP Channel</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    name="nonTp_enabled"
                    checked={formData.nonTp_enabled}
                    onChange={handleChange}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  Enable Non-TP
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Opening Stock</label>
                  <input
                    type="number"
                    name="nonTp_quantity"
                    value={formData.nonTp_quantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Selling Price (₹)</label>
                  <input
                    type="number"
                    name="nonTp_sellingPrice"
                    value={formData.nonTp_sellingPrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-black text-purple-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    name="nonTp_purchasePrice"
                    value={formData.nonTp_purchasePrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Min Alert Level</label>
                  <input
                    type="number"
                    name="nonTp_minStock"
                    value={formData.nonTp_minStock}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              name="description"
              placeholder="Flavor notes, excise classification, or vendor details..."
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={submitting || !formData.name}
              className="px-6 py-3 bg-slate-950 hover:bg-black active:scale-98 text-white font-black rounded-xl shadow-xs text-xs sm:text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Saving Product..." : editingProduct ? "Update Product Details" : "Save Product to Catalog"}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm">Product Master Registry</h3>
          <span className="text-xs text-slate-500 font-bold">Total {products.length} Products Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Product Name</th>
                <th className="p-3.5 text-left">Brand / Category</th>
                <th className="p-3.5 text-center">TP Stock</th>
                <th className="p-3.5 text-center">TP Price</th>
                <th className="p-3.5 text-center">Non-TP Stock</th>
                <th className="p-3.5 text-center">Non-TP Price</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No products added yet. Use the form above to add your first product.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        {product.size && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            {product.size}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      {product.brand?.name || "-"}{product.category ? ` / ${product.category.name}` : ""}
                    </td>
                    <td className="p-3.5 text-center">
                      {product.tp?.enabled ? (
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          (product.tp.quantity || 0) > 0 ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-700"
                        }`}>
                          {product.tp.quantity ?? 0} units
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {product.tp?.enabled ? `₹${product.tp.sellingPrice}` : "-"}
                    </td>
                    <td className="p-3.5 text-center">
                      {product.nonTp?.enabled ? (
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          (product.nonTp.quantity || 0) > 0 ? "bg-purple-100 text-purple-800" : "bg-rose-100 text-rose-700"
                        }`}>
                          {product.nonTp.quantity ?? 0} units
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {product.nonTp?.enabled ? `₹${product.nonTp.sellingPrice}` : "-"}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleStartEdit(product)}
                        className="px-3 py-1 bg-slate-100 text-slate-800 hover:bg-slate-900 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product._id, product.name)}
                        className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Quick Create Modal for Brand & Category */}
      {quickModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">{quickModal.title}</h3>
              <button
                type="button"
                onClick={() => setQuickModal({ open: false, type: "", title: "", placeholder: "", name: "", loading: false, error: "" })}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickModalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  {quickModal.type === "brand" ? "Brand Name *" : "Category Name *"}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={quickModal.placeholder}
                  value={quickModal.name}
                  onChange={(e) => setQuickModal((prev) => ({ ...prev, name: e.target.value, error: "" }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
                {quickModal.error && (
                  <p className="text-xs text-rose-600 font-semibold mt-1.5">{quickModal.error}</p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal({ open: false, type: "", title: "", placeholder: "", name: "", loading: false, error: "" })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickModal.loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {quickModal.loading ? "Saving..." : quickModal.type === "brand" ? "Save Brand" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}