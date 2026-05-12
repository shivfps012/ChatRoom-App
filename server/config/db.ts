import mongoose from 'mongoose'

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatroom')
    console.log('✅ MongoDB connected')
  } catch (err) {
    const error = err as Error
    console.error('❌ MongoDB connection error:', error.message)
    process.exit(1)
  }
}

export default connectDB
