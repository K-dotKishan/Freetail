import api from './client'

export const getGroups = () => api.get('/groups/')
export const getGroup = (id) => api.get(`/groups/${id}/`)
export const createGroup = (data) => api.post('/groups/', data)
export const updateGroup = (id, data) => api.patch(`/groups/${id}/`, data)
export const deleteGroup = (id) => api.delete(`/groups/${id}/`)
export const addMember = (groupId, data) => api.post(`/groups/${groupId}/members/`, data)
export const updateMembership = (groupId, membershipId, data) =>
  api.patch(`/groups/${groupId}/members/${membershipId}/`, data)
