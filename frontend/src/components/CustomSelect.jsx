import { useState, useRef, useEffect } from "react"

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select Option",
  disabled = false,
  className = "",
  searchable = true,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef(null)

  // Normalize options to { value, label }
  const normalizedOptions = options.map((opt, index) => {
    if (typeof opt === "object" && opt !== null) {
      const val = opt.value ?? opt._id ?? opt.id ?? opt.name ?? `opt-${index}`
      const lbl = opt.label ?? opt.name ?? (opt.value ? String(opt.value) : `Option ${index + 1}`)
      return {
        value: String(val),
        label: String(lbl),
        key: `opt-${val}-${index}`,
      }
    }
    return { value: String(opt), label: String(opt), key: `opt-${opt}-${index}` }
  })

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value))

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase().trim())
  )

  const handleSelect = (val) => {
    onChange({ target: { value: val } })
    setIsOpen(false)
    setSearch("")
  }

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? "border-slate-900 ring-2 ring-slate-900/10 shadow-xs bg-white"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className={`truncate ${selectedOption ? "text-slate-900 font-bold" : "text-slate-400 font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? "rotate-180 text-slate-800" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 max-h-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Quick Search Header if list has multiple items */}
          {searchable && normalizedOptions.length > 5 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Search options..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-medium"
              />
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto no-scrollbar py-1 divide-y divide-slate-50 max-h-56">
            {/* Optional None/Default reset item if placeholder */}
            <div
              onClick={() => handleSelect("")}
              className={`px-3.5 py-2 mx-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                !value
                  ? "bg-slate-100 text-slate-900 font-bold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span>{placeholder}</span>
              {!value && <span className="text-slate-900 font-black text-xs">✓</span>}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs font-medium">No options match</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3.5 py-2 mx-1 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-950 text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <span className="text-white font-black text-xs shrink-0">✓</span>}
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
