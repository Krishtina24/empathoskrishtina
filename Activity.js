const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  activity: { type: String, required: true },
  mood: String,
  type: { type: String, default: 'system' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);