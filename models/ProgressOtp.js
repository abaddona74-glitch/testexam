import mongoose from 'mongoose';

const ProgressOtpSchema = new mongoose.Schema({
  phone: {
    type: String,
    default: undefined,
  },
  email: {
    type: String,
    default: undefined,
  },
  contactType: {
    type: String,
    enum: ['phone', 'email'],
    default: 'phone',
  },
  codeHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['save', 'restore'],
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ProgressOtp || mongoose.model('ProgressOtp', ProgressOtpSchema);
