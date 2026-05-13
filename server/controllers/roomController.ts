import { Response } from 'express'
import { nanoid } from 'nanoid'
import Room from '../models/Room.js'
import Message from '../models/Message.js'
import { AuthRequest } from '../middleware/auth.js'

export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name } = req.body
    const roomId = nanoid(10)

    const room = await Room.create({
      roomId,
      name: name || '',
      createdBy: req.user?._id,
      participants: [req.user?._id],
    })

    res.status(201).json({ message: 'Room created.', room })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Could not create room.', error: error.message })
  }
}

export async function joinRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { roomId } = req.body

    const room = await Room.findOne({ roomId })
    if (!room) {
      res.status(404).json({ message: 'Room not found.' })
      return
    }

    if (!room.participants.includes(req.user?._id!)) {
      room.participants.push(req.user?._id!)
      await room.save()
    }

    res.status(200).json({ message: 'Joined room.', room })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Could not join room.', error: error.message })
  }
}

export async function getRoomMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { roomId } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50

    const room = await Room.findOne({ roomId })
    if (!room) {
      res.status(404).json({ message: 'Room not found.' })
      return
    }

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    res.status(200).json({ messages: messages.reverse() })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Could not fetch messages.', error: error.message })
  }
}

export async function getRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
    if (!room) {
      res.status(404).json({ message: 'Room not found.' })
      return
    }
    res.status(200).json({ room })
  } catch (err) {
    const error = err as Error
    res.status(500).json({ message: 'Could not fetch room.', error: error.message })
  }
}
