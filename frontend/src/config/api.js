export const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost" && window.location.port === "5173"
  ? "http://localhost:8000"
  : "";

export const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";
