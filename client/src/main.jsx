import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import axios from 'axios'
import App from './App'
import Search from './views/Search'
import Queue from './views/Queue'
import Library from './views/Library'
import Settings from './views/Settings'
import Login from './views/Login'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/global.css'

// Global 401 handler
axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedRoute><App /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/search" replace /> },
      { path: 'search', element: <Search /> },
      { path: 'queue', element: <Queue /> },
      { path: 'library', element: <Library /> },
      { path: 'settings/*', element: <Settings /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
