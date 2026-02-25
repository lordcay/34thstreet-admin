import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
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
import { fetchChatRooms } from 'src/api/chatrooms'
import styles from './ChatRooms.module.css'

export default function ChatRooms() {
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
    window.location.href = `/#/chatroom/${roomId}`
  }

  if (loading) return <div className="text-center mt-4"><CSpinner /></div>
  if (error) return <CAlert color="danger">{error}</CAlert>

  return (
    <>
      <CRow className="mb-3">
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <strong>Community Chat Rooms</strong>
            </CCardHeader>
            <CCardBody>
              <div className={styles.roomsGrid}>
                {rooms.map((room) => (
                  <div className={styles.roomCard} key={room._id || room.id} onClick={() => openRoom(room._id || room.id)}>
                    <div className={styles.roomBg} style={{ backgroundImage: `url(${room.image || ''})` }} />
                    <div className={styles.roomOverlay}>
                      <h5>{room.name}</h5>
                      <p className="small text-muted">{room.description}</p>
                      <div className="d-flex gap-2">
                        <CButton size="sm" color="light">Enter</CButton>
                        <CButton
                          size="sm"
                          color="dark"
                          variant="outline"
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
