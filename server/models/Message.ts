import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage extends Document {
  roomId: string
  senderId: mongoose.Types.ObjectId
  senderUsername: string
  message: string
  imageUrl?: string
  videoUrl?: string
  replyTo?: {
    messageId: string
    senderId: string
    senderUsername: string
    messagePreview: string
    imageUrl?: string
    videoUrl?: string
  } | null
  readBy: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const replyToSchema = new Schema(
  {
    messageId: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderUsername: {
      type: String,
      required: true,
    },
    messagePreview: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '',
    },
  },
  { _id: false }
)

const messageSchema = new Schema<IMessage>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderUsername: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '',
    },
    replyTo: {
      type: replyToSchema,
      default: null,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
)

export default mongoose.model<IMessage>('Message', messageSchema)
