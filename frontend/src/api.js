import apiClient from './lib/apiClient.js'

function unwrapResponse(response) {
  return response.data
}

function toErrorMessage(error) {
  return error.response?.data?.message ?? error.message ?? '요청 처리 중 오류가 발생했습니다.'
}

export async function signUp(payload) {
  try {
    const response = await apiClient.post('/api/auth/signup', payload, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function login(payload) {
  try {
    const response = await apiClient.post('/api/auth/login', payload, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function logout() {
  try {
    const response = await apiClient.post('/api/auth/logout', null, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function refreshSession() {
  try {
    const response = await apiClient.post('/api/auth/refresh', null, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getMe() {
  try {
    const response = await apiClient.get('/api/me')
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getMyProfile() {
  try {
    const response = await apiClient.get('/api/users/me/profile')
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getMyRecords(params) {
  try {
    const response = await apiClient.get('/api/users/me/records', {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getRankings(params) {
  try {
    const response = await apiClient.get('/api/rankings', {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getPosts(params) {
  try {
    const response = await apiClient.get('/api/posts', {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getScramble(eventType) {
  try {
    const response = await apiClient.get('/api/scramble', {
      params: { eventType },
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function saveRecord(payload) {
  try {
    const response = await apiClient.post('/api/records', payload)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function updateRecordPenalty(recordId, payload) {
  try {
    const response = await apiClient.patch(`/api/records/${recordId}`, payload)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function deleteRecord(recordId) {
  try {
    const response = await apiClient.delete(`/api/records/${recordId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}
