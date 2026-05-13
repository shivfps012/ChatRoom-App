import { Router } from 'express'
import { signup, login, getMe, logout } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { signupSchema, loginSchema } from '../schemas/authSchemas.js'

const router = Router()

router.post('/signup', validateBody(signupSchema), signup)
router.post('/login', validateBody(loginSchema), login)
router.get('/me', protect, getMe)
router.post('/logout', protect, logout)

export default router
