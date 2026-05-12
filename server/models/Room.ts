import mongoose, { Document, Schema } from 'mongoose'

export interface IRoom extends Document {
  roomId: string
  name: string
  createdBy: mongoose.Types.ObjectId
  participants: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const roomSchema = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
)

export default mongoose.model<IRoom>('Room', roomSchema)
