import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilHome,
  cilPeople,
  cilBell,
  cilSpeech,
  cilCommentSquare,
  cilList,
  cilUser,
  cilBan,
  cilSettings,
  cilShieldAlt,
  cilChart,
} from '@coreui/icons'

const _nav = [
  {
    component: 'CNavItem',
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },

  {
    component: 'CNavTitle',
    name: 'Community',
  },
  {
    component: 'CNavItem',
    name: 'Home',
    to: '/home',
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Gist',
    to: '/gist',
    icon: <CIcon icon={cilSpeech} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Chat',
    to: '/chat',
    icon: <CIcon icon={cilCommentSquare} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'ChatRooms',
    to: '/chatrooms',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Profile',
    to: '/profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Users',
    to: '/users',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Reports',
    to: '/reports',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Blocks',
    to: '/blocks',
    icon: <CIcon icon={cilBan} customClassName="nav-icon" />,
  },

  {
    component: 'CNavTitle',
    name: 'Content',
  },
  {
    component: 'CNavItem',
    name: 'Street Gist',
    to: '/street-gist',
    icon: <CIcon icon={cilSpeech} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Moderation',
    to: '/moderation',
    icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
  },

  {
    component: 'CNavTitle',
    name: 'Admin',
  },
  {
    component: 'CNavItem',
    name: 'Analytics',
    to: '/analytics',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
  },
  {
    component: 'CNavItem',
    name: 'Settings',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
]

export default _nav
