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

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
