const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
dotenv.config()
const connectDB = require("./config/db.js")

const app = express()

// Connect to DB
connectDB()

// Middleware
app.use(
  cors({
    origin: true, // Echoes the request origin header for all domains (Vercel, custom domains, localhost)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-Disposition"],
  })
)
app.options("*", cors()) // Handle all preflight requests explicitly
app.use(express.json({ limit: "50mb" })) // Support large backup uploads

// Routes
app.use("/api/auth", require("./routes/auth.js"))
app.use("/api/products", require("./routes/products.js"))
app.use("/api/brands", require("./routes/brands.js"))
app.use("/api/categories", require("./routes/categories.js"))
app.use("/api/inventory", require("./routes/inventory.js"))
app.use("/api/sales", require("./routes/sales.js"))
app.use("/api/purchases", require("./routes/purchases.js"))
app.use("/api/vendors", require("./routes/vendors.js"))
app.use("/api/sale-returns", require("./routes/sale-returns.js"))
app.use("/api/expenses", require("./routes/expenses.js"))
app.use("/api/customers", require("./routes/customers.js"))
app.use("/api/audit-logs", require("./routes/audit-logs.js"))
app.use("/api/users", require("./routes/users.js"))
app.use("/api/backup", require("./routes/backup.js"))

// Health check endpoint (for pingers & keep-alive)
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Surya Bar POS API is running",
    timestamp: new Date().toISOString(),
  })
})

app.get("/health", (req, res) => {
  res.status(200).send("OK")
})

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", serverTime: new Date().toISOString() })
})

// Error handling
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Surya Bar Server running on port ${PORT}`)

  // Self-Ping Keep-Alive for Render (prevents 15-min inactivity sleep)
  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL
  if (renderExternalUrl) {
    const PING_INTERVAL = 14 * 60 * 1000 // Every 14 minutes (Render sleeps after 15 min)
    console.log(`[Keep-Alive] Initializing self-ping service for ${renderExternalUrl} every 14 mins`)
    setInterval(async () => {
      try {
        const fetchModule = globalThis.fetch || require("node:http")
        if (typeof globalThis.fetch === "function") {
          await globalThis.fetch(`${renderExternalUrl}/health`)
        } else {
          const http = renderExternalUrl.startsWith("https") ? require("https") : require("http")
          http.get(`${renderExternalUrl}/health`, (res) => {
            res.resume()
          }).on("error", () => {})
        }
        console.log(`[Keep-Alive] Pinged ${renderExternalUrl}/health successfully at ${new Date().toLocaleTimeString()}`)
      } catch (err) {
        console.warn(`[Keep-Alive] Ping warning: ${err.message}`)
      }
    }, PING_INTERVAL)
  }
})