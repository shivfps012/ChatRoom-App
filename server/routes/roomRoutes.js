import express from 'express'
import {
  createRoom,
  joinRoom,
  getRoomMessages,
  getRoom,
} from '../controllers/roomController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.use(protect) // All room routes require auth

router.post('/create', createRoom)
router.post('/join', joinRoom)
router.get('/:roomId', getRoom)
router.get('/:roomId/messages', getRoomMessages)

export default router
