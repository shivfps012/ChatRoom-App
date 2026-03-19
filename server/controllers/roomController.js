import { nanoid } from 'nanoid'
import Room from '../models/Room.js'
import Message from '../models/Message.js'

// POST /api/rooms/create
export async function createRoom(req, res) {
  try {
    const { name } = req.body
    const roomId = nanoid(10)

    const room = await Room.create({
      roomId,
      name: name || '',
      createdBy: req.user._id,
      participants: [req.user._id],
    })

    res.status(201).json({ message: 'Room created.', room })
  } catch (err) {
    res.status(500).json({ message: 'Could not create room.', error: err.message })
  }
}

// POST /api/rooms/join
export async function joinRoom(req, res) {
  try {
    const { roomId } = req.body

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required.' })
    }

    const room = await Room.findOne({ roomId })
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }

    // Add user to participants if not already present
    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id)
      await room.save()
    }

    res.status(200).json({ message: 'Joined room.', room })
  } catch (err) {
    res.status(500).json({ message: 'Could not join room.', error: err.message })
  }
}

// GET /api/rooms/:roomId/messages
export async function getRoomMessages(req, res) {
  try {
    const { roomId } = req.params
    const { page = 1, limit = 50 } = req.query

    const room = await Room.findOne({ roomId })
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }

    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean()

    // Return oldest-first
    res.status(200).json({ messages: messages.reverse() })
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch messages.', error: err.message })
  }
}

// GET /api/rooms/:roomId — validate room exists
export async function getRoom(req, res) {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }
    res.status(200).json({ room })
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch room.', error: err.message })
  }
}
