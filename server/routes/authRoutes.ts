import { Router } from 'express'
import { signup, login, getMe, logout, forgotPassword, resetPassword } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/authSchemas.js'
import { authLimiter } from '../config/rateLimiter.js'

const router = Router()

router.post('/signup', authLimiter, validateBody(signupSchema), signup)
router.post('/login', authLimiter, validateBody(loginSchema), login)
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword)
router.get('/me', protect, getMe)
router.post('/logout', protect, logout)

export default router
