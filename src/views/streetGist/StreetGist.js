// import React from 'react'
// import { CCard, CCardBody, CCardHeader } from '@coreui/react'

// export default function streetGist() {
//   return (
//     <CCard>
//       <CCardHeader>Users</CCardHeader>
//       <CCardBody>Coming soon…</CCardBody>
//     </CCard>
//   )
// }



// import React, { useState } from 'react'
// import {
//   CCard,
//   CCardBody,
//   CCardHeader,
//   CRow,
//   CCol,
//   CForm,
//   CFormInput,
//   CFormTextarea,
//   CButton,
//   CImage,
//   CBadge,
// } from '@coreui/react'

// export default function StreetGist() {
//   const [form, setForm] = useState({
//     title: '',
//     body: '',
//     imageUrl: '',
//     expiresAt: '',
//   })

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value })
//   }

//   const handleSubmit = () => {
//     console.log('Gist payload:', form)
//     // next step → call API here
//   }

//   return (
//     <>
//       {/* PAGE HEADER */}
//       <CCard className="mb-4">
//         <CCardHeader>
//           <strong>Street Gist Management</strong>
//         </CCardHeader>

//         <CCardBody>
//           <CRow>
//             {/* LEFT — CREATE FORM */}
//             <CCol md={6}>
//               <h5 className="mb-3">Create New Gist</h5>

//               <CForm>
//                 <CFormInput
//                   className="mb-3"
//                   label="Title"
//                   name="title"
//                   value={form.title}
//                   onChange={handleChange}
//                   placeholder="Built in Africa. Powered by Dreams..."
//                 />

//                 <CFormTextarea
//                   className="mb-3"
//                   label="Body"
//                   rows={4}
//                   name="body"
//                   value={form.body}
//                   onChange={handleChange}
//                   placeholder="Write gist content..."
//                 />

//                 <CFormInput
//                   className="mb-3"
//                   label="Image URL"
//                   name="imageUrl"
//                   value={form.imageUrl}
//                   onChange={handleChange}
//                   placeholder="https://..."
//                 />

//                 <CFormInput
//                   className="mb-3"
//                   label="Expires At"
//                   type="datetime-local"
//                   name="expiresAt"
//                   value={form.expiresAt}
//                   onChange={handleChange}
//                 />

//                 <CButton color="primary" onClick={handleSubmit}>
//                   Post Gist
//                 </CButton>
//               </CForm>
//             </CCol>

//             {/* RIGHT — LIVE PREVIEW */}
//             <CCol md={6}>
//               <h5 className="mb-3">Live Preview</h5>

//               <CCard className="shadow-sm">
//                 <CCardBody>
//                   <CBadge color="info" className="mb-2">
//                     STREET GIST
//                   </CBadge>

//                   <h4>{form.title || 'Your title appears here'}</h4>

//                   {form.imageUrl && (
//                     <CImage
//                       src={form.imageUrl}
//                       fluid
//                       className="my-3 rounded"
//                     />
//                   )}

//                   <p className="text-medium-emphasis">
//                     {form.body || 'Gist content preview...'}
//                   </p>

//                   {form.expiresAt && (
//                     <small className="text-muted">
//                       Expires: {new Date(form.expiresAt).toLocaleString()}
//                     </small>
//                   )}
//                 </CCardBody>
//               </CCard>
//             </CCol>
//           </CRow>
//         </CCardBody>
//       </CCard>

//       {/* FUTURE — LIST OF GISTS */}
//       <CCard>
//         <CCardHeader>Existing Gists</CCardHeader>
//         <CCardBody>Coming next: gist list + edit + delete</CCardBody>
//       </CCard>
//     </>
//   )
// }



import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CForm,
  CFormInput,
  CFormTextarea,
  CButton,
  CImage,
  CSpinner,
} from '@coreui/react'

import { uploadImage } from '../../api/uploadImage'
import { createGist } from '../../api/gist'



export default function StreetGist() {
  const [form, setForm] = useState({
    title: '',
    body: '',
    imageUrl: '',
    expiresAt: '',
  })

  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  // loading + feedback state
const [posting, setPosting] = useState(false)
const [message, setMessage] = useState('')

// TODO: get token from your auth context or storage
 const token = localStorage.getItem('adminToken')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // IMAGE UPLOAD HANDLER
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const imageUrl = await uploadImage(file)

      setForm((prev) => ({
        ...prev,
        imageUrl,
      }))
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
  console.log("TOKEN:", token)

  const payload = {
    title: form.title,
    body: form.body,
    imageUrl: form.imageUrl,
    expiresAt: new Date(form.expiresAt).toISOString(),
  }

  console.log("PAYLOAD:", payload)

  try {
    setPosting(true)
    setMessage('Posting gist...')

     await createGist(payload, token)
    // await createGist(payload)


    setMessage('✅ Gist posted successfully')

  } catch (err) {
    console.error("ERROR:", err.response?.data || err)
    setMessage(err.response?.data?.message || '❌ Failed to post gist')
  } finally {
    setPosting(false)
  }
}


// const handleSubmit = async () => {
//   if (!form.title || !form.body || !form.imageUrl || !form.expiresAt) {
//     setMessage('All fields required')
//     return
//   }

//   const payload = {
//     title: form.title,
//     body: form.body,
//     imageUrl: form.imageUrl,
//     expiresAt: new Date(form.expiresAt).toISOString(),
//   }

//   try {
//     setPosting(true)
//     setMessage('Posting gist...')
//     console.log("TOKEN:", token)


//     await createGist(payload, token)

//     setMessage('✅ Gist posted successfully')

//     // reset form
//     setForm({
//       title: '',
//       body: '',
//       imageUrl: '',
//       expiresAt: '',
//     })
//     setPreview(null)

//   } catch (err) {
//   console.error("FULL ERROR:", err.response?.data || err.message)
//   setMessage(err.response?.data?.message || '❌ Failed to post gist')
// }
//  finally {
//     setPosting(false)
//   }
// }

  // const handleSubmit = () => {
  //   console.log('Gist payload:', form)
  //   // next step → send to your backend
  // }

  return (
    <CCard>
      <CCardHeader>
        <strong>Street Gist Management</strong>
      </CCardHeader>

      <CCardBody>
        <CRow>
          {/* FORM */}
          <CCol md={6}>
            <CForm>
              <CFormInput
                className="mb-3"
                label="Title"
                name="title"
                onChange={handleChange}
              />

              <CFormTextarea
                className="mb-3"
                label="Body"
                rows={4}
                name="body"
                onChange={handleChange}
              />

              {/* NEW IMAGE UPLOAD */}
              <CFormInput
                className="mb-3"
                label="Upload Image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />

              {uploading && (
                <div className="mb-3">
                  <CSpinner size="sm" /> Uploading image...
                </div>
              )}

              <CFormInput
                className="mb-3"
                label="Expires At"
                type="datetime-local"
                name="expiresAt"
                onChange={handleChange}
              />

              <CButton color="primary" onClick={handleSubmit} disabled={posting}>
  {posting ? 'Posting...' : 'Post Gist'}
</CButton>

{message && (
  <div className="mt-3">
    {message}
  </div>
)}

            </CForm>
          </CCol>

          {/* PREVIEW */}
          <CCol md={6}>
            <h5>Preview</h5>

            {preview && (
              <CImage src={preview} fluid className="rounded shadow" />
            )}
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}
