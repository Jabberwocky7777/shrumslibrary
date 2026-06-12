import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState('loading') // loading | ok | redirect

  useEffect(() => {
    axios.get('/api/auth/status')
      .then(({ data }) => setState(data.authenticated ? 'ok' : 'redirect'))
      .catch(() => setState('redirect'))
  }, [])

  if (state === 'loading') return null
  if (state === 'redirect') return <Navigate to="/login" replace />
  return children
}
