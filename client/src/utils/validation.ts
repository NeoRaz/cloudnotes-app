// Validation helpers for frontend forms

export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*,.()\-+_={}[\]{};'\\:"|\\/<>?~`]).{8,}$/;

export interface ValidationErrors {
  [key: string]: string;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email address is required';
  if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Must contain at least one lowercase letter';
  if (!/\d/.test(password)) return 'Must contain at least one digit';
  if (!/[!@#$%^&*,.()\-+_={}[\]{};'\\:"|\\/<>?~`]/.test(password)) return 'Must contain at least one special character';
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} is required`;
  return null;
}

export function validatePasswordMatch(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Password confirmation is required';
  if (password !== confirmation) return 'Passwords do not match';
  return null;
}
