import React from "react"

export default function ThermalReceipt({ sale, barInfo = {}, width }) {
  if (!sale) return null

  let storedSettings = {}
  try {
    const raw = localStorage.getItem("surya_bar_settings")
    if (raw) storedSettings = JSON.parse(raw)
  } catch (e) {}

  const receiptWidth = width || storedSettings.receiptSize || "80mm"

  const defaultBarInfo = {
    name: storedSettings.shopName || "SURYA BAR & RESTAURANT",
    tagline: "BAR & RESTO PARLOUR",
    address: storedSettings.address || "Main Road, City Center",
    phone: storedSettings.contactPhone || "+91 98765 43210",
    gst: storedSettings.showLicenseOnBill !== false && storedSettings.gstin ? `Lic/GST: ${storedSettings.gstin}` : "",
    footer: storedSettings.footerMessage || "THANK YOU! VISIT AGAIN",
    ...barInfo,
  }

  const items = sale.items || []
  const dateFormatted = new Date(sale.createdAt || Date.now()).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  const totalItemsCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)

  return (
    <div
      id="thermal-receipt"
      className="bg-white text-black p-4 text-xs font-mono select-none"
      style={{
        width: receiptWidth === "58mm" ? "58mm" : "80mm",
        margin: "0 auto",
        lineHeight: "1.25",
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Bar Header */}
      <div className="text-center pb-2">
        <h2 className="text-base font-bold tracking-tight uppercase">{defaultBarInfo.name}</h2>
        <p className="text-[10px] tracking-wider uppercase font-semibold">{defaultBarInfo.tagline}</p>
        <p className="text-[10px] text-gray-800">{defaultBarInfo.address}</p>
        <p className="text-[10px] text-gray-800">Ph: {defaultBarInfo.phone}</p>
        {defaultBarInfo.gst && <p className="text-[10px] font-bold">{defaultBarInfo.gst}</p>}
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Invoice Meta */}
      <div className="text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span>Date: {dateFormatted}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Bill No: #{sale.invoiceNumber}</span>
          <span>Pay: {sale.paymentMethod === "BORROW" ? "CREDIT / BORROW" : (sale.paymentMethod || "CASH")}</span>
        </div>
        {(sale.customerName || sale.customer?.name) && (
          <div className="flex justify-between font-bold text-[10px] bg-gray-100 p-0.5">
            <span>Cust: {sale.customerName || sale.customer?.name}</span>
            <span>Ph: {sale.customerPhone || sale.customer?.phone}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-700">
          <span>Cashier: {sale.cashier?.name || "Admin"}</span>
          <span>Status: {sale.paymentStatus || (sale.paymentMethod === "BORROW" ? "UNPAID" : "PAID")}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Table Header */}
      <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-black">
        <span className="w-1/2 text-left">ITEM</span>
        <span className="w-1/6 text-center">QTY</span>
        <span className="w-1/6 text-right">RATE</span>
        <span className="w-1/6 text-right">AMT</span>
      </div>

      {/* Items List */}
      <div className="py-1 space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-baseline text-[11px]">
            <span className="w-1/2 font-semibold truncate">
              {item.productName || item.product?.name || "Bottle Item"}
            </span>
            <span className="w-1/6 text-center text-gray-800">{item.quantity}</span>
            <span className="w-1/6 text-right text-gray-800">{item.unitPrice || item.price}</span>
            <span className="w-1/6 text-right font-medium">{item.total}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Summary */}
      <div className="text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span>Total Items:</span>
          <span>{totalItemsCount}</span>
        </div>
        {sale.discount > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{sale.subtotal || sale.items?.reduce((s, i) => s + (i.total || 0), 0) || (sale.grandTotal + sale.discount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>
                Discount{sale.discountType === "PERCENT" && sale.discountValue ? ` (${sale.discountValue}%)` : ""}:
              </span>
              <span>- ₹{sale.discount}</span>
            </div>
          </>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span>Tax (GST):</span>
            <span>+ ₹{sale.tax}</span>
          </div>
        )}
      </div>

      <div className="border-t-2 border-black my-1.5" />

      {/* Grand Total */}
      <div className="flex justify-between text-sm font-black py-0.5">
        <span>NET TOTAL:</span>
        <span>₹{sale.grandTotal}</span>
      </div>

      <div className="border-t-2 border-black my-1.5" />

      {/* Footer */}
      <div className="text-center pt-2 space-y-1 text-[10px]">
        <p className="font-bold">*** {defaultBarInfo.footer.toUpperCase()} ***</p>
        <p className="text-[9px] text-gray-700 italic">
          Liquor consumption is injurious to health.
        </p>
        <p className="text-[8px] text-gray-500">
          Software: Surya Bar POS
        </p>
      </div>
    </div>
  )
}
