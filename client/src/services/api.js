import axios from 'axios'

const API_URL="http://localhost:5000/api"

const api=axios.create({
    baseURL:API_URL,
    headers:{
        "Content-Type":"application/json"
    }
})

api.interceptors.request.use(
    (config)=>{
        const token=localStorage.getItem("token")

        if(token){
            config.headers.Authorization=`Bearer ${token}`
        }
        return config
    },
    (error)=>{
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response)=> response,
    (error)=>{
        if(error.response?.status === 401){
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            window.location.href='/login'
        }
        return Promise.reject(error)
    }
)

export const authAPI={
    register:(data)=>api.post("auth/register",data),
    login:(data)=>api.post("auth/login",data)
}

export const notesAPI={
    create:(data)=>api.post("/notes",data),
    getAll:()=>api.get("/notes"),
    getOne:(id)=>api.get(`/notes/${id}`),
    update:(id,data)=>api.put(`/notes/${id}`,data),
    delete:(id)=>api.delete(`/notes/${id}`),

    generateJoinCode:(noteId)=>api.post(`/notes/${noteId}/generate-code`),
    revokeJoinCode:(noteId)=>api.post(`/notes/${noteId}/revoke-code`),
    joinNote:(joinCode)=>api.post("/notes/join",{joinCode}),
    getCollaborators:(noteId)=>api.get(`/notes/${noteId}/collaborators`),
    removeCollaborators:(noteId,userId)=>api.delete(`/notes/${noteId}/collaborators/${userId}`)
}
export const summaryAPI={
    generateSummary:(noteId,selectedText)=>{
        console.log(selectedText)
        return api.post(`/notes/${noteId}/summarize`,{selectedText})},
    getRecent:(noteId)=>api.get(`/notes/${noteId}/summarize`)
}
export default api