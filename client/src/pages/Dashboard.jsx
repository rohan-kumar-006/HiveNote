import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { notesAPI } from '../services/api.js'
import Notecard from '../components/Notecard.jsx'



const Dashboard = () => {
    const [notes, setNotes] = useState([])
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { user } = useAuth()

    useEffect(() => {
        fetchNotes();
    }, [])

    const fetchNotes = async () => {
        try {
            const { data } = await notesAPI.getAll()
            setNotes(data.notes)
            // console.log(data)
        } catch (error) {
            console.error("Failed to fetch notes", error)
            setNotes([])
        } finally {
            setLoading(false)
        }
    }

    const createNewNote = async () => {
        try {
            const { data } = await notesAPI.create({ title: "Unitiled Note" })
            navigate(`/editor/${data?._id}`)
        } catch (error) {
            console.error("Failed to create note", error)
        }
    }
    const deleteNote = async (id) => {
        const response = window.confirm("Are you really want to delete the Note?")
        // console.log("deleteFunction to call ho rha")

        if (!response) {
            return
        }
        let message=""
        try {
            const {data} = await notesAPI.delete(id);
            message=data.message
            setNotes(notes.filter((note) => note._id != id))
        } catch (error) {
            console.error("Error deleting the note", error)
            message=error.response?.data?.message || "Failed to delete message"
        }finally{
            alert(message)
        }
    }

    return (
        <>
            <div className='min-h-screen bg-gray-50'>
                <Navbar />
                <div className='max-w-7xl mx-auto px-4 py-8'>
                    <div className='flex justify-between items-center mb-8'>
                        <h1 className='text-3xl font-bold text-gray-900'>My Notes</h1>
                        <div className='space-x-2'> 
                            
                        <button onClick={createNewNote}
                            className='bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 transition'>
                            + New Note
                        </button>
                        <button onClick={()=>{
                            navigate("/join")
                        }}
                            className='bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 transition'>
                            Join Note
                        </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : notes.length===0 ? (
                        <div className='text-center py-12'>
                            <p className='text-gray-500 mb-5'>No Notes Yet. Create your First Note!</p>
                            <button onClick={createNewNote} 
                            className='bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 transition'>
                                Create First Note
                            </button>
                        </div>
                    ) :(
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                            {notes.map((note)=>{
                                // {console.log("hello")}
                                return <Notecard
                                key={note._id}
                                note={note}
                                onDelete={deleteNote}
                                onClick={()=>navigate(`/editor/${note._id}`)}
                                />
                            })}
                        </div>
                    )
                    }
                </div>
            </div>
        </>
    )
}

export default Dashboard