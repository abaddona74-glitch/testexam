import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  recipient: {
    type: String, // null or 'all' for public, username for DM
    default: 'all',
  },
  type: {
    type: String,
    enum: ['public', 'dm'],
    default: 'public',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Auto-delete messages older than 24 hours
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
