import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import Login from "../src/pages/Login.jsx"
import './App.css'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Editor from './pages/Editor.jsx'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoutes from './components/ProtectedRoutes.jsx'
import JoinNote from './pages/JoinNote.jsx'


function App() {

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/dashboard' element={
            <ProtectedRoutes>
              <Dashboard />
            </ProtectedRoutes>
          } />
          <Route path={"/editor/:id"} element={
            <ProtectedRoutes>
              <Editor />
            </ProtectedRoutes>
          } />
          <Route path='/join' element={
            <ProtectedRoutes>
              <JoinNote />
            </ProtectedRoutes>
          } />
          <Route path='/join/:code' element={
            <ProtectedRoutes>
              <JoinNote />
            </ProtectedRoutes>
          } />

          <Route path='/' element={<Navigate to={'/dashboard'} />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
