import { Router } from 'express'
import { signup, login, getMe, logout } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', protect, getMe)
router.post('/logout', protect, logout)

export default router
