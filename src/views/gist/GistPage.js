import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CCard,
  CCardBody,
  CButton,
  CButtonGroup,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CBadge,
  CAvatar,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilThumbUp, cilThumbDown, cilCommentSquare, cilReload } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { fetchTodayGist, voteOnGist, fetchGistComments, addGistComment } from 'src/api/gist'
import { getSocket } from 'src/socket'
import { getCurrentUserId } from 'src/utils/auth'
import api from 'src/api/client'
import styles from './GistPage.module.css'

export default function GistPage() {
  const navigate = useNavigate()
  const currentUserId = getCurrentUserId()
  const commenterCacheRef = useRef({})
  const commenterInFlightRef = useRef({})
  const [gist, setGist] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [userVote, setUserVote] = useState(null)
  const [submittingVote, setSubmittingVote] = useState(false)

  const normalizeVoteType = (value) => {
    const vote = String(value || '').trim().toLowerCase()
    if (vote === 'agree' || vote === 'upvote' || vote === 'up') return 'agree'
    if (vote === 'disagree' || vote === 'downvote' || vote === 'down') return 'disagree'
    return null
  }

  const extractPostFromResponse = (payload) => payload?.post || payload?.data?.post || payload?.data || payload

  const extractUserVote = (payload, post) => {
    const fromPayload = normalizeVoteType(
      payload?.userVote || payload?.vote || payload?.myVote || payload?.my_vote || payload?.user_vote,
    )

    if (fromPayload) return fromPayload

    return normalizeVoteType(
      post?.userVote || post?.vote || post?.myVote || post?.my_vote || post?.user_vote,
    )
  }

  const extractCommentsList = (payload) => {
    if (Array.isArray(payload)) return payload

    if (Array.isArray(payload?.comments)) return payload.comments
    if (Array.isArray(payload?.data?.comments)) return payload.data.comments
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload?.results)) return payload.results

    return []
  }

  const asId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return String(value?._id || value?.id || value?.userId || '')
  }

  const getPhotoFromUser = (user) => {
    const photos = Array.isArray(user?.photos) ? user.photos : []
    const normalized = photos
      .map((photo) => {
        if (typeof photo === 'string') return photo
        return photo?.url || photo?.secure_url || photo?.uri || photo?.src || null
      })
      .filter(Boolean)

    if (normalized.length) return normalized[0]
    return user?.avatarUrl || user?.avatar || user?.profilePhoto || ''
  }

  const normalizeCommentAuthor = (comment) => {
    const senderRaw =
      comment?.sender ||
      comment?.senderId ||
      comment?.user ||
      comment?.author ||
      comment?.createdBy ||
      comment?.owner ||
      null

    const senderId =
      asId(senderRaw) ||
      asId(comment?.senderId) ||
      asId(comment?.sender) ||
      asId(comment?.userId) ||
      asId(comment?.authorId) ||
      asId(comment?.createdBy)

    const firstName =
      (typeof senderRaw === 'object' ? senderRaw?.firstName : '') ||
      comment?.firstName ||
      comment?.senderFirstName ||
      ''

    const lastName =
      (typeof senderRaw === 'object' ? senderRaw?.lastName : '') ||
      comment?.lastName ||
      comment?.senderLastName ||
      ''

    const fullName =
      `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim() ||
      comment?.senderName ||
      comment?.name ||
      comment?.username ||
      comment?.displayName ||
      (typeof senderRaw === 'object'
        ? senderRaw?.name || senderRaw?.username || senderRaw?.displayName || ''
        : '')

    const avatar =
      (typeof senderRaw === 'object' ? getPhotoFromUser(senderRaw) : '') ||
      comment?.senderAvatar ||
      comment?.avatarUrl ||
      ''

    return {
      senderId,
      displayName: String(fullName || '').trim(),
      avatar,
    }
  }

  const normalizeCommentItem = (comment) => {
    const author = normalizeCommentAuthor(comment)
    return {
      ...comment,
      _displaySenderId: author.senderId,
      _displaySenderName: author.displayName,
      _displaySenderAvatar: author.avatar,
      _displayText:
        comment?.text || comment?.message || comment?.content || comment?.body || comment?.comment || '',
    }
  }

  const fetchCommenterProfile = async (userId) => {
    const id = asId(userId)
    if (!id) return null

    if (commenterCacheRef.current[id]) return commenterCacheRef.current[id]
    if (commenterInFlightRef.current[id]) return commenterInFlightRef.current[id]

    const promise = api
      .get(`/accounts/${id}`)
      .then((response) => {
        const user = response?.data?.user || response?.data || null
        if (!user) return null
        commenterCacheRef.current[id] = user
        return user
      })
      .catch((err) => {
        console.error('Failed to hydrate comment author:', err)
        return null
      })
      .finally(() => {
        delete commenterInFlightRef.current[id]
      })

    commenterInFlightRef.current[id] = promise
    return promise
  }

  const hydrateCommentAuthors = async (rawComments) => {
    const normalized = rawComments.map(normalizeCommentItem)
    const missingAuthorIds = [...new Set(
      normalized
        .filter((item) => !item?._displaySenderName && item?._displaySenderId)
        .map((item) => asId(item?._displaySenderId))
        .filter(Boolean),
    )]

    if (missingAuthorIds.length > 0) {
      await Promise.all(missingAuthorIds.map((id) => fetchCommenterProfile(id)))
    }

    return normalized.map((item) => {
      const senderId = asId(item?._displaySenderId)
      const cachedUser = senderId ? commenterCacheRef.current[senderId] : null
      const cachedName = cachedUser
        ? `${cachedUser?.firstName || ''} ${cachedUser?.lastName || ''}`.trim() ||
          cachedUser?.name ||
          cachedUser?.username ||
          ''
        : ''

      return {
        ...item,
        _displaySenderName: item?._displaySenderName || cachedName || 'Anonymous',
        _displaySenderAvatar: item?._displaySenderAvatar || (cachedUser ? getPhotoFromUser(cachedUser) : ''),
      }
    })
  }

  const setHydratedComments = async (payload) => {
    const extracted = extractCommentsList(payload)
    const hydrated = await hydrateCommentAuthors(extracted)
    setComments(hydrated)
  }

  const toCount = (value) => {
    if (Array.isArray(value)) return value.length

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value >= 0 ? Math.floor(value) : 0
    }

    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed >= 0 ? Math.floor(parsed) : 0
      return null
    }

    if (value && typeof value === 'object') {
      const nested = value.count ?? value.total ?? value.length ?? value.value
      if (nested !== undefined && nested !== null) return toCount(nested)
    }

    return null
  }

  const pickCount = (candidates) => {
    for (const candidate of candidates) {
      const count = toCount(candidate)
      if (count !== null) return count
    }
    return null
  }

  const extractVoteCounts = (post) => {
    const agreeDirect = pickCount([
      post?.votes?.agree,
      post?.votes?.up,
      post?.votes?.upvote,
      post?.voteCounts?.agree,
      post?.voteCounts?.up,
      post?.stats?.agree,
      post?.stats?.up,
      post?.agreeCount,
      post?.upvotes,
      post?.agree,
    ])

    const disagreeDirect = pickCount([
      post?.votes?.disagree,
      post?.votes?.down,
      post?.votes?.downvote,
      post?.voteCounts?.disagree,
      post?.voteCounts?.down,
      post?.stats?.disagree,
      post?.stats?.down,
      post?.disagreeCount,
      post?.downvotes,
      post?.disagree,
    ])

    const voteArrays = [
      ...(Array.isArray(post?.votes) ? post.votes : []),
      ...(Array.isArray(post?.voteDetails) ? post.voteDetails : []),
      ...(Array.isArray(post?.voters) ? post.voters : []),
    ]

    let agreeFromArray = 0
    let disagreeFromArray = 0

    for (const entry of voteArrays) {
      const normalized = normalizeVoteType(
        typeof entry === 'object' ? entry?.type || entry?.vote || entry?.value || entry?.choice : entry,
      )
      if (normalized === 'agree') agreeFromArray += 1
      if (normalized === 'disagree') disagreeFromArray += 1
    }

    return {
      agreeCount: agreeDirect ?? agreeFromArray,
      disagreeCount: disagreeDirect ?? disagreeFromArray,
    }
  }

  const extractCommentCount = (post) => {
    const direct = pickCount([
      post?.commentCount,
      post?.commentsCount,
      post?.totalComments,
      post?.stats?.comments,
      post?.stats?.commentCount,
      post?.counts?.comments,
      post?.meta?.comments,
      post?.comments,
    ])

    if (direct !== null) return direct

    return 0
  }

  const syncTodayGist = useCallback(async () => {
    const data = await fetchTodayGist()
    const post = extractPostFromResponse(data)
    setGist(post)
    setUserVote(extractUserVote(data, post))
    return post
  }, [])

  useEffect(() => {
    loadTodayGist()
  }, [])

  useEffect(() => {
    if (!gist?._id) return undefined

    const socket = getSocket()
    const gistId = String(gist._id)

    const refreshFromRealtime = async (payload = {}) => {
      const payloadGistId = String(
        payload?.gistId || payload?.postId || payload?.feedId || payload?._id || payload?.post?._id || '',
      )

      if (payloadGistId && payloadGistId !== gistId) return

      try {
        const latestPost = await syncTodayGist()
        if (showComments && latestPost?._id) {
          const latestComments = await fetchGistComments(latestPost._id)
          await setHydratedComments(latestComments)
        }
      } catch (err) {
        console.error('Realtime gist sync error:', err)
      }
    }

    const realtimeEvents = [
      'feed:updated',
      'feed:update',
      'feed:voteUpdated',
      'feed:commentAdded',
      'feed:commentUpdated',
      'gist:updated',
      'gist:update',
      'gist:voteUpdated',
      'gist:commentAdded',
      'gist:commentUpdated',
      'newGistComment',
      'gistVoted',
    ]

    socket.emit('feed:join', { gistId })
    socket.emit('gist:join', { gistId, userId: currentUserId })

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, refreshFromRealtime)
    })

    return () => {
      socket.emit('feed:leave', { gistId })
      socket.emit('gist:leave', { gistId, userId: currentUserId })
      realtimeEvents.forEach((eventName) => {
        socket.off(eventName, refreshFromRealtime)
      })
    }
  }, [gist?._id, showComments, syncTodayGist, currentUserId])

  const toAbsoluteUrl = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''

    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/^http:\/\//i, 'https://')
    }

    const base = import.meta.env.VITE_API_BASE_URL || 'https://three4th-street-backend.onrender.com'
    const normalizedBase = String(base).replace(/\/$/, '')
    return `${normalizedBase}/${raw.replace(/^\//, '')}`
  }

  const pickFirstString = (values) => {
    for (const candidate of values) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }
    return ''
  }

  const resolveGistImage = (item) => {
    if (!item) return ''

    const mediaList = [
      ...(Array.isArray(item?.images) ? item.images : []),
      ...(Array.isArray(item?.media) ? item.media : []),
      ...(Array.isArray(item?.attachments) ? item.attachments : []),
      ...(Array.isArray(item?.photos) ? item.photos : []),
    ]

    const fromArrays = mediaList
      .map((entry) => {
        if (typeof entry === 'string') return entry
        return (
          entry?.url ||
          entry?.secure_url ||
          entry?.image ||
          entry?.src ||
          entry?.path ||
          entry?.uri ||
          ''
        )
      })
      .filter(Boolean)

    const direct = pickFirstString([
      item?.image,
      item?.imageUrl,
      item?.imageURL,
      item?.image_url,
      item?.photo,
      item?.photoUrl,
      item?.photo_url,
      item?.cover,
      item?.coverImage,
      item?.banner,
      item?.thumbnail,
      item?.mediaUrl,
      item?.media_url,
      item?.attachment,
    ])

    const nestedDirect =
      (typeof item?.image === 'object' &&
        (item?.image?.url || item?.image?.secure_url || item?.image?.src || item?.image?.path)) ||
      ''

    const selected = pickFirstString([direct, nestedDirect, ...fromArrays])
    return selected ? toAbsoluteUrl(selected) : ''
  }

  const loadTodayGist = async () => {
    setLoading(true)
    setError('')
    setShowComments(false)
    setComments([])
    setNewComment('')
    setUserVote(null)
    setSubmittingVote(false)

    try {
      await syncTodayGist()
    } catch (err) {
      console.error('Error fetching gist:', err)
      setError('Failed to load today\'s gist')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (voteType) => {
    if (!gist || submittingVote) return

    const normalizedVoteType = normalizeVoteType(voteType)
    if (!normalizedVoteType) return

    if (userVote === normalizedVoteType) {
      return
    }

    try {
      setSubmittingVote(true)

      await voteOnGist(gist._id, normalizedVoteType)
      getSocket().emit('feed:vote', {
        gistId: gist._id,
        voteType: normalizedVoteType,
        userId: currentUserId,
      })
      getSocket().emit('gist:vote', {
        gistId: gist._id,
        type: normalizedVoteType,
        userId: currentUserId,
      })

      const latestPost = await syncTodayGist()

      if (showComments && latestPost?._id) {
        const latestComments = await fetchGistComments(latestPost._id)
        await setHydratedComments(latestComments)
      }
    } catch (err) {
      console.error('Error voting:', err)
      setError('Failed to submit vote')
    } finally {
      setSubmittingVote(false)
    }
  }

  const loadComments = async () => {
    if (!gist) return

    try {
      const data = await fetchGistComments(gist._id)
      await setHydratedComments(data)
      setShowComments(true)
    } catch (err) {
      console.error('Error loading comments:', err)
      setError('Failed to load comments')
    }
  }

  const handleToggleComments = async () => {
    if (showComments) {
      setShowComments(false)
      return
    }

    await loadComments()
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !gist) return

    setSubmittingComment(true)
    try {
      await addGistComment(gist._id, newComment.trim())
      getSocket().emit('feed:comment', {
        gistId: gist._id,
        text: newComment.trim(),
        userId: currentUserId,
      })
      getSocket().emit('gist:comment', {
        gistId: gist._id,
        text: newComment.trim(),
        userId: currentUserId,
      })

      const latestComments = await fetchGistComments(gist._id)
      await setHydratedComments(latestComments)

      await syncTodayGist()
      setNewComment('')
    } catch (err) {
      console.error('Error adding comment:', err)
      setError('Failed to post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center mt-4">
        <CSpinner color="primary" />
        <p className="mt-2">Loading today's gist...</p>
      </div>
    )
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>
  }

  if (!gist) {
    return (
      <div className="text-center mt-4">
        <CAlert color="info">No gist available today</CAlert>
        <CButton color="primary" onClick={loadTodayGist}>
          <CIcon icon={cilReload} className="me-2" />
          Try Again
        </CButton>
      </div>
    )
  }

  const { agreeCount, disagreeCount } = extractVoteCounts(gist)
  const totalVotes = agreeCount + disagreeCount
  const commentCount = showComments ? comments.length : extractCommentCount(gist)
  const gistImage = resolveGistImage(gist)

  return (
    <>
      <CRow className="mb-4">
        <CCol xs={12} className={styles.pageShell}>
          <div className={styles.headerBar}>
            <div>
              <h2 className={styles.pageTitle}>Today&apos;s Gist</h2>
              <p className={styles.pageSubtitle}>Share your opinion and engage with the community</p>
            </div>
            <CButton className={styles.refreshBtn} size="sm" onClick={loadTodayGist}>
              <CIcon icon={cilReload} />
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12} className={styles.pageShell}>
          <CCard className={styles.gistCard}>
            {gistImage && (
              <div className={styles.imageContainer}>
                <img src={gistImage} alt={gist.title || 'Gist image'} className={styles.image} />
              </div>
            )}

            <CCardBody>
              <div className={styles.contentTop}>
                {gist.category && <CBadge className={styles.categoryBadge}>{gist.category}</CBadge>}
                <h3 className={styles.gistTitle}>{gist.title}</h3>
                <p className={styles.body}>{gist.body}</p>
              </div>

              {gist.expiresAt && (
                <div className={styles.countdown}>
                  <small className={styles.expireText}>
                    Expires: {new Date(gist.expiresAt).toLocaleString()}
                  </small>
                </div>
              )}

              <div className={styles.votingSection}>
                <CButtonGroup role="group" className="w-100">
                  <CButton
                    color="light"
                    onClick={() => handleVote('agree')}
                    className={`${styles.voteButton} ${userVote === 'agree' ? styles.voteButtonActive : ''}`}
                    disabled={submittingVote}
                  >
                    <CIcon icon={cilThumbUp} className="me-2" />
                    Agree
                    <CBadge className={styles.voteCountBadge}>
                      {agreeCount}
                    </CBadge>
                  </CButton>

                  <CButton
                    color="light"
                    onClick={() => handleVote('disagree')}
                    className={`${styles.voteButton} ${userVote === 'disagree' ? styles.voteButtonActive : ''}`}
                    disabled={submittingVote}
                  >
                    <CIcon icon={cilThumbDown} className="me-2" />
                    Disagree
                    <CBadge className={styles.voteCountBadge}>
                      {disagreeCount}
                    </CBadge>
                  </CButton>
                </CButtonGroup>

                {totalVotes > 0 && (
                  <div className={styles.voteStats}>
                    <small className={styles.voteTotalText}>
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''} total
                    </small>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${(agreeCount / totalVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.commentsSection}>
                <CButton
                  color="light"
                  size="sm"
                  onClick={handleToggleComments}
                  className={styles.commentToggleBtn}
                >
                  <CIcon icon={cilCommentSquare} className="me-2" />
                  {showComments ? 'Hide' : 'Show'} Comments ({commentCount})
                </CButton>

                {showComments && (
                  <>
                    <div className={styles.commentInputWrap}>
                      <div className="input-group">
                        <CFormInput
                          type="text"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          disabled={submittingComment}
                          className={styles.commentInput}
                        />
                        <CButton
                          className={styles.commentPostBtn}
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || submittingComment}
                        >
                          {submittingComment ? 'Posting...' : 'Post'}
                        </CButton>
                      </div>
                    </div>

                    {comments.length > 0 ? (
                      <CListGroup className={styles.commentList}>
                        {comments.map((comment) => {
                          const targetUserId = asId(comment?._displaySenderId)
                          const isOwnComment = targetUserId && String(targetUserId) === String(currentUserId)
                          const canOpenUserProfile = Boolean(targetUserId) && !isOwnComment

                          return (
                            <CListGroupItem key={comment._id} className={styles.commentItem}>
                              <div className={styles.commentHeader}>
                                {canOpenUserProfile ? (
                                  <button
                                    type="button"
                                    className={styles.commentAuthorButton}
                                    onClick={() => navigate(`/user-profile/${targetUserId}`)}
                                  >
                                    <CAvatar
                                      src={comment?._displaySenderAvatar || undefined}
                                      text={String(comment?._displaySenderName || 'U').charAt(0)}
                                      size="sm"
                                      className={styles.commentAuthorAvatar}
                                    />
                                    <strong>{comment?._displaySenderName || 'Anonymous'}</strong>
                                  </button>
                                ) : (
                                  <div className={styles.commentAuthorStatic}>
                                    <CAvatar
                                      src={comment?._displaySenderAvatar || undefined}
                                      text={String(comment?._displaySenderName || 'U').charAt(0)}
                                      size="sm"
                                      className={styles.commentAuthorAvatar}
                                    />
                                    <strong>{comment?._displaySenderName || 'Anonymous'}</strong>
                                  </div>
                                )}
                                <small>
                                  {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                                </small>
                              </div>
                              <p className={styles.commentText}>{comment?._displayText}</p>
                            </CListGroupItem>
                          )
                        })}
                      </CListGroup>
                    ) : (
                      <div className={styles.emptyComments}>
                        <small>No comments yet. Be the first!</small>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}
