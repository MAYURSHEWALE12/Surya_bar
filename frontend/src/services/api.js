import axios from "axios"
import { API_URL } from "../config/api"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("surya_bar_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const authCheck = async (token) => {
  try {
    const response = await api.get("/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials)
    return response.data
  } catch (error) {
    throw error
  }
}

export const searchProducts = async (term) => {
  try {
    const res = await api.get(`/products?barcode=${term}`)
    return res.data
  } catch (error) {
    throw error
  }
}

export const getProducts = async (params) => {
  try {
    const res = await api.get("/products", { params })
    return res.data
  } catch (error) {
    throw error
  }
}

export const getProductById = async (id) => {
  try {
    const res = await api.get(`/products/${id}`)
    return res.data
  } catch (error) {
    throw error
  }
}

export const createProduct = async (productData) => {
  try {
    const res = await api.post("/products", productData)
    return res.data
  } catch (error) {
    throw error
  }
}

export const updateProduct = async (id, productData) => {
  try {
    const res = await api.put(`/products/${id}`, productData)
    return res.data
  } catch (error) {
    throw error
  }
}

export const deleteProduct = async (id) => {
  try {
    const res = await api.delete(`/products/${id}`)
    return res.data
  } catch (error) {
    throw error
  }
}

export const getCategories = async () => {
  try {
    const res = await api.get("/categories")
    return res.data
  } catch (error) {
    throw error
  }
}

export const getBrands = async () => {
  try {
    const res = await api.get("/brands")
    return res.data
  } catch (error) {
    throw error
  }
}

export const createSale = async (saleData) => {
  try {
    const res = await api.post("/sales", saleData)
    return res.data
  } catch (error) {
    throw error
  }
}

export const getSales = async (params) => {
  try {
    const res = await api.get("/sales", { params })
    return res.data
  } catch (error) {
    throw error
  }
}

export const getVendors = async () => {
  try {
    const res = await api.get("/vendors")
    return res.data
  } catch (error) {
    throw error
  }
}

export const createVendor = async (vendorData) => {
  try {
    const res = await api.post("/vendors", vendorData)
    return res.data
  } catch (error) {
    throw error
  }
}

export const getPurchases = async () => {
  try {
    const res = await api.get("/purchases")
    return res.data
  } catch (error) {
    throw error
  }
}

export const createPurchase = async (purchaseData) => {
  try {
    const res = await api.post("/purchases", purchaseData)
    return res.data
  } catch (error) {
    throw error
  }
}

export const getInventory = async () => {
  try {
    const res = await api.get("/inventory")
    return res.data
  } catch (error) {
    throw error
  }
}

export const adjustInventoryStock = async (payload) => {
  try {
    const res = await api.post("/inventory/adjust", payload)
    return res.data
  } catch (error) {
    throw error
  }
}

export default api