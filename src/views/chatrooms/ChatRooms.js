import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload, cilArrowRight } from '@coreui/icons'
import { fetchChatRooms } from 'src/api/chatrooms'
import styles from './ChatRooms.module.css'

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484318571209-661cf29a69c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493962853295-0fd70327578a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80',
]

export default function ChatRooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [rulesVisible, setRulesVisible] = useState(false)

  const defaultRules = [
    'Be respectful and avoid harassment.',
    'No hate speech or discriminatory language.',
    'Keep messages relevant to the room topic.',
    'No spam, scams, or unsolicited promotions.',
    'Do not share private or sensitive information.',
    'Report inappropriate behavior to moderators.',
  ]

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchChatRooms()
      const data = Array.isArray(res) ? res : res.chatrooms || res.rooms || []
      setRooms(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load chat rooms')
    } finally {
      setLoading(false)
    }
  }

  const openRoom = (roomId) => {
    navigate(`/chatroom/${roomId}`)
  }

  const getCoverForRoom = (room, index) => {
    const image = room?.image || room?.coverImage || room?.banner || ''
    if (image) return image
    return FALLBACK_COVERS[index % FALLBACK_COVERS.length]
  }

  const getRoomMeta = (room) => {
    const members = room?.membersCount || room?.memberCount || room?.participantsCount || room?.usersCount || 0
    const text = Number(members) > 0 ? `${members} members` : 'Open community room'
    return text
  }

  if (loading) return <div className="text-center mt-4"><CSpinner /></div>
  if (error) return <CAlert color="danger">{error}</CAlert>

  return (
    <>
      <CRow className="mb-3">
        <CCol xs={12}>
          <CCard className={styles.chatRoomsCard}>
            <CCardBody className={styles.chatRoomsBody}>
              <div className={styles.heroBar}>
                <div>
                  <h4 className={styles.heroTitle}>Community Chatrooms</h4>
                  <p className={styles.heroSubtitle}>Join trending conversations across the 34th Street community</p>
                </div>
                <CButton color="light" className={styles.refreshBtn} onClick={loadRooms}>
                  <CIcon icon={cilReload} />
                </CButton>
              </div>

              <div className={styles.roomsGrid}>
                {rooms.map((room, index) => (
                  <div className={styles.roomCard} key={room._id || room.id}>
                    <div className={styles.roomCoverWrap}>
                      <img
                        src={getCoverForRoom(room, index)}
                        alt={room?.name || 'Chatroom'}
                        className={styles.roomCover}
                      />
                      <div className={styles.roomCoverOverlay} />
                    </div>

                    <div className={styles.roomContent}>
                      <h5 className={styles.roomName}>{room.name || 'Community Room'}</h5>
                      <p className={styles.roomDescription}>{room.description || 'Connect and chat with like-minded members.'}</p>
                      <p className={styles.roomMeta}>{getRoomMeta(room)}</p>

                      <div className={styles.actionRow}>
                        <CButton size="sm" className={styles.enterBtn} onClick={() => openRoom(room._id || room.id)}>
                          Enter Room <CIcon icon={cilArrowRight} size="sm" />
                        </CButton>
                        <CButton
                          size="sm"
                          className={styles.rulesBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRoom(room)
                            setRulesVisible(true)
                          }}
                        >
                          Rules
                        </CButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={rulesVisible} onClose={() => setRulesVisible(false)} alignment="center" size="lg">
        <CModalHeader onClose={() => setRulesVisible(false)}>
          <CModalTitle>{selectedRoom?.name || 'Room'} Rules</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedRoom?.description && <p>{selectedRoom.description}</p>}
          <CListGroup>
            {defaultRules.map((rule, index) => (
              <CListGroupItem key={rule}>{index + 1}. {rule}</CListGroupItem>
            ))}
          </CListGroup>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setRulesVisible(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}
