import { z } from 'zod'

export const createRoomSchema = z.object({
  name: z.string().max(100, 'Room name must be less than 100 characters').optional(),
})

export const joinRoomSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
})

export const getRoomParamSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
})

export const messageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type GetRoomParamInput = z.infer<typeof getRoomParamSchema>
export type MessageQueryInput = z.infer<typeof messageQuerySchema>
