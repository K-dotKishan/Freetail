import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import { PageLoader } from './components/Spinner'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Expenses from './pages/Expenses'
import Balances from './pages/Balances'
import Settlements from './pages/Settlements'
import ImportCSV from './pages/ImportCSV'
import ImportReport from './pages/ImportReport'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/groups"      element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/expenses"    element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/balances"    element={<ProtectedRoute><Balances /></ProtectedRoute>} />
            <Route path="/settlements" element={<ProtectedRoute><Settlements /></ProtectedRoute>} />
            <Route path="/import"      element={<ProtectedRoute><ImportCSV /></ProtectedRoute>} />
            <Route path="/import/:batchId/report" element={<ProtectedRoute><ImportReport /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
