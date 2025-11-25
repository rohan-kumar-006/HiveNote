import React, { useEffect, useState } from 'react'
import { X, Copy, Check, Loader2 } from "lucide-react"
import { summaryAPI } from "../services/api.js"

const SummaryModal = ({ isOpen, onClose, noteId, selectedText }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [summary, setSummary] = useState(null)
    const [recentSummaries, setRecentSummaries] = useState([])
    const [warning, setWarning] = useState(null)
    const [copied, setCopied] = useState(null)

    useEffect(() => {
        if (isOpen && selectedText) {
            generateSummary();
        }
    }, [isOpen, selectedText])

    const generateSummary = async () => {
        setLoading(true)
        setError(null)
        setSummary(null)
        setWarning(null)
        try {
            // console.log(selectedText)
            const response = await summaryAPI.generateSummary(noteId, selectedText)
            setSummary(response.data.data)

            if (response.data.warning) {
                setWarning(response.data.warning)
            }
            fetchRecentSummary()
        } catch (error) {
            console.error("Failed to generate summary", error)
            setError(error.response?.data?.error || "Failed to generate Summary")
        } finally {
            setLoading(false)
        }
    }
    const fetchRecentSummary = async () => {
        try {
            const response = await summaryAPI.getRecent(noteId)
            setRecentSummaries(response.data.data)
        } catch (error) {
            setError("Failed to fetch recent summaries", error)
        }
    }
    const handleCopy = () => {
        if (summary) {
            navigator.clipboard.writeText(summary.summary)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }
    const formatDate = (date) => {
        const diff = (Date.now() - new Date(date)) / 60000
        if (diff < 1) return "just now"
        if (diff < 60) return `${Math.floor(diff)} min ago`

        const hours = diff / 60;

        if (hours < 24) return `${Math.floor(hours)} hours ago`
        return `${Math.floor(hours / 24)} days ago`
    }

    if (!isOpen) return null;
    return (
        <>
            <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-40' onClick={onClose} />
            <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
                <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden'>
                    <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
                        <h2 className='hext-xl font-bold text-gray-900'>
                            ✨ AI Summary
                        </h2>
                        <button className='text-gray-400 hover:text-gray-600 transition' onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* main content ke liye */}

                    <div className='overflow-y-auto max-h-[65vh] px-6 py-4'>
                        {warning &&
                            <div className='bg-yellow-50 text-yellow-800 rounded-md px-4 py-3 mb-4 text-sm'>
                                {warning}
                            </div>
                        }
                        {error &&
                            <div className='bg-red-50 text-red-800 rounded-md px-4 py-3 mb-4 text-sm'>
                                {error}
                            </div>
                        }
                        {(loading && !summary)?(
                            <div className='flex justify-center items-center h-64'>
                                <div className='rounded-full h-12 w-12 border-b-2 border-indigo-500 animate-spin'></div>
                            </div>
                        ) : summary && (
                            <div className='mb-6'>
                                <div className='bg-indigo-50 rounded-lg p-4 mb-4'>
                                    <p className='text-gray-800 leading-relaxed'>
                                        {summary.summary}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Generated {formatDate(summary.createdAt)}
                                        {summary.tokenUsed && ` • ${summary.tokenUsed} tokens`}
                                    </span>
                                    <button
                                        onClick={handleCopy}
                                        className='flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-medium'
                                    >
                                        {copied ? (<>
                                            <Check size={16} /> Copied!
                                        </>
                                        )
                                            : (
                                                <>
                                                    <Copy size={16} />
                                                    Copy
                                                </>
                                            )}
                                    </button>
                                </div>
                            </div>
                        )}
                        {recentSummaries.length > 0 && (
                            <div>
                                <h3 className='text-sm font-semibold text-gray-700 mb-3'>
                                    Recent Sumamries
                                </h3>
                                <div className='space-y-2'>
                                    {recentSummaries.map((item) => (
                                        <div
                                            key={item._id}
                                            className='bg-gray-50 rounded-md p-3 border-gray-200 hover:border-indigo-300 transition cursor-pointer'
                                            onClick={() => {
                                                setSummary(item)
                                                setError(null)
                                            }}
                                        >
                                            <p className='text-sm text-gray-800 line-clamp-2 mb-2'>
                                                {item.summary}
                                            </p>
                                            <div className='flex items-center justify-between text-xs text-gray-500'>
                                                <span>
                                                    {formatDate(item.createdAt)} by {item.generatedBy.name}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* footer ke liye */}
                    <div className='border-t border-gray-200 px-6 py-4 bg-gray-50'>
                        <button onClick={onClose}
                            className='w-full bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700'
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SummaryModal