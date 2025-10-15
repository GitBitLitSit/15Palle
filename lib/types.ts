export interface User {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  date_of_birth: string
  country: string
  city: string
  zip: string
  cp: string
  privacy_accepted: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface RegistrationForm {
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  dateOfBirth: string
  password: string
  country: string
  city: string
  zip: string
  cp: string
  privacyAccepted: boolean
}
