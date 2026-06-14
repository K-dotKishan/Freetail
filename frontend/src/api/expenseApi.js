import api from './client'

export const getExpenses = (groupId) =>
  api.get('/expenses/', { params: groupId ? { group: groupId } : {} })

export const getExpense = (id) => api.get(`/expenses/${id}/`)
export const createExpense = (data) => api.post('/expenses/', data)
export const updateExpense = (id, data) => api.patch(`/expenses/${id}/`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}/`)
export const getGroupBalances = (groupId) =>
  api.get(`/expenses/group/${groupId}/balances/`)
