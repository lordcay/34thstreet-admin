import axios from 'axios'

const CLOUD_NAME = 'de2wocs21'
const UPLOAD_PRESET = 'unsigned_upload'

export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/de2wocs21/image/upload`,
    formData
  )

  return res.data.secure_url
}
