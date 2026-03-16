export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const isValidPassword = (password: string): boolean =>
  password.length >= 8

export const isValidPhone = (phone: string): boolean =>
  /^\+?[\d\s\-()]{8,}$/.test(phone)

export const isValidCard = (number: string): boolean =>
  /^\d{16}$/.test(number.replace(/\s/g, ''))

export const isValidCVV = (cvv: string): boolean => /^\d{3,4}$/.test(cvv)

export const isValidExpiry = (expiry: string): boolean =>
  /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)
