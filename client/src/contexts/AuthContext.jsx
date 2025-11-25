import { createContext, useContext, useEffect, useState } from "react";
import socketServices from "../services/socket.js"
import { authAPI } from "../services/api";

const AuthContext = createContext()

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }

    return context;
}

const isTokenExpired=(token)=>{
    if(!token) return true;
    try{
        const parts=token.split(".")
        const base64Playload=parts[1]
        const payload=JSON.parse(atob(base64Playload))
        return Date.now() >= payload.exp*1000
    }catch{
        return true
    }
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem("token")
        const userData = localStorage.getItem("user")
        if (token && userData && !isTokenExpired(token)) {
            setUser(JSON.parse(userData))
            socketServices.connect()
            // console.log("JSON.parse(userData)",JSON.parse(userData))
    
        }else{
            localStorage.removeItem("token")
            localStorage.removeItem("user")
        }
        setLoading(false);
    }, [])

    const login = async (email, password) => {
        try {   
            const { data } = await authAPI.login({ email, password })
            console.log(data)
            localStorage.setItem("token", data.token)
            localStorage.setItem("user", JSON.stringify(data.user))
            setUser(data.user)
            socketServices.connect()
            return data
        } catch (error) {
            console.log(error.response?.data?.error)
            return {
                success: false,
                error: error.response?.data?.error || "Login Failed"
            }
        }
    }
    const register = async (name, email, password) => {
        try {
            const { data } = await authAPI.register({ name, email, password })
            localStorage.setItem("token", data.token)
            localStorage.setItem("user", JSON.stringify(data.user))
            setUser(data.user)
            socketServices.connect();
            return data
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Registration Failed"
            }
        }
    }

    const logout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
        socketServices.disconnect()
    }
    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}