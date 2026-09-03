import { API_BASE_URL } from "../config/api"
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [metrics, setMetrics] = useState({
    totalMarketOutstanding: 0,
    totalWithDue: 0,
    totalCustomers: 0,
    totalPaid: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('ALL')

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerStatement, setCustomerStatement] = useState(null)
  const [loadingStatement, setLoadingStatement] = useState(false)

  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [settleCustomer, setSettleCustomer] = useState(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('CASH')
  const [settleNotes, setSettleNotes] = useState('')
  const [settleSubmitting, setSettleSubmitting] = useState(false)
  const [settlementSuccess, setSettlementSuccess] = useState(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustLimit, setNewCustLimit] = useState('')
  const [newCustNotes, setNewCustNotes] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('surya_bar_token')
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setCustomers(data.customers || [])
        setMetrics(data.metrics || {
          totalMarketOutstanding: 0,
          totalWithDue: 0,
          totalCustomers: 0,
          totalPaid: 0,
        })
      }
    } catch (err) {
      console.error('Error fetching customer khata:', err)
    } finally {
      setLoading(false)
    }
  }

  const openStatement = async (cust) => {
    setSelectedCustomer(cust)
    setCustomerStatement(null)
    setLoadingStatement(true)
    try {
      const token = localStorage.getItem('surya_bar_token')
      const res = await fetch(`${API_BASE_URL}/api/customers/${cust._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setCustomerStatement(data)
      }
    } catch (err) {
      console.error('Error loading statement:', err)
    } finally {
      setLoadingStatement(false)
    }
  }

  const openSettleModal = (cust) => {
    setSettleCustomer(cust)
    setSettleAmount(cust.currentBalance > 0 ? String(cust.currentBalance) : '')
    setSettlePaymentMethod('CASH')
    setSettleNotes('')
    setSettlementSuccess(null)
    setSettleModalOpen(true)
  }

  const handleSettleSubmit = async (e) => {
    e.preventDefault()
    if (!settleAmount || Number(settleAmount) <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    setSettleSubmitting(true)
    try {
      const token = localStorage.getItem('surya_bar_token')
      const res = await fetch(`${API_BASE_URL}/api/customers/${settleCustomer._id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(settleAmount),
          paymentMethod: settlePaymentMethod,
          notes: settleNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSettlementSuccess(data.settlementReceipt)
        fetchCustomers()
        if (selectedCustomer && selectedCustomer._id === settleCustomer._id) {
          openStatement(settleCustomer)
        }
      } else {
        alert(data.message || 'Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      alert('Network error while recording payment')
    } finally {
      setSettleSubmitting(false)
    }
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    setCreateError('')
    if (!newCustName.trim()) {
      setCreateError('Customer full name is required.')
      return
    }

    const cleanPhone = newCustPhone.trim().replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      setCreateError(`Mobile number must be exactly 10 digits (currently ${cleanPhone.length} digits).`)
      return
    }

    setCreateSubmitting(true)
    try {
      const token = localStorage.getItem('surya_bar_token')
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: cleanPhone,
          creditLimit: Number(newCustLimit) || 0,
          notes: newCustNotes.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setCreateModalOpen(false)
        setNewCustName('')
        setNewCustPhone('')
        setNewCustLimit('')
        setNewCustNotes('')
        fetchCustomers()
      } else {
        setCreateError(data.message || 'Failed to create customer')
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      setCreateError('Network error while saving customer')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const printSettlementReceipt = () => {
    if (!settlementSuccess) return
    const receiptWindow = window.open('', '_blank', 'width=400,height=600')
    receiptWindow.document.write(`
      <html>
        <head>
          <title>Settlement Receipt - ${settlementSuccess.receiptId}</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold">SURYA BAR & RESTAURANT</div>
          <div class="center">CUSTOMER REPAYMENT SLIP</div>
          <div class="divider"></div>
          <div class="row"><span>Receipt #:</span><span class="bold">${settlementSuccess.receiptId}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(settlementSuccess.date).toLocaleString()}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${settlementSuccess.customerName}</span></div>
          <div class="row"><span>Phone:</span><span>${settlementSuccess.customerPhone}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Previous Due:</span><span>Rs. ${settlementSuccess.previousBalance.toLocaleString()}</span></div>
          <div class="row bold" style="font-size: 15px;"><span>AMOUNT PAID:</span><span>Rs. ${settlementSuccess.amountPaid.toLocaleString()}</span></div>
          <div class="row"><span>Payment Mode:</span><span>${settlementSuccess.paymentMethod}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>REMAINING BALANCE:</span><span>Rs. ${settlementSuccess.remainingBalance.toLocaleString()}</span></div>
          <div class="divider"></div>
          <div class="center" style="margin-top: 15px;">Thank you for your payment!</div>
        </body>
      </html>
    `)
    receiptWindow.document.close()
    receiptWindow.print()
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        c.phone.includes(searchQuery.trim())

      if (!matchesSearch) return false

      if (filterMode === 'HAS_BALANCE') {
        return (c.currentBalance || 0) > 0
      } else if (filterMode === 'CLEARED') {
        return (c.currentBalance || 0) === 0
      }
      return true
    })
  }, [customers, searchQuery, filterMode])

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Customer Credit & Khata Ledger
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Audit customer borrow tabs, outstanding balances, repayment logs, and individual statements
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Market Outstanding</span>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-[10px] font-black uppercase">Pending Due</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-rose-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.totalMarketOutstanding.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            {metrics.totalWithDue} customers with active balance
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Settled & Recovered</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black uppercase">Collected</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700 mt-1 sm:mt-1.5 tracking-tight">
            ₹{metrics.totalPaid.toLocaleString()}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            Lifetime credit repayments logged
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Registered Accounts</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-black uppercase">Khata</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1 sm:mt-1.5 tracking-tight">
            {metrics.totalCustomers}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            Total borrower customer profiles
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/90 hover:border-slate-400 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">Cleared Accounts</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-black uppercase">Zero Due</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1 sm:mt-1.5 tracking-tight">
            {metrics.totalCustomers - metrics.totalWithDue}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 sm:mt-2">
            Customers with ₹0 remaining debt
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name or phone..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-xs"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {[
            { id: 'ALL', label: 'All Accounts' },
            { id: 'HAS_BALANCE', label: 'Outstanding Due' },
            { id: 'CLEARED', label: 'Cleared (₹0)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm">Customer Ledger Register</h3>
          <span className="text-xs font-semibold text-slate-500">{filteredCustomers.length} records</span>
        </div>

        <div className="block md:hidden divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">No customer khata records found.</div>
          ) : (
            filteredCustomers.map((cust) => (
              <div key={cust._id} className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{cust.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{cust.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Balance Due</span>
                    <span className={`text-base font-black ${cust.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      ₹{cust.currentBalance?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Total Borrowed:</span>
                    <span className="font-bold text-slate-800">₹{cust.totalPurchased?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Repaid:</span>
                    <span className="font-bold text-slate-800">₹{cust.totalPaid?.toLocaleString() || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openStatement(cust)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
                  >
                    View Statement
                  </button>
                  {cust.currentBalance > 0 && (
                    <button
                      onClick={() => openSettleModal(cust)}
                      className="flex-1 py-2 bg-slate-950 hover:bg-black text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                    >
                      Collect Payment
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5 text-left">Customer Name</th>
                <th className="p-3.5 text-left">Phone Number</th>
                <th className="p-3.5 text-right">Lifetime Borrowed</th>
                <th className="p-3.5 text-right">Lifetime Repaid</th>
                <th className="p-3.5 text-right">Current Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                    No customer khata records found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>
                        <span>{cust.name}</span>
                        {cust.notes && <p className="text-[10px] text-slate-400 font-normal mt-0.5">{cust.notes}</p>}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">{cust.phone}</td>
                    <td className="p-3.5 text-right font-semibold text-slate-700">₹{cust.totalPurchased?.toLocaleString() || 0}</td>
                    <td className="p-3.5 text-right font-semibold text-emerald-700">₹{cust.totalPaid?.toLocaleString() || 0}</td>
                    <td className="p-3.5 text-right">
                      <span className={`font-black text-sm ${cust.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        ₹{cust.currentBalance?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        cust.currentBalance > 0
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {cust.currentBalance > 0 ? 'DUE PENDING' : 'CLEARED'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openStatement(cust)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Statement
                        </button>
                        {cust.currentBalance > 0 && (
                          <button
                            onClick={() => openSettleModal(cust)}
                            className="px-3 py-1.5 bg-slate-950 hover:bg-black text-white font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Customer Khata Ledger</span>
                <h3 className="text-lg sm:text-xl font-black mt-0.5">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 border-b border-slate-200 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Borrowed</span>
                <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">₹{selectedCustomer.totalPurchased?.toLocaleString() || 0}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Settled</span>
                <p className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5">₹{selectedCustomer.totalPaid?.toLocaleString() || 0}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Due</span>
                <p className={`text-xs sm:text-sm font-black mt-0.5 ${selectedCustomer.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  ₹{selectedCustomer.currentBalance?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Transaction Ledger Timeline</h4>

              {loadingStatement ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading ledger records...</div>
              ) : !customerStatement || customerStatement.transactions?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                  No credit transactions logged for this customer yet.
                </div>
              ) : (
                customerStatement.transactions.map((tx) => (
                  <div
                    key={tx._id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      tx.type === 'DEBIT_SALE' || tx.type === 'BORROW'
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-emerald-50/40 border-emerald-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          tx.type === 'DEBIT_SALE' || tx.type === 'BORROW'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tx.type === 'DEBIT_SALE' || tx.type === 'BORROW' ? 'BILL BORROWED' : 'PAYMENT SETTLED'}
                        </span>
                        <span className="font-mono text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</span>
                      </div>
                      <span className={`font-black text-sm ${
                        tx.type === 'DEBIT_SALE' || tx.type === 'BORROW' ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {tx.type === 'DEBIT_SALE' || tx.type === 'BORROW' ? `+ ₹${tx.amount?.toLocaleString()}` : `- ₹${tx.amount?.toLocaleString()}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium mt-1.5">{tx.notes || (tx.type === 'DEBIT_SALE' || tx.type === 'BORROW' ? 'Counter Bill' : 'Repayment')}</p>

                    {tx.sale && tx.sale.items && (
                      <div className="mt-2 bg-slate-50 p-2 rounded-xl text-[11px] text-slate-600 border border-slate-100 space-y-0.5">
                        <span className="font-bold text-slate-800 block text-[10px] uppercase">Bill #{tx.sale.invoiceNumber}:</span>
                        {tx.sale.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.productName} ({it.stockType})</span>
                            <span className="font-bold text-slate-800">× {it.quantity} (₹{it.total})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>Balance After: <strong className="text-slate-700">₹{tx.balanceAfter?.toLocaleString() || 0}</strong></span>
                      {tx.paymentMethod && <span>Method: <strong className="text-slate-700 uppercase">{tx.paymentMethod}</strong></span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200"
              >
                Close Statement
              </button>
              {selectedCustomer.currentBalance > 0 && (
                <button
                  onClick={() => {
                    openSettleModal(selectedCustomer)
                  }}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Collect Payment (₹{selectedCustomer.currentBalance?.toLocaleString()})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {settleModalOpen && settleCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Credit Settlement</span>
                <h3 className="text-base font-black mt-0.5">Collect Repayment</h3>
                <p className="text-xs text-slate-300 font-semibold">{settleCustomer.name} • {settleCustomer.phone}</p>
              </div>
              <button
                onClick={() => {
                  setSettleModalOpen(false)
                  setSettlementSuccess(null)
                }}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {settlementSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-black text-xl mx-auto">
                  ✓
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Payment Recorded Successfully</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Received <strong className="text-emerald-700">₹{settlementSuccess.amountPaid.toLocaleString()}</strong> via {settlementSuccess.paymentMethod}
                  </p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    Remaining Balance: ₹{settlementSuccess.remainingBalance.toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={printSettlementReceipt}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200"
                  >
                    Print Slip
                  </button>
                  <button
                    onClick={() => {
                      setSettleModalOpen(false)
                      setSettlementSuccess(null)
                    }}
                    className="flex-1 py-2.5 bg-slate-950 hover:bg-black text-white font-bold text-xs rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSettleSubmit} className="p-6 space-y-4">
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-900">Total Outstanding Balance:</span>
                  <span className="text-base font-black text-rose-700">₹{settleCustomer.currentBalance?.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Repayment Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={settleCustomer.currentBalance || undefined}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                    placeholder="Enter amount"
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-base font-black text-slate-900 focus:outline-none"
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setSettleAmount(String(settleCustomer.currentBalance))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200"
                    >
                      Full Due (₹{settleCustomer.currentBalance})
                    </button>
                    {settleCustomer.currentBalance > 500 && (
                      <button
                        type="button"
                        onClick={() => setSettleAmount('500')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200"
                      >
                        ₹500
                      </button>
                    )}
                    {settleCustomer.currentBalance > 1000 && (
                      <button
                        type="button"
                        onClick={() => setSettleAmount('1000')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200"
                      >
                        ₹1,000
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['CASH', 'UPI', 'CARD'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSettlePaymentMethod(m)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          settlePaymentMethod === m
                            ? 'bg-slate-950 text-white border-slate-950 font-black shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Reference / Notes (Optional)</label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="e.g. GooglePay Txn ID / Handover"
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={settleSubmitting}
                  className="w-full py-3 bg-slate-950 hover:bg-black text-white font-black text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {settleSubmitting ? 'Recording Settlement...' : `Confirm Settlement (₹${Number(settleAmount || 0).toLocaleString()})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Khata Directory</span>
                <h3 className="text-base font-black mt-0.5">Add Customer Profile</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-800">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number (10 Digits) *</label>
                <div className="relative">
                  <input
                    type="tel"
                    maxLength={10}
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none ${
                      newCustPhone && newCustPhone.length === 10
                        ? "border-emerald-500 ring-1 ring-emerald-500/20"
                        : newCustPhone
                        ? "border-amber-400 ring-1 ring-amber-400/20"
                        : "border-slate-300 focus:border-slate-900"
                    }`}
                  />
                  {newCustPhone && (
                    <span className={`absolute right-3 top-3 text-[10px] font-black ${
                      newCustPhone.length === 10 ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {newCustPhone.length}/10
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (₹) (0 = Unlimited)</label>
                <input
                  type="number"
                  min="0"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Address (Optional)</label>
                <input
                  type="text"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  placeholder="e.g. Regular Table 4 Guest"
                  className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-black text-white font-black text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {createSubmitting ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
