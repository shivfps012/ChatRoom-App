import { z } from 'zod'

export const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  email: z.email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
})

export const loginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email format'),
})

export const resetPasswordSchema = z.object({
  email: z.email('Invalid email format'),
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(100),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
