import apiClient, { refreshAccessToken } from './lib/apiClient.js'

function unwrapResponse(response) {
  return response.data
}

function toErrorMessage(error) {
  return error.response?.data?.message ?? error.message ?? '요청 처리 중 오류가 발생했습니다.'
}

function toRequestError(error) {
  const requestError = new Error(toErrorMessage(error))
  requestError.status = error.response?.status ?? null
  requestError.isNetworkError = !error.response
  return requestError
}

function shouldUsePostMultipart(payload = {}) {
  return Array.isArray(payload.images) || Array.isArray(payload.retainedAttachmentIds)
}

function buildPostMultipartPayload(payload) {
  const formData = new FormData()
  const requestPayload = {
    category: payload.category,
    title: payload.title,
    content: payload.content,
  }

  if (Array.isArray(payload.retainedAttachmentIds)) {
    requestPayload.retainedAttachmentIds = payload.retainedAttachmentIds
  }

  formData.append(
    'request',
    new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }),
  )

  for (const image of payload.images ?? []) {
    formData.append('images', image)
  }

  return formData
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

export async function requestEmailVerification(payload) {
  try {
    const response = await apiClient.post('/api/auth/email-verification/request', payload, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function requestPasswordReset(payload) {
  try {
    const response = await apiClient.post('/api/auth/password-reset/request', payload, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function confirmEmailVerification(payload) {
  try {
    const response = await apiClient.post('/api/auth/email-verification/confirm', payload, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function confirmPasswordReset(payload) {
  try {
    const response = await apiClient.post('/api/auth/password-reset/confirm', payload, {
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
    throw toRequestError(error)
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
    const accessToken = await refreshAccessToken()
    return {
      data: {
        accessToken,
      },
    }
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function clearRefreshCookie() {
  try {
    const response = await apiClient.post('/api/session/clear-refresh-cookie', null, {
      _skipAuthRefresh: true,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
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

export async function updateMyProfile(payload) {
  try {
    const response = await apiClient.patch('/api/users/me/profile', payload)
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

export async function changeMyPassword(payload) {
  try {
    const response = await apiClient.patch('/api/users/me/password', payload)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getHome() {
  try {
    const response = await apiClient.get('/api/home')
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function createFeedback(payload) {
  try {
    const response = await apiClient.post('/api/feedbacks', payload)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function retryFeedbackNotification(feedbackId) {
  try {
    const response = await apiClient.post(`/api/feedbacks/${feedbackId}/notification-retry`)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
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

export async function createPost(payload) {
  try {
    const response = await apiClient.post(
      '/api/posts',
      shouldUsePostMultipart(payload) ? buildPostMultipartPayload(payload) : payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function updatePost(postId, payload) {
  try {
    const response = await apiClient.put(
      `/api/posts/${postId}`,
      shouldUsePostMultipart(payload) ? buildPostMultipartPayload(payload) : payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getPost(postId) {
  try {
    const response = await apiClient.get(`/api/posts/${postId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function deletePost(postId) {
  try {
    const response = await apiClient.delete(`/api/posts/${postId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getQna(params) {
  try {
    const response = await apiClient.get('/api/qna', {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getQnaDetail(feedbackId) {
  try {
    const response = await apiClient.get(`/api/qna/${feedbackId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getAdminFeedbacks(params) {
  try {
    const response = await apiClient.get('/api/admin/feedbacks', {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function getAdminFeedback(feedbackId) {
  try {
    const response = await apiClient.get(`/api/admin/feedbacks/${feedbackId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function updateAdminFeedbackAnswer(feedbackId, payload) {
  try {
    const response = await apiClient.patch(`/api/admin/feedbacks/${feedbackId}/answer`, payload)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function updateAdminFeedbackVisibility(feedbackId, payload) {
  try {
    const response = await apiClient.patch(`/api/admin/feedbacks/${feedbackId}/visibility`, payload)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function getAdminMemos(params) {
  try {
    const response = await apiClient.get('/api/admin/memos', {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function getAdminMemo(memoId) {
  try {
    const response = await apiClient.get(`/api/admin/memos/${memoId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function createAdminMemo(payload) {
  try {
    const response = await apiClient.post('/api/admin/memos', payload)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function updateAdminMemo(memoId, payload) {
  try {
    const response = await apiClient.patch(`/api/admin/memos/${memoId}`, payload)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function deleteAdminMemo(memoId) {
  try {
    const response = await apiClient.delete(`/api/admin/memos/${memoId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw toRequestError(error)
  }
}

export async function getComments(postId, params) {
  try {
    const response = await apiClient.get(`/api/posts/${postId}/comments`, {
      params,
    })
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function createComment(postId, payload) {
  try {
    const response = await apiClient.post(`/api/posts/${postId}/comments`, payload)
    return unwrapResponse(response)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function deleteComment(postId, commentId) {
  try {
    const response = await apiClient.delete(`/api/posts/${postId}/comments/${commentId}`)
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
