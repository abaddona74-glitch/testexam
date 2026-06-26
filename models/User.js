import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  stars: {
    type: Number,
    default: 100, // Initial bonus 100 stars
    min: 0,
  },
  lastSpinDate: {
    type: String, // Store date as 'YYYY-MM-DD' ISO date string for daily spin check
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
