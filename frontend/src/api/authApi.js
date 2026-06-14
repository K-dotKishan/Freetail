import api from './client'

export const login = (username, password) =>
  api.post('/auth/login/', { username, password })

export const register = (data) =>
  api.post('/auth/register/', data)

export const getMe = () =>
  api.get('/auth/me/')

export const updateMe = (data) =>
  api.patch('/auth/me/', data)

export const getUsers = () =>
  api.get('/auth/users/')
