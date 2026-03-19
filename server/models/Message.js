import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
)

export default mongoose.model('Message', messageSchema)
