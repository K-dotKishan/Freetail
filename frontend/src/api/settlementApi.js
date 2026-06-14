import api from './client'

export const getSettlements = (groupId) =>
  api.get('/settlements/', { params: groupId ? { group: groupId } : {} })

export const createSettlement = (data) => api.post('/settlements/', data)
export const deleteSettlement = (id) => api.delete(`/settlements/${id}/`)
