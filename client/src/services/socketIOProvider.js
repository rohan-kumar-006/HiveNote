import * as Y from 'yjs'
import { Observable } from 'lib0/observable'
import * as awarenessProtocol from 'y-protocols/awareness'
import socketService from './socket'

export class SocketIOProvider extends Observable {
    constructor(docId, ydoc) {
        super()

        if (!ydoc) {
            throw new Error('Yjs document is required')
        }

        this.doc = ydoc
        this.docId = docId
        this.awareness = new awarenessProtocol.Awareness(ydoc)
        this.connected = false
        this._synced = false
        this.updateHandler = null
        this.destroyed = false

        // Store callback references for proper cleanup
        this.callbacks = {
            docState: null,
            yjsUpdate: null,
            presenceUpdate: null,
            connect: null,
            disconnect: null,
            connectError: null
        }


        // Connect to socket
        this.socket = socketService.connect()

        if (this.socket) {
            this.setupSocketListeners()
            socketService.joinDoc(docId)
            this.requestInitialState()
        } else {
            console.error('Failed to connect socket')
        }
    }

    requestInitialState() {
        setTimeout(() => {
            if (this.socket && this.socket.connected && !this.destroyed) {
                this.socket.emit('requestDocState', this.docId)
            }
        }, 100)
    }

    setupSocketListeners() {
        if (!this.socket) return

        // Set initial connection state
        this.connected = this.socket.connected
        this.emit('status', { connected: this.socket.connected })

        // Handle initial document state
        this.callbacks.docState = ({ updateBase64 }) => {
            if (this.destroyed) return

            if (updateBase64) {
                try {
                    const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0))
                    Y.applyUpdate(this.doc, update, 'init')
                    this._synced = true
                    this.emit('synced', [this])
                } catch (error) {
                    console.error('Failed to apply initial state:', error)
                }
            } else {
                this._synced = true
                this.emit('synced', [this])
            }
        }
        this.socket.on('docState', this.callbacks.docState)

        // Handle incoming Yjs updates
        this.callbacks.yjsUpdate = ({ updateBase64, from }) => {
            if (this.destroyed) return
            
            if (from !== this.socket?.id) {
                try {
                    const update = Uint8Array.from(atob(updateBase64), c => c.charCodeAt(0))
                    Y.applyUpdate(this.doc, update, 'remote')
                } catch (error) {
                    console.error('Failed to apply remote update:', error)
                }
            }
        }
        socketService.onYjsUpdate(this.callbacks.yjsUpdate)

        // Handle presence updates
        this.callbacks.presenceUpdate = (payload) => {
            if (this.destroyed) return
            this.emit('awareness', [payload])
        }
        socketService.onPresenceUpdate(this.callbacks.presenceUpdate)

        // Listen for document changes and send to server
        this.updateHandler = (update, origin) => {
            if (this.destroyed) return
            
            // Only send updates that originate locally
            if (origin !== 'remote' && origin !== 'init') {
                this.sendYjsUpdate(update)
            }
        }
        this.doc.on('update', this.updateHandler)

        // Handle connection status
        this.callbacks.connect = () => {
            if (this.destroyed) return
            
            this.connected = true
            this.emit('status', { connected: true })
            console.log('Socket connected, ID:', this.socket.id)

            socketService.joinDoc(this.docId)
            this.requestInitialState()
        }
        this.socket.on('connect', this.callbacks.connect)

        this.callbacks.disconnect = () => {
            if (this.destroyed) return
            
            this.connected = false
            this._synced = false
            this.emit('status', { connected: false })
            console.log('Socket disconnected')
        }
        this.socket.on('disconnect', this.callbacks.disconnect)

        this.callbacks.connectError = (error) => {
            console.error('Socket connection error:', error)
        }
        this.socket.on('connect_error', this.callbacks.connectError)
    }

    sendYjsUpdate(update) {
        if (this.destroyed || !this.socket || !this.socket.connected) {
            return
        }

        try {
            const updateBase64 = btoa(String.fromCharCode(...update))
            socketService.sendYjsUpdate(this.docId, updateBase64)
        } catch (error) {
            console.error('Failed to send update:', error)
        }
    }

    sendAwarenessUpdate(awareness) {
        if (this.destroyed || !this.socket || !this.socket.connected) return

        socketService.sendPresence({
            docId: this.docId,
            awareness: awareness
        })
    }

    destroy() {
        if (this.destroyed) return
        
        this.destroyed = true

        // Remove document update handler
        if (this.updateHandler && this.doc) {
            this.doc.off('update', this.updateHandler)
            this.updateHandler = null
        }

        // Remove socket event listeners with stored callbacks
        if (this.socket) {
            if (this.callbacks.docState) {
                this.socket.off('docState', this.callbacks.docState)
            }
            if (this.callbacks.connect) {
                this.socket.off('connect', this.callbacks.connect)
            }
            if (this.callbacks.disconnect) {
                this.socket.off('disconnect', this.callbacks.disconnect)
            }
            if (this.callbacks.connectError) {
                this.socket.off('connect_error', this.callbacks.connectError)
            }
        }

        // Remove socketService listeners
        if (this.callbacks.yjsUpdate) {
            socketService.off('yjs-update', this.callbacks.yjsUpdate)
        }
        if (this.callbacks.presenceUpdate) {
            socketService.off('presenceUpdate', this.callbacks.presenceUpdate)
        }

        // Clear callbacks
        this.callbacks = {}

        super.destroy()
    }

    get synced() {
        return this._synced
    }
}