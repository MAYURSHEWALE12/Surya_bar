import { useStore } from "../store/authStore"

export default function NotFound() {
  const { user, logout } = useStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">404 - Page Not Found</h2>
        <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
        {user && (
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mt-4"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  )
}