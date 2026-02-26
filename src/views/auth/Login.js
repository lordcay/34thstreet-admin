// import React, { useState } from 'react'
// import {
//   CButton,
//   CCard,
//   CCardBody,
//   CCardHeader,
//   CForm,
//   CFormInput,
//   CSpinner,
// } from '@coreui/react'
// import api from 'src/api/client'

// export default function Login() {
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setError('')
//     setLoading(true)

//     try {
//       const res = await api.post('/accounts/authenticate', { email, password })

//       // ✅ Handle different token keys safely
//       const token = res.data.jwtToken || res.data.token || res.data?.user?.jwtToken
//       if (!token) throw new Error('No token returned from login')

//       // ✅ Save token for ProtectedRoute + API interceptor
//       localStorage.setItem('adminToken', token)

//       // ✅ Force redirect (CoreUI uses HashRouter in many setups)
//       window.location.href = '/#/reports'
//     } catch (err) {
//       console.error(err)
//       setError(err?.response?.data?.message || 'Invalid login credentials')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-vh-100 d-flex align-items-center justify-content-center">
//       <CCard style={{ width: 400 }}>
//         <CCardHeader>
//           <strong>34th Street Admin Login</strong>
//         </CCardHeader>
//         <CCardBody>
//           <CForm onSubmit={handleSubmit}>
//             <CFormInput
//               label="Email"
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               className="mb-3"
//             />
//             <CFormInput
//               label="Password"
//               type="password"
//               value={passwordpassword
//               }
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="mb-3"
//             />

//             {error && <p className="text-danger">{error}</p>}

//             <CButton type="submit" color="primary" className="w-100" disabled={loading}>
//               {loading ? <CSpinner size="sm" /> : 'Login'}
//             </CButton>
//           </CForm>
//         </CCardBody>
//       </CCard>
//     </div>
//   )
// }



import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CSpinner,
} from '@coreui/react'
import api from 'src/api/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    console.log('Login button clicked') // ✅ confirms handler fires
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/accounts/authenticate', { email, password })

      const token = res.data?.jwtToken || res.data?.token || res.data?.user?.jwtToken
      if (!token) throw new Error('No token returned from login')

      localStorage.setItem('adminToken', token)

      const user = res.data?.user || res.data?.account || null
      if (user && typeof user === 'object') {
        const serialized = JSON.stringify(user)
        localStorage.setItem('adminUser', serialized)
        localStorage.setItem('user', serialized)
        localStorage.setItem('currentUser', serialized)
      }

      // ✅ Force redirect for HashRouter
      window.location.href = '/#/home'
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || 'Invalid login credentials')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    handleLogin()
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <CCard style={{ width: 400 }}>
        <CCardHeader>
          <strong>34th Street Admin Login</strong>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={onSubmit}>
            <CFormInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-3"
            />

            <CFormInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-3"
            />

            {error && <p className="text-danger">{error}</p>}

            <CButton
              type="button"
              color="primary"
              className="w-100"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? <CSpinner size="sm" /> : 'Login'}
            </CButton>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  )
}
