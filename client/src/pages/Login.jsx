import { useRef, useState } from "react";
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Login() {
    const [formData, setFormData] = useState({ password: "", email: "" })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const result = await login(formData.email, formData.password);
        setLoading(false)

        if (result?.token) {
            navigate("/dashboard")
        } else {
            setError(result.error)
        }
    }
    return (
        <>
            <div className="min-h-screen flex justify-center items-center bg-gray-100">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        Sign In
                    </h1>

                    {error && (
                        <div className="bg-red-50 text-red-600 rounded-md px-4 py-3 mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Email */}
                        <div>
                            <label
                                className="block text-sm font-medium text-gray-700 mb-2"
                                htmlFor="email"
                            >
                                Email
                            </label>
                            <input
                                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                className="block text-sm font-medium text-gray-700 mb-2"
                                htmlFor="password"
                            >
                                Password
                            </label>
                            <input
                                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 transition disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>

                        <p className="text-center text-sm text-gray-600">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Sign Up
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </>
    )
}