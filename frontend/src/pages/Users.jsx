import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from "react"
import { useAuthStore } from "../store/authStore"
import CustomSelect from "../components/CustomSelect"

export default function Users() {
  const { user: currentUser, role: userRole } = useAuthStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("ALL")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [toast, setToast] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "CASHIER",
    status: "ACTIVE",
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
      status: "ACTIVE",
    })
    setFormError("")
    setModalOpen(true)
  }

  const openEditModal = (u) => {
    setEditingUser(u)
    setFormData({
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: u.role || "CASHIER",
      status: u.status || "ACTIVE",
    })
    setFormError("")
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("")

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Name and email are required")
      return
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setFormError("Password must be at least 6 characters")
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem("surya_bar_token")
      const url = editingUser
        ? `${API_BASE_URL}/api/users/${editingUser._id}`
        : `${API_BASE_URL}/api/users`

      const method = editingUser ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        showToast(editingUser ? "User updated successfully!" : "New user created successfully!")
        setModalOpen(false)
        await fetchUsers()
      } else {
        setFormError(data.message || "Failed to save user")
      }
    } catch (err) {
      setFormError(err.message || "Server error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (u) => {
    if (u._id === currentUser?.id || u._id === currentUser?._id) {
      alert("You cannot delete your own logged-in account!")
      return
    }

    if (!window.confirm(`Are you sure you want to delete user "${u.name}" (${u.email})?`)) {
      return
    }

    try {
      const token = localStorage.getItem("surya_bar_token")
      const res = await fetch(`${API_BASE_URL}/api/users/${u._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast(`User "${u.name}" deleted successfully!`)
        await fetchUsers()
      } else {
        const data = await res.json()
        alert(data.message || "Failed to delete user")
      }
    } catch (err) {
      alert("Error deleting user: " + err.message)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedRole !== "ALL" && u.role !== selectedRole) return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchName = u.name?.toLowerCase().includes(term)
        const matchEmail = u.email?.toLowerCase().includes(term)
        if (!matchName && !matchEmail) return false
      }
      return true
    })
  }, [users, selectedRole, searchTerm])

  const stats = useMemo(() => {
    const adminCount = users.filter((u) => u.role === "ADMIN").length
    const cashierCount = users.filter((u) => u.role === "CASHIER").length
    const activeCount = users.filter((u) => u.status === "ACTIVE").length
    return {
      total: users.length,
      adminCount,
      cashierCount,
      activeCount,
    }
  }, [users])

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-150">
          <span className="text-emerald-400 font-black">✓</span> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Staff & System Users Management
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage admin administrators, counter cashiers, terminal access credentials, and security passwords
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center cursor-pointer"
        >
          + Add New Staff Member
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Staff</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-black">Total</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">{stats.total}</p>
          <p className="text-xs font-bold text-slate-600 mt-1 sm:mt-2">{stats.activeCount} active in system</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Administrators</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-black">ADMIN</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">{stats.adminCount}</p>
          <p className="text-xs font-bold text-purple-700 mt-1 sm:mt-2">Full system authority</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Counter Cashiers</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black">POS</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">{stats.cashierCount}</p>
          <p className="text-xs font-bold text-blue-700 mt-1 sm:mt-2">Billing terminal operators</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 hover:shadow-sm transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Account Status</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black">100%</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 mt-1 sm:mt-1.5 tracking-tight">{stats.activeCount}</p>
          <p className="text-xs font-bold text-emerald-700 mt-1 sm:mt-2">Active login credentials</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name or email..."
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

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filter Role:</span>
          {["ALL", "ADMIN", "CASHIER"].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRole === r
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === "ALL" ? "All Accounts" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table & Mobile Touch Cards */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading staff accounts...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No users matching criteria.</div>
          ) : (
            filteredUsers.map((u) => {
              const isCurrent = u._id === currentUser?.id || u._id === currentUser?._id
              return (
                <div key={u._id} className="p-3.5 space-y-2 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-900 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                        {u.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-slate-900">{u.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-black px-1.5 py-0.2 rounded border border-slate-200">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{u.email}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {u.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Staff Name</th>
                <th className="p-3.5 text-left">Email Address</th>
                <th className="p-3.5 text-center">System Role</th>
                <th className="p-3.5 text-center">Account Status</th>
                <th className="p-3.5 text-center">Registered On</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400 font-medium">
                    Loading users list...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u._id === currentUser?.id || u._id === currentUser?._id
                  return (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-200">
                            {u.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{u.name}</span>
                            {isCurrent && (
                              <span className="ml-2 text-[9px] bg-slate-100 text-slate-700 font-black px-1.5 py-0.2 rounded border border-slate-200">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">{u.email}</td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {u.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      <td className="p-3.5 text-center text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Edit / Password
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Delete
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-950 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black">{editingUser ? "Edit User Account" : "Register Staff User"}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingUser ? `Updating credentials for ${editingUser.name}` : "Create administrator or cashier login"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. cashier1@suryabar.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  {editingUser ? "New Password (leave empty to keep current)" : "Account Password *"}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? "••••••••" : "Minimum 6 characters"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Role</label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    options={[
                      { value: "CASHIER", label: "Cashier (POS)" },
                      { value: "ADMIN", label: "Admin (Full)" },
                    ]}
                    placeholder="Select Role"
                    searchable={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Status</label>
                  <CustomSelect
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                      { value: "ACTIVE", label: "Active" },
                      { value: "INACTIVE", label: "Inactive" },
                    ]}
                    placeholder="Select Status"
                    searchable={false}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
