import React, { use, useEffect, useState } from 'react'
import { notesAPI } from '../services/api'
import { X, Users, Copy, Check, Trash2 } from "lucide-react"

const ShareModal = ({ noteId, isOpen, onClose }) => {
    const [joinCode, setJoinCode] = useState(null)
    const [collaborators, setCollaborators] = useState([])
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const [owner, setOwner] = useState(null)

    useEffect(() => {
        if (isOpen) {
            fetchCollaborators()
        }
    }, [isOpen, noteId])

    const fetchCollaborators = async () => {
        try {
            const { data } = await notesAPI.getCollaborators(noteId)
            setCollaborators(data.collaborators)
            setOwner(data.owner)
            setJoinCode(data.joinCode)
        } catch (error) {
            alert("Failed to Fetch Collaborators", error)
        }
    }
    const generateCode = async () => {
        setLoading(true)
        try {
            const { data } = await notesAPI.generateJoinCode(noteId)
            // console.log(data)
            setJoinCode(data.joinCode)
        } catch (error) {
            alert("Failed to generate Code")
        } finally {
            setLoading(false)
        }
    }

    const revokeCode = async () => {
        if (!confirm("Revoke join code ? Existing Collaborator won't be affected")) {
            return
        }
        setLoading(true)
        try {
            await notesAPI.revokeJoinCode(noteId)
            setJoinCode(null)
        } catch (error) {
            alert("Failed to revoke code")
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(joinCode)
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    }
    const removeCollaborator = async (userId) => {
        if (!confirm("Remove this collaborator")) {
            return
        }
        try {
            await notesAPI.removeCollaborators(noteId, userId)
            setCollaborators(collaborators.filter(c => c.user._id !== userId))
        } catch (error) {
            alert("Failed to remove collaborator")
        }
    }
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 transition">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Share Note</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                {/* Join Code Section */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Join Code</h3>
                    {joinCode ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={joinCode}
                                    readOnly
                                    className="flex-1 p-2 border rounded font-mono text-lg"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                            <button
                                onClick={revokeCode}
                                disabled={loading}
                                className="text-sm border-2 border-red-400 bg-red-100 p-1 rounded-md font-bold text-red-400 hover:text-red-800"
                            >
                                Revoke Code
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={generateCode}
                            disabled={loading}
                            className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? "Generating..." : "Generate Join Code"}
                        </button>
                    )}
                </div>

                {/* Collaborators Section */}
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Users size={20} />
                        Collaborators ({collaborators.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {/* Owner */}
                        {owner && (
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                    <div className="font-medium">{owner.name}</div>
                                    <div className="text-sm text-gray-500">{owner.email}</div>
                                </div>
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                                    Owner
                                </span>
                            </div>
                        )}

                        {/* Collaborators */}
                        {collaborators
                        .filter(collab=>collab.role!=="owner")
                        .map((collab) => (
                            <div
                                key={collab.user._id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                                <div>
                                    <div className="font-medium">{collab.user.name}</div>
                                    <div className="text-sm text-gray-500">{collab.user.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        {collab.role}
                                    </span>
                                    <button
                                        onClick={() => removeCollaborator(collab.user._id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

}

export default ShareModal