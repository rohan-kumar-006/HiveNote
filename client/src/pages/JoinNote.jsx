import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { notesAPI } from '../services/api'
import Navbar from '../components/Navbar'
import{X} from "lucide-react"

const JoinNote = () => {
    const [joinCode,setJoinCode]=useState("")
    const [loading,setLoading]=useState(null)
    const [error,setError]=useState("")
    const navigate=useNavigate()
    const {code}=useParams()

    useEffect(()=>{
        if(code){
            setJoinCode(code)
        }
    },[code])

    const handleJoin=async (e)=>{
        e.preventDefault()
        setError("")
        setLoading(true)

        try{
            const {data}= await notesAPI.joinNote(joinCode)
            alert(data.message)
            navigate(`/editor/${data.noteId}`)
        }catch(error){
            setError(error.response?.data?.error || "Failed to join note")
        }finally{
            setLoading(false)
        }
    }
  return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-md mx-auto px-4 py-16">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className='flex justify-between mb-6 items-center'> 

                    <h1 className="text-2xl inline font-bold  text-center">Join Collaborative Note</h1>
                    <button onClick={()=>{navigate("/dashboard")}}  className="text-black-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                    </div>
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Join Code
                            </label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXXXX"
                                maxLength={8}
                                className="w-full p-3 border rounded-md font-mono text-lg text-center uppercase"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || joinCode.length !== 8}
                            className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Joining..." : "Join Note"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default JoinNote