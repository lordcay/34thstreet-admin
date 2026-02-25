import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
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
  CModalLarge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilThumbsUp, cilThumbsDown, cilComments, cilRefresh } from '@coreui/icons'
import { fetchTodayGist, voteOnGist, fetchGistComments, addGistComment } from 'src/api/gist'
import styles from './GistPage.module.css'

export default function GistPage() {
  const [gist, setGist] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [userVote, setUserVote] = useState(null)

  useEffect(() => {
    loadTodayGist()
  }, [])

  const loadTodayGist = async () => {
    setLoading(true)
    setError('')
    setShowComments(false)
    setComments([])
    setNewComment('')
    setUserVote(null)

    try {
      const data = await fetchTodayGist()
      setGist(data.post || data)
      setUserVote(data.post?.userVote || data.userVote || null)
    } catch (err) {
      console.error('Error fetching gist:', err)
      setError('Failed to load today\'s gist')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (voteType) => {
    if (!gist) return

    try {
      setUserVote(voteType)
      const updatedGist = await voteOnGist(gist._id, voteType)
      setGist(updatedGist.post || updatedGist)
    } catch (err) {
      console.error('Error voting:', err)
      setError('Failed to submit vote')
      setUserVote(null)
    }
  }

  const loadComments = async () => {
    if (!gist) return

    try {
      const data = await fetchGistComments(gist._id)
      setComments(Array.isArray(data) ? data : data.comments || [])
      setShowComments(true)
    } catch (err) {
      console.error('Error loading comments:', err)
      setError('Failed to load comments')
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !gist) return

    setSubmittingComment(true)
    try {
      const comment = await addGistComment(gist._id, newComment)
      setComments([...comments, comment])
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
          <CIcon icon={cilRefresh} className="me-2" />
          Try Again
        </CButton>
      </div>
    )
  }

  const agreeCount = gist.votes?.agree || 0
  const disagreeCount = gist.votes?.disagree || 0
  const totalVotes = agreeCount + disagreeCount

  return (
    <>
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className={styles.header}>
            <h2>Today's Gist</h2>
            <CButton color="secondary" size="sm" onClick={loadTodayGist} variant="outline">
              <CIcon icon={cilRefresh} />
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className={styles.gistCard}>
            {/* Image */}
            {gist.image && (
              <div className={styles.imageContainer}>
                <img src={gist.image} alt={gist.title} className={styles.image} />
              </div>
            )}

            <CCardBody>
              {/* Title & Category */}
              <div className="mb-3">
                {gist.category && <CBadge color="info">{gist.category}</CBadge>}
                <h3 className="mt-2 mb-2">{gist.title}</h3>
                <p className={styles.body}>{gist.body}</p>
              </div>

              {/* Countdown Timer */}
              {gist.expiresAt && (
                <div className={styles.countdown}>
                  <small className="text-muted">
                    Expires: {new Date(gist.expiresAt).toLocaleString()}
                  </small>
                </div>
              )}

              {/* Voting Section */}
              <div className={styles.votingSection}>
                <CButtonGroup role="group" className="w-100">
                  <CButton
                    color={userVote === 'agree' ? 'success' : 'secondary'}
                    variant={userVote === 'agree' ? 'solid' : 'outline'}
                    onClick={() => handleVote('agree')}
                    className={styles.voteButton}
                  >
                    <CIcon icon={cilThumbsUp} className="me-2" />
                    Agree
                    <CBadge color="light" className="ms-2 text-dark">
                      {agreeCount}
                    </CBadge>
                  </CButton>

                  <CButton
                    color={userVote === 'disagree' ? 'danger' : 'secondary'}
                    variant={userVote === 'disagree' ? 'solid' : 'outline'}
                    onClick={() => handleVote('disagree')}
                    className={styles.voteButton}
                  >
                    <CIcon icon={cilThumbsDown} className="me-2" />
                    Disagree
                    <CBadge color="light" className="ms-2 text-dark">
                      {disagreeCount}
                    </CBadge>
                  </CButton>
                </CButtonGroup>

                {totalVotes > 0 && (
                  <div className={styles.voteStats}>
                    <small className="text-muted">
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''} total
                    </small>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${(agreeCount / totalVotes) * 100}%`, backgroundColor: '#28a745' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className={styles.commentsSection}>
                <CButton
                  color="info"
                  variant="outline"
                  size="sm"
                  onClick={loadComments}
                  className="w-100 mb-3"
                >
                  <CIcon icon={cilComments} className="me-2" />
                  {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
                </CButton>

                {showComments && (
                  <>
                    {/* Add Comment */}
                    <div className="mb-3">
                      <div className="input-group">
                        <CFormInput
                          type="text"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          disabled={submittingComment}
                        />
                        <CButton
                          color="primary"
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || submittingComment}
                        >
                          {submittingComment ? 'Posting...' : 'Post'}
                        </CButton>
                      </div>
                    </div>

                    {/* Comments List */}
                    {comments.length > 0 ? (
                      <CListGroup>
                        {comments.map((comment) => (
                          <CListGroupItem key={comment._id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                              <strong >
                                {comment.sender?.firstName || comment.sender?.name || 'Anonymous'} {comment.sender?.lastName || ''}
                              </strong>
                              <small className="text-muted">
                                {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                              </small>
                            </div>
                            <p className="mb-0 mt-2">{comment.text}</p>
                          </CListGroupItem>
                        ))}
                      </CListGroup>
                    ) : (
                      <div className="text-center py-4">
                        <small className="text-muted">No comments yet. Be the first!</small>
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
