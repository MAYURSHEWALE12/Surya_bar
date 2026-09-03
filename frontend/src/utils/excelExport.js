import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

/**
 * Styles a single cell with background, font, alignment, and border
 */
const styleCell = (cell, {
  fillColor,
  fontColor = "FFFFFF",
  fontSize = 11,
  bold = false,
  align = "left",
  vertical = "middle",
  numFmt,
  border = true,
}) => {
  if (fillColor) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillColor },
    }
  }

  cell.font = {
    name: "Calibri",
    size: fontSize,
    bold,
    color: { argb: fontColor },
  }

  cell.alignment = {
    horizontal: align,
    vertical,
    wrapText: true,
  }

  if (numFmt) {
    cell.numFmt = numFmt
  }

  if (border) {
    cell.border = {
      top: { style: "thin", color: { argb: "E5E7EB" } },
      bottom: { style: "thin", color: { argb: "E5E7EB" } },
      left: { style: "thin", color: { argb: "E5E7EB" } },
      right: { style: "thin", color: { argb: "E5E7EB" } },
    }
  }
}

/**
 * Creates a visually styled Excel workbook with KPI cards, color palettes, visual bar charts, and auto-adjusted columns.
 */
export async function exportStyledAnalyticsExcel({
  reportTitle = "ANALYTICS & PERFORMANCE REPORT",
  themeColor = "581C87", // Primary purple
  accentColor = "9333EA",
  stockTypeName = "Non-TP Stock",
  metrics = [],
  topProducts = [],
  inventoryList = [],
  salesLog = [],
  filename = "SuryaBar_Analytics_Report",
}) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Surya Bar POS"
  workbook.created = new Date()

  // ==========================================
  // SHEET 1: EXECUTIVE DASHBOARD & SUMMARY
  // ==========================================
  const summarySheet = workbook.addWorksheet("Dashboard & Summary", {
    views: [{ showGridLines: true }],
  })

  // Set column widths
  summarySheet.columns = [
    { width: 4 },  // A (margin)
    { width: 34 }, // B: Product Name
    { width: 18 }, // C: Stock Category
    { width: 16 }, // D: Units Sold
    { width: 20 }, // E: Revenue
    { width: 28 }, // F: Visual Share
  ]

  // 1. Header Banner (Rows 2 - 3)
  summarySheet.mergeCells("B2:F2")
  const titleCell = summarySheet.getCell("B2")
  titleCell.value = `🍸 SURYA BAR & RESTAURANT`
  styleCell(titleCell, {
    fillColor: themeColor,
    fontColor: "FFFFFF",
    fontSize: 14,
    bold: true,
    align: "left",
  })
  summarySheet.getRow(2).height = 28

  summarySheet.mergeCells("B3:F3")
  const subtitleCell = summarySheet.getCell("B3")
  subtitleCell.value = `${reportTitle}  •  Stock Name: ${stockTypeName}  •  Generated: ${new Date().toLocaleString()}`
  styleCell(subtitleCell, {
    fillColor: "3B0764",
    fontColor: "E9D5FF",
    fontSize: 10,
    align: "left",
  })
  summarySheet.getRow(3).height = 20

  // 2. KPI Summary Cards (Rows 5 - 8)
  const cardRowTitle = summarySheet.getRow(5)
  cardRowTitle.getCell(2).value = "📊 EXECUTIVE KPI SUMMARY"
  styleCell(cardRowTitle.getCell(2), {
    fontColor: themeColor,
    fontSize: 12,
    bold: true,
    border: false,
  })

  // Metric Cards
  const kpiColors = [
    { bg: "FAF5FF", text: "581C87", border: "C084FC" },
    { bg: "EFF6FF", text: "1E40AF", border: "93C5FD" },
    { bg: "ECFDF5", text: "065F46", border: "6EE7B7" },
    { bg: "FFFBEB", text: "92400E", border: "FCD34D" },
  ]

  let curRow = 6
  metrics.forEach((m, idx) => {
    const r = summarySheet.getRow(curRow)
    r.height = 24
    const colorScheme = kpiColors[idx % kpiColors.length]

    r.getCell(2).value = m.label
    styleCell(r.getCell(2), {
      fillColor: colorScheme.bg,
      fontColor: "374151",
      fontSize: 11,
      bold: true,
    })

    r.getCell(3).value = m.stockType || stockTypeName
    styleCell(r.getCell(3), {
      fillColor: colorScheme.bg,
      fontColor: colorScheme.text,
      fontSize: 10,
      bold: true,
      align: "center",
    })

    r.getCell(4).value = m.value
    styleCell(r.getCell(4), {
      fillColor: colorScheme.bg,
      fontColor: colorScheme.text,
      fontSize: 12,
      bold: true,
      align: "right",
    })

    r.getCell(5).value = m.note || ""
    styleCell(r.getCell(5), {
      fillColor: colorScheme.bg,
      fontColor: "6B7280",
      fontSize: 10,
      align: "left",
    })

    curRow++
  })

  curRow += 2

  // 3. Top Products Performance Table
  const prodHeaderRow = summarySheet.getRow(curRow)
  prodHeaderRow.getCell(2).value = "🏆 TOP SELLING PRODUCTS & VOLUME"
  styleCell(prodHeaderRow.getCell(2), {
    fontColor: themeColor,
    fontSize: 12,
    bold: true,
    border: false,
  })
  curRow++

  // Table Headers
  const thRow = summarySheet.getRow(curRow)
  thRow.height = 26
  thRow.getCell(2).value = "Product Name"
  thRow.getCell(3).value = "Stock Category"
  thRow.getCell(4).value = "Units Sold"
  thRow.getCell(5).value = "Revenue (₹)"
  thRow.getCell(6).value = "Volume Share Visual"

  ;[2, 3, 4, 5, 6].forEach((col) => {
    styleCell(thRow.getCell(col), {
      fillColor: themeColor,
      fontColor: "FFFFFF",
      bold: true,
      fontSize: 11,
      align: col === 2 ? "left" : col === 3 ? "center" : col === 6 ? "left" : "right",
    })
  })
  curRow++

  const maxRevenue = Math.max(...topProducts.map((p) => p.revenue || 0), 1)

  topProducts.forEach((prod, index) => {
    const r = summarySheet.getRow(curRow)
    r.height = 22
    const isEven = index % 2 === 0
    const rowBg = isEven ? "FFFFFF" : "F9FAFB"

    // Product Name
    r.getCell(2).value = prod.name
    styleCell(r.getCell(2), { fillColor: rowBg, fontColor: "1F2937", bold: true })

    // Stock Name / Category
    r.getCell(3).value = prod.stockType || stockTypeName
    styleCell(r.getCell(3), { fillColor: rowBg, fontColor: themeColor, bold: true, align: "center", fontSize: 10 })

    // Quantity Sold
    r.getCell(4).value = Number(prod.quantity) || 0
    styleCell(r.getCell(4), { fillColor: rowBg, fontColor: "374151", align: "right", numFmt: "#,##0" })

    // Revenue
    r.getCell(5).value = Number(prod.revenue) || 0
    styleCell(r.getCell(5), {
      fillColor: rowBg,
      fontColor: themeColor,
      bold: true,
      align: "right",
      numFmt: "₹ #,##0",
    })

    // Visual Graph Bar in Excel
    const percentage = Math.round(((prod.revenue || 0) / maxRevenue) * 100)
    const barLength = Math.max(1, Math.round(percentage / 7))
    const barVisual = "█".repeat(barLength) + " " + percentage + "%"
    r.getCell(6).value = barVisual
    styleCell(r.getCell(6), {
      fillColor: rowBg,
      fontColor: accentColor,
      bold: true,
      fontSize: 10,
    })

    curRow++
  })

  // Summary Total Row
  if (topProducts.length > 0) {
    const totalRow = summarySheet.getRow(curRow)
    totalRow.height = 24
    totalRow.getCell(2).value = "TOTAL"
    styleCell(totalRow.getCell(2), { fillColor: "F3E8FF", fontColor: themeColor, bold: true })

    totalRow.getCell(3).value = stockTypeName
    styleCell(totalRow.getCell(3), { fillColor: "F3E8FF", fontColor: themeColor, bold: true, align: "center" })

    const totalQty = topProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)
    totalRow.getCell(4).value = totalQty
    styleCell(totalRow.getCell(4), { fillColor: "F3E8FF", fontColor: themeColor, bold: true, align: "right", numFmt: "#,##0" })

    const totalRev = topProducts.reduce((sum, p) => sum + (p.revenue || 0), 0)
    totalRow.getCell(5).value = totalRev
    styleCell(totalRow.getCell(5), { fillColor: "F3E8FF", fontColor: themeColor, bold: true, align: "right", numFmt: "₹ #,##0" })

    totalRow.getCell(6).value = "100% of top items"
    styleCell(totalRow.getCell(6), { fillColor: "F3E8FF", fontColor: "6B7280", fontSize: 10, align: "left" })
  }

  // ==========================================
  // SHEET 2: LIVE STOCK INVENTORY
  // ==========================================
  if (inventoryList && inventoryList.length > 0) {
    const invSheet = workbook.addWorksheet("Live Stock Inventory", {
      views: [{ showGridLines: true }],
    })

    invSheet.columns = [
      { width: 34 }, // Product Name
      { width: 14 }, // Size
      { width: 18 }, // Stock Name / Type
      { width: 18 }, // Bottles in Stock
      { width: 18 }, // Rate (₹)
      { width: 22 }, // Total Value (₹)
    ]

    // Title
    invSheet.mergeCells("A1:F1")
    const invTitle = invSheet.getCell("A1")
    invTitle.value = `📦 LIVE INVENTORY & STOCK VALUATION REPORT`
    styleCell(invTitle, {
      fillColor: "065F46", // Emerald header
      fontColor: "FFFFFF",
      fontSize: 13,
      bold: true,
      align: "center",
    })
    invSheet.getRow(1).height = 28

    // Headers
    const headers = ["Product / Bottle Name", "Size", "Stock Category", "Stock in Hand (Qty)", "Unit Price (₹)", "Stock Value (₹)"]
    const headerRow = invSheet.getRow(2)
    headerRow.height = 24
    headers.forEach((h, idx) => {
      styleCell(headerRow.getCell(idx + 1), {
        fillColor: "047857",
        fontColor: "FFFFFF",
        bold: true,
        fontSize: 10,
        align: idx === 3 || idx === 4 || idx === 5 ? "right" : idx === 1 || idx === 2 ? "center" : "left",
      })
      headerRow.getCell(idx + 1).value = h
    })

    let totalStockQty = 0
    let totalStockVal = 0

    inventoryList.forEach((item, i) => {
      const r = invSheet.getRow(i + 3)
      r.height = 20
      const isEven = i % 2 === 0
      const rowBg = isEven ? "FFFFFF" : "F9FAFB"

      const qty = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      const val = qty * price
      totalStockQty += qty
      totalStockVal += val

      r.getCell(1).value = item.productName || "Item"
      styleCell(r.getCell(1), { fillColor: rowBg, fontColor: "111827", bold: true, align: "left" })

      r.getCell(2).value = item.size || "-"
      styleCell(r.getCell(2), { fillColor: rowBg, fontColor: "6B7280", align: "center", fontSize: 10 })

      r.getCell(3).value = item.stockType === "NON_TP" ? "Non-TP Stock" : "TP Stock"
      const typeBg = item.stockType === "NON_TP" ? "F3E8FF" : "EFF6FF"
      const typeColor = item.stockType === "NON_TP" ? "7E22CE" : "1D4ED8"
      styleCell(r.getCell(3), { fillColor: typeBg, fontColor: typeColor, bold: true, align: "center", fontSize: 10 })

      r.getCell(4).value = qty
      styleCell(r.getCell(4), { fillColor: rowBg, fontColor: qty > 0 ? "065F46" : "DC2626", bold: true, align: "right", numFmt: "#,##0" })

      r.getCell(5).value = price
      styleCell(r.getCell(5), { fillColor: rowBg, fontColor: "374151", align: "right", numFmt: "₹ #,##0" })

      r.getCell(6).value = val
      styleCell(r.getCell(6), { fillColor: rowBg, fontColor: "047857", bold: true, align: "right", numFmt: "₹ #,##0" })
    })

    // Total Row
    const tRow = invSheet.getRow(inventoryList.length + 3)
    tRow.height = 24
    tRow.getCell(1).value = "TOTAL INVENTORY"
    styleCell(tRow.getCell(1), { fillColor: "D1FAE5", fontColor: "065F46", bold: true })
    tRow.getCell(2).value = ""
    styleCell(tRow.getCell(2), { fillColor: "D1FAE5" })
    tRow.getCell(3).value = `${inventoryList.length} Products`
    styleCell(tRow.getCell(3), { fillColor: "D1FAE5", fontColor: "065F46", bold: true, align: "center" })

    tRow.getCell(4).value = totalStockQty
    styleCell(tRow.getCell(4), { fillColor: "D1FAE5", fontColor: "065F46", bold: true, align: "right", numFmt: "#,##0" })
    tRow.getCell(5).value = ""
    styleCell(tRow.getCell(5), { fillColor: "D1FAE5" })
    tRow.getCell(6).value = totalStockVal
    styleCell(tRow.getCell(6), { fillColor: "D1FAE5", fontColor: "065F46", bold: true, align: "right", numFmt: "₹ #,##0" })
  }

  // ==========================================
  // SHEET 3: DETAILED TRANSACTION SALES LOG
  // ==========================================
  if (salesLog && salesLog.length > 0) {
    const logSheet = workbook.addWorksheet("Detailed Sales Log", {
      views: [{ showGridLines: true }],
    })

    logSheet.columns = [
      { width: 16 }, // Bill No
      { width: 22 }, // Date & Time
      { width: 30 }, // Item Name
      { width: 18 }, // Stock Name / Type
      { width: 14 }, // Qty
      { width: 16 }, // Rate
      { width: 18 }, // Total
      { width: 16 }, // Discount
      { width: 16 }, // Payment Method
    ]

    // Log Title
    logSheet.mergeCells("A1:I1")
    const logTitle = logSheet.getCell("A1")
    logTitle.value = `ITEMIZED SALES TRANSACTION LOG`
    styleCell(logTitle, {
      fillColor: themeColor,
      fontColor: "FFFFFF",
      fontSize: 13,
      bold: true,
      align: "center",
    })
    logSheet.getRow(1).height = 28

    // Headers
    const headers = ["Bill #", "Date & Time", "Product Name", "Stock Name / Type", "Qty", "Price (₹)", "Total (₹)", "Bill Discount (₹)", "Payment"]
    const headerRow = logSheet.getRow(2)
    headerRow.height = 24
    headers.forEach((h, idx) => {
      styleCell(headerRow.getCell(idx + 1), {
        fillColor: "4A154B",
        fontColor: "FFFFFF",
        bold: true,
        fontSize: 10,
        align: idx === 4 || idx === 5 || idx === 6 || idx === 7 ? "right" : idx === 3 ? "center" : "left",
      })
      headerRow.getCell(idx + 1).value = h
    })

    // Data Rows
    salesLog.forEach((row, i) => {
      const r = logSheet.getRow(i + 3)
      r.height = 20
      const isEven = i % 2 === 0
      const rowBg = isEven ? "FFFFFF" : "F9FAFB"

      r.getCell(1).value = row.invoiceNumber || row.billNumber || "-"
      styleCell(r.getCell(1), { fillColor: rowBg, fontColor: "2563EB", bold: true, align: "center" })

      r.getCell(2).value = row.date || "-"
      styleCell(r.getCell(2), { fillColor: rowBg, fontColor: "4B5563", fontSize: 10, align: "center" })

      r.getCell(3).value = row.productName || "Item"
      styleCell(r.getCell(3), { fillColor: rowBg, fontColor: "111827", bold: true, align: "left" })

      const sName = row.stockType === "NON_TP" ? "Non-TP Stock" : "TP Stock"
      r.getCell(4).value = sName
      const typeBg = row.stockType === "NON_TP" ? "F3E8FF" : "EFF6FF"
      const typeColor = row.stockType === "NON_TP" ? "7E22CE" : "1D4ED8"
      styleCell(r.getCell(4), { fillColor: typeBg, fontColor: typeColor, bold: true, align: "center", fontSize: 10 })

      r.getCell(5).value = Number(row.quantity) || 1
      styleCell(r.getCell(5), { fillColor: rowBg, fontColor: "111827", align: "right", numFmt: "#,##0" })

      r.getCell(6).value = Number(row.price) || 0
      styleCell(r.getCell(6), { fillColor: rowBg, fontColor: "374151", align: "right", numFmt: "₹ #,##0" })

      r.getCell(7).value = Number(row.total) || 0
      styleCell(r.getCell(7), { fillColor: rowBg, fontColor: "059669", bold: true, align: "right", numFmt: "₹ #,##0" })

      r.getCell(8).value = Number(row.discount) || 0
      styleCell(r.getCell(8), { fillColor: rowBg, fontColor: Number(row.discount) > 0 ? "DC2626" : "6B7280", bold: Number(row.discount) > 0, align: "right", numFmt: "₹ #,##0" })

      r.getCell(9).value = row.paymentMethod || "CASH"
      styleCell(r.getCell(9), { fillColor: rowBg, fontColor: "4B5563", align: "center", fontSize: 10 })
    })
  }

  // Generate & Save Buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  saveAs(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
