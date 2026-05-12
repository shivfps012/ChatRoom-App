import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage extends Document {
  roomId: string
  senderId: mongoose.Types.ObjectId
  senderUsername: string
  message: string
  imageUrl?: string
  readBy: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

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
