import React, { useState, useRef, useEffect } from "react"

export default function CustomerSelect({
  customers = [],
  selectedId = "",
  onSelect,
  placeholder = "Select Existing Customer (Khata)",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedCustomer = customers.find((c) => String(c._id) === String(selectedId))

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase().trim()
    if (!term) return true
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    )
  })

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 bg-white hover:bg-slate-50 border rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer text-left ${
          isOpen
            ? "border-slate-900 ring-2 ring-slate-900/10 shadow-xs"
            : "border-amber-200 hover:border-amber-300"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
          {selectedCustomer ? (
            <>
              <span className="font-bold text-slate-900 truncate">{selectedCustomer.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">({selectedCustomer.phone})</span>
              {selectedCustomer.currentBalance > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-black shrink-0">
                  Due: ₹{selectedCustomer.currentBalance.toLocaleString()}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ml-1 ${
            isOpen ? "rotate-180 text-slate-800" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 max-h-60">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-medium text-slate-900 placeholder:text-slate-400"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto no-scrollbar py-1 divide-y divide-slate-50 flex-1">
            {/* New / Unselect option */}
            <div
              onClick={() => {
                onSelect(null)
                setIsOpen(false)
                setSearch("")
              }}
              className={`px-3 py-2 mx-1 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-between ${
                !selectedId
                  ? "bg-slate-100 text-slate-900 font-bold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span>-- Type New / Non-Khata Customer --</span>
              {!selectedId && <span className="text-slate-900 font-black text-xs">✓</span>}
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs font-medium">
                No matching borrower found
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = String(cust._id) === String(selectedId)
                return (
                  <div
                    key={cust._id}
                    onClick={() => {
                      onSelect(cust)
                      setIsOpen(false)
                      setSearch("")
                    }}
                    className={`px-3 py-2 mx-1 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-950 text-white font-bold shadow-xs"
                        : "text-slate-800 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className={`truncate font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {cust.name}
                      </span>
                      <span className={`text-[10px] font-mono ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {cust.phone}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? "bg-slate-800 text-amber-300 border-slate-700"
                            : cust.currentBalance > 0
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {cust.currentBalance > 0 ? `Due: ₹${cust.currentBalance.toLocaleString()}` : "Cleared"}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
