

// import React from 'react'

// const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
// const Users = React.lazy(() => import('./views/users/Users'))
// const Reports = React.lazy(() => import('./views/reports/Reports'))
// const Blocks = React.lazy(() => import('./views/blocks/Blocks'))
// const StreetGist = React.lazy(() => import('./views/streetGist/StreetGist'))
// const Moderation = React.lazy(() => import('./views/moderation/Moderation'))
// const Analytics = React.lazy(() => import('./views/analytics/Analytics'))
// const Settings = React.lazy(() => import('./views/settings/Settings'))

// const routes = [
//   { path: '/', exact: true, name: 'Home' },

//   { path: '/dashboard', name: 'Dashboard', element: Dashboard },
//   { path: '/users', name: 'Users', element: Users },
//   { path: '/reports', name: 'Reports', element: Reports },
//   { path: '/blocks', name: 'Blocks', element: Blocks },

//   { path: '/street-gist', name: 'Street Gist', element: StreetGist },
//   { path: '/moderation', name: 'Moderation', element: Moderation },

//   { path: '/analytics', name: 'Analytics', element: Analytics },
//   { path: '/settings', name: 'Settings', element: Settings },
// ]

// export default routes


import React from 'react'
import ProtectedRoute from './components/ProtectedRoute'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Users = React.lazy(() => import('./views/users/Users'))
const Reports = React.lazy(() => import('./views/reports/Reports'))
const Blocks = React.lazy(() => import('./views/blocks/Blocks'))
const StreetGist = React.lazy(() => import('./views/streetGist/StreetGist'))
const Moderation = React.lazy(() => import('./views/moderation/Moderation'))
const Analytics = React.lazy(() => import('./views/analytics/Analytics'))
const Settings = React.lazy(() => import('./views/settings/Settings'))
const Login = React.lazy(() => import('./views/auth/Login'))

const routes = [
  { path: '/', exact: true, name: 'Home' },

  // ✅ Public route
  { path: '/login', name: 'Login', element: Login },

  // ✅ Protected routes
  {
    path: '/dashboard',
    name: 'Dashboard',
    element: () => (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    name: 'Users',
    element: () => (
      <ProtectedRoute>
        <Users />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    name: 'Reports',
    element: () => (
      <ProtectedRoute>
        <Reports />
      </ProtectedRoute>
    ),
  },
  {
    path: '/blocks',
    name: 'Blocks',
    element: () => (
      <ProtectedRoute>
        <Blocks />
      </ProtectedRoute>
    ),
  },
  {
    path: '/street-gist',
    name: 'Street Gist',
    element: () => (
      <ProtectedRoute>
        <StreetGist />
      </ProtectedRoute>
    ),
  },
  {
    path: '/moderation',
    name: 'Moderation',
    element: () => (
      <ProtectedRoute>
        <Moderation />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    name: 'Analytics',
    element: () => (
      <ProtectedRoute>
        <Analytics />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    name: 'Settings',
    element: () => (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
]

export default routes
