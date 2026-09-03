import { API_BASE_URL } from "../config/api"
import { useState, useEffect } from "react"
import { useStore } from "../store/authStore"
import { useNavigate } from "react-router-dom"

export default function VoidedBills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user, role } = useStore()

  useEffect(() => {
    if (role === "ADMIN") {
      fetch(`${API_BASE_URL}/api/sales`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("surya_bar_token")}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setBills(data.filter((s) => s.status === "VOIDED"))
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [role])

  if (loading) return <div>Loading voided bills...</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Voided Bills</h2>

      {role !== "ADMIN" && (
        <p className="text-red-600">Admin access required</p>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <p className="text-gray-500">No voided bills found</p>
        <p className="text-gray-500">Voided bills are preserved for audit purposes</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Invoice</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Cashier</th>
              <th className="p-3 text-left">Items</th>
              <th className="p-3 text-left">TP Amount</th>
              <th className="p-3 text-left">Non-TP Amount</th>
              <th className="p-3 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((sale) => (
              <tr key={sale._id} className="border-b">
                <td className="p-3 font-medium">{sale.invoiceNumber}</td>
                <td className="p-3 text-sm text-gray-500">
                  {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : "N/A"}
                </td>
                <td className="p-3 text-sm text-gray-500">{sale.cashier?.name || "N/A"}</td>
                <td className="p-3">
                  {sale.items.map((item) => (
                    <span key={item._id} className="text-xs">
                      {item.productName} ({item.stockType}) × {item.quantity}
                    </span>
                  ))}
                </td>
                <td className="p-3 text-right">₹{sale.items.reduce((sum, item) => {
                  if (item.stockType === "TP") return sum + item.total
                  return sum
                }, 0)}</td>
                <td className="p-3 text-right">₹{sale.items.reduce((sum, item) => {
                  if (item.stockType === "NON_TP") return sum + item.total
                  return sum
                }, 0)}</td>
                <td className="p-3 text-right">₹{sale.grandTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}