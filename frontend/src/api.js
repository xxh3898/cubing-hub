import apiClient from './lib/apiClient.js'

function unwrapResponse(response) {
  return response.data
}

function toErrorMessage(error) {
  return error.response?.data?.message ?? error.message ?? '요청 처리 중 오류가 발생했습니다.'
}

function withAuthorization(accessToken) {
  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : {}
}

export async function signUp(payload) {
  try {
    const response = await apiClient.post('/api/auth/signup', payload)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function login(payload) {
  try {
    const response = await apiClient.post('/api/auth/login', payload)
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

export async function saveRecord(accessToken, payload) {
  try {
    const response = await apiClient.post('/api/records', payload, {
      headers: withAuthorization(accessToken),
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}
