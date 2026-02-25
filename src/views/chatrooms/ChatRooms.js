import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CRow, CCol, CSpinner, CAlert, CButton } from '@coreui/react'
import { fetchChatRooms } from 'src/api/chatrooms'
import './ChatRooms.module.css'

export default function ChatRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <div className="room-card" key={room._id || room.id} onClick={() => openRoom(room._id || room.id)}>
                    <div className="room-bg" style={{ backgroundImage: `url(${room.image || ''})` }} />
                    <div className="room-overlay">
                      <h5>{room.name}</h5>
                      <p className="small text-muted">{room.description}</p>
                      <CButton size="sm" color="light">Enter</CButton>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}
