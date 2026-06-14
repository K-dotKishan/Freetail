import api from './client'
import axios from 'axios'

export const uploadCSV = (groupId, file) => {
  const form = new FormData()
  form.append('file', file)
  form.append('group_id', groupId)
  const token = localStorage.getItem('access_token')
  return axios.post('/api/imports/upload/', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export const getImportBatches = (groupId) =>
  api.get('/imports/', { params: groupId ? { group_id: groupId } : {} })

export const getImportBatch = (batchId) =>
  api.get(`/imports/${batchId}/`)

export const updateRowDecision = (batchId, rowId, decision, notes = '') =>
  api.patch(`/imports/${batchId}/rows/${rowId}/`, { decision, notes })

export const approveImport = (batchId, decisions, approveAllClean = false) =>
  api.post(`/imports/${batchId}/approve/`, { decisions, approve_all_clean: approveAllClean })

export const getImportReport = (batchId, format = 'json') =>
  api.get(`/imports/${batchId}/report/`, { params: { format } })
