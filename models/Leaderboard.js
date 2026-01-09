import mongoose from 'mongoose';

const LeaderboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  testName: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  difficulty: {
    type: String,
    required: false, // Make it optional for backward compatibility
  },
  duration: {
    type: Number, // milliseconds
    required: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  questions: {
    type: Array, // Stores the full question objects for review
    required: false,
  },
  answers: {
    type: Array, // Stores the user's answers (indices or IDs)
    required: false,
  }
});

export default mongoose.models.Leaderboard || mongoose.model('Leaderboard', LeaderboardSchema);
