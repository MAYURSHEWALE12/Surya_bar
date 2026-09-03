import { API_BASE_URL } from "../config/api"
import { useState, useEffect } from "react"
import { useStore } from "../store/authStore"
import { useNavigate } from "react-router-dom"

export default function SaleReturn() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user, role } = useStore()

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/sale-returns`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("surya_bar_token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setReturns(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading returns...</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sale Returns</h2>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Original Sale</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Items Returned</th>
              <th className="p-3 text-left">Refund Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => (
              <tr key={ret._id} className="border-b">
                <td className="p-3">
                  {ret.sale.invoiceNumber} - {ret.sale.createdAt ? new Date(ret.sale.createdAt).toLocaleDateString() : "N/A"}
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {ret.sale.createdAt ? new Date(ret.sale.createdAt).toLocaleDateString() : "N/A"}
                </td>
                <td className="p-3">
                  {ret.items.map((item) => (
                    <span key={item.product._id} className="text-xs">
                      {item.productName} ({item.stockType}) × {item.quantity}
                    </span>
                  ))}
                </td>
                <td className="p-3 text-right">₹{refundAmount}</td>
                <td className="p-3 text-sm text-gray-500">{ret.status}</td>
                <td className="p-3">
                  <button
                    onClick={() => window.alert("Return processed")}
                    className="text-green-600 hover underline text-sm"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}