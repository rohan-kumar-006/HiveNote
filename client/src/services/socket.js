import { io } from 'socket.io-client'

class SocketServices {
    socket = null

    connect() {
        // Don't create multiple connections
        if (this.socket && this.socket.connected) {
            return this.socket
        }

        const token = localStorage.getItem("token")

        if (!token) {
            return null
        }
        
        this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            auth: {
                token
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })
        
        this.socket.on("connect", () => {
            console.log("Socket Successfully Connected", this.socket.id)
        })
        
        this.socket.on("connect_error", (error) => {
            console.log("Socket Connection Error", error.message)
        })

        return this.socket
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }
    }
    
    joinDoc(docId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("joinDoc", docId)
        }
    }
    
    sendYjsUpdate(docId, updateBase64) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("yjs-update", { docId, updateBase64 })
        }
    }
    
    sendPresence(payload) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("presence", payload)
        }
    }
    
    onYjsUpdate(callback) {
        if (this.socket) {
            this.socket.on("yjs-update", callback)
        }
    }
    
    onPresenceUpdate(callback) {
        if (this.socket) {
            this.socket.on("presenceUpdate", callback)
        }
    }
    
    off(event, callback) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback)
            } else {
                this.socket.off(event)
            }
        }
    }
}

export default new SocketServices()