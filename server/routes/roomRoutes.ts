import { Router } from 'express'
import {
  createRoom,
  joinRoom,
  getRoomMessages,
  getRoom,
} from '../controllers/roomController.js'
import { protect } from '../middleware/auth.js'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js'
import {
  createRoomSchema,
  joinRoomSchema,
  getRoomParamSchema,
  messageQuerySchema,
} from '../schemas/roomSchemas.js'

const router = Router()

router.use(protect) // All room routes require auth

router.post('/create', validateBody(createRoomSchema), createRoom)
router.post('/join', validateBody(joinRoomSchema), joinRoom)
router.get('/:roomId', validateParams(getRoomParamSchema), getRoom)
router.get('/:roomId/messages', validateParams(getRoomParamSchema), validateQuery(messageQuerySchema), getRoomMessages)

export default router
