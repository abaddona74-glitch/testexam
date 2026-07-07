import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema({
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  inviterName: {
    type: String,
    required: true,
    trim: true,
  },
  inviterId: {
    type: String,
    default: null,
    trim: true,
  },
  inviteeName: {
    type: String,
    default: null,
    trim: true,
  },
  bonusStars: {
    type: Number,
    default: 50, // Fixed 50 stars per side
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ReferralSchema.index({ inviterName: 1, createdAt: -1 });
ReferralSchema.index({ inviteeName: 1 });

export default mongoose.models.Referral || mongoose.model('Referral', ReferralSchema);
