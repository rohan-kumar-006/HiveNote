import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from "react-router-dom"

const Navbar = () => {
    const {user,logout}=useAuth()
    const navigate=useNavigate()

    const handleLogout = async (e) => {
        logout();
        navigate("/login")
    }
    return (
        <nav className="bg-white shadow flex flex-cols justify-between px-20 py-2">
            <div className="flex items-center">
                <h1 className="text-xl font-bold">CollabNotes</h1>
            </div>
            <div className="flex items-center space-x-4">
                <span className="text-gray-700">Hello, 
                    { user?.name} 
                    </span>
                <button
                    onClick={handleLogout}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition"
                >
                    Logout
                </button>
            </div>
        </nav>
    )
}


export default Navbar