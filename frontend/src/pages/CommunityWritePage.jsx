/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPost, getEditablePost, updatePost } from '../api.js'
import { INPUT_LIMITS } from '../constants/inputLimits.js'
import { useAuth } from '../context/useAuth.js'

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const MAX_IMAGE_TOTAL_BYTES = 30 * 1024 * 1024

export function createPreviewItem(file) {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

export function getFileExtension(fileName) {
  const segments = fileName.split('.')
  return segments.length > 1 ? segments.at(-1).toLowerCase() : ''
}

export function revokePreviewUrls(images) {
  for (const image of images) {
    URL.revokeObjectURL(image.previewUrl)
  }
}

export default function CommunityWritePage() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('FREE')
  const [existingAttachments, setExistingAttachments] = useState([])
  const [newImages, setNewImages] = useState([])
  const [formErrorMessage, setFormErrorMessage] = useState(null)
  const [loadErrorMessage, setLoadErrorMessage] = useState(null)
  const [isPageLoading, setIsPageLoading] = useState(Boolean(id))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const newImagesRef = useRef([])
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const isEditMode = typeof id === 'string'
  const postId = isEditMode ? Number.parseInt(id, 10) : null
  const isAdmin = currentUser?.role === 'ROLE_ADMIN'
  const cancelPath = isEditMode && !Number.isNaN(postId) ? `/community/${postId}` : '/community'

  const clearNewImages = () => {
    setNewImages((current) => {
      revokePreviewUrls(current)
      return []
    })
  }

  useEffect(() => {
    if (!isAdmin && category === 'NOTICE') {
      setCategory('FREE')
    }
  }, [category, isAdmin])

  useEffect(() => {
    newImagesRef.current = newImages
  }, [newImages])

  useEffect(() => () => {
    revokePreviewUrls(newImagesRef.current)
  }, [])

  useEffect(() => {
    if (!isEditMode) {
      setTitle('')
      setContent('')
      setCategory('FREE')
      setExistingAttachments([])
      clearNewImages()
      setLoadErrorMessage(null)
      setFormErrorMessage(null)
      setIsPageLoading(false)
      return undefined
    }

    if (Number.isNaN(postId)) {
      setLoadErrorMessage('게시글을 찾을 수 없습니다.')
      setIsPageLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadPost = async () => {
      setIsPageLoading(true)
      setLoadErrorMessage(null)
      setFormErrorMessage(null)

      try {
        const response = await getEditablePost(postId)

        if (isCancelled) {
          return
        }

        const nextPost = response.data ?? null

        if (!nextPost) {
          setLoadErrorMessage('게시글을 찾을 수 없습니다.')
          return
        }

        setCategory(nextPost.category)
        setTitle(nextPost.title)
        setContent(nextPost.content)
        setExistingAttachments(nextPost.attachments ?? [])
        clearNewImages()
      } catch (error) {
        if (!isCancelled) {
          setLoadErrorMessage(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsPageLoading(false)
        }
      }
    }

    loadPost()

    return () => {
      isCancelled = true
    }
  }, [isEditMode, postId])

  const handleImageChange = (event) => {
    /* v8 ignore next -- browser file inputs provide a FileList on change */
    const nextFiles = Array.from(event.target.files ?? [])

    if (nextFiles.length === 0) {
      return
    }

    const totalCount = existingAttachments.length + newImages.length + nextFiles.length
    if (totalCount > INPUT_LIMITS.postImageCount) {
      setFormErrorMessage(`게시글 이미지는 최대 ${INPUT_LIMITS.postImageCount}장까지 첨부할 수 있습니다.`)
      event.target.value = ''
      return
    }

    const currentNewImageSize = newImages.reduce((sum, image) => sum + image.file.size, 0)
    const addedSize = nextFiles.reduce((sum, file) => sum + file.size, 0)
    if (currentNewImageSize + addedSize > MAX_IMAGE_TOTAL_BYTES) {
      setFormErrorMessage('새로 추가하는 이미지 전체 용량은 30MB 이하여야 합니다.')
      event.target.value = ''
      return
    }

    for (const file of nextFiles) {
      const extension = getFileExtension(file.name)

      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
        setFormErrorMessage('게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.')
        event.target.value = ''
        return
      }

      if (file.size > INPUT_LIMITS.postImageFileSizeBytes) {
        setFormErrorMessage('이미지 파일은 10MB 이하여야 합니다.')
        event.target.value = ''
        return
      }
    }

    setNewImages((current) => [...current, ...nextFiles.map(createPreviewItem)])
    setFormErrorMessage(null)
    event.target.value = ''
  }

  const handleRemoveExistingAttachment = (attachmentId) => {
    setExistingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
  }

  const handleRemoveNewImage = (imageId) => {
    setNewImages((current) => {
      const target = current.find((image) => image.id === imageId)
      /* v8 ignore next -- remove buttons are rendered only for existing preview ids */
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
      }

      return current.filter((image) => image.id !== imageId)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextTitle = title.trim()
    const nextContent = content.trim()

    if (!nextTitle || !nextContent) {
      setFormErrorMessage('제목과 내용을 모두 입력해주세요.')
      return
    }

    /* v8 ignore next -- non-admin users cannot submit NOTICE because the option is hidden and normalized */
    if (category === 'NOTICE' && !isAdmin) {
      setFormErrorMessage('공지사항은 관리자만 작성할 수 있습니다.')
      return
    }

    /* v8 ignore next -- invalid edit ids exit through the error screen before the form can submit */
    if (isEditMode && Number.isNaN(postId)) {
      setLoadErrorMessage('게시글을 찾을 수 없습니다.')
      return
    }

    setIsSubmitting(true)
    setFormErrorMessage(null)

    const payload = {
      category,
      title: nextTitle,
      content: nextContent,
      retainedAttachmentIds: existingAttachments.map((attachment) => attachment.id),
      images: newImages.map((image) => image.file),
    }

    try {
      if (isEditMode) {
        await updatePost(postId, payload)
        navigate(`/community/${postId}`, { replace: true })
      } else {
        const response = await createPost(payload)
        const createdPostId = response.data?.id
        navigate(createdPostId ? `/community/${createdPostId}` : '/community', { replace: true })
      }
    } catch (error) {
      setFormErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEditMode && isPageLoading) {
    return (
      <section className="page-grid community-write-page">
        <div className="panel community-write-panel">
          <h2 className="community-write-title">게시글 수정</h2>
          <p className="helper-text">게시글 정보를 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (isEditMode && loadErrorMessage) {
    return (
      <section className="page-grid community-write-page">
        <div className="panel community-write-panel">
          <h2 className="community-write-title">게시글 수정</h2>
          <p className="message error auth-message">{loadErrorMessage}</p>
          <div className="community-write-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate('/community')}
            >
              목록으로
            </button>
          </div>
        </div>
      </section>
    )
  }

  const pageTitle = isEditMode ? '게시글 수정' : '새 게시글 작성'
  const submitLabel = isEditMode ? '수정' : '등록'
  const submittingLabel = isEditMode ? '수정 중...' : '등록 중...'

  return (
    <section className="page-grid community-write-page">
      <div className="panel community-write-panel">
        <h2 className="community-write-title">{pageTitle}</h2>
        {formErrorMessage ? <p className="message error auth-message">{formErrorMessage}</p> : null}
        <form onSubmit={handleSubmit} className="form-grid community-write-form">
          <div className="field">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="FREE">자유게시판</option>
              {isAdmin ? <option value="NOTICE">공지사항</option> : null}
            </select>
          </div>

          <div className="field">
            <label htmlFor="title">제목</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="게시글 제목을 입력하세요"
              maxLength={INPUT_LIMITS.postTitle}
              disabled={isSubmitting}
            />
          </div>

          <div className="field">
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="게시글 내용을 입력하세요"
              rows={10}
              maxLength={INPUT_LIMITS.postContent}
              disabled={isSubmitting}
            />
          </div>

          <div className="field">
            <label htmlFor="post-images">이미지 첨부</label>
            <input
              id="post-images"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              disabled={isSubmitting}
            />
            <p className="helper-text">최대 5장, 파일당 10MB 이하 이미지를 첨부할 수 있습니다.</p>
          </div>

          {existingAttachments.length > 0 ? (
            <div className="community-write-image-section">
              <div className="section-heading">
                <h3>기존 첨부 이미지</h3>
                <span className="helper-text">{existingAttachments.length}장 유지 중</span>
              </div>
              <div className="community-write-image-grid">
                {existingAttachments.map((attachment) => (
                  <div key={attachment.id} className="community-write-image-card">
                    <img src={attachment.imageUrl} alt={attachment.originalFileName} className="community-write-image-preview" />
                    <span>{attachment.originalFileName}</span>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleRemoveExistingAttachment(attachment.id)}
                      disabled={isSubmitting}
                    >
                      제외
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {newImages.length > 0 ? (
            <div className="community-write-image-section">
              <div className="section-heading">
                <h3>새로 추가할 이미지</h3>
                <span className="helper-text">{newImages.length}장 선택됨</span>
              </div>
              <div className="community-write-image-grid">
                {newImages.map((image) => (
                  <div key={image.id} className="community-write-image-card">
                    <img src={image.previewUrl} alt={image.file.name} className="community-write-image-preview" />
                    <span>{image.file.name}</span>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleRemoveNewImage(image.id)}
                      disabled={isSubmitting}
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="community-write-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate(cancelPath)}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
