const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  mood: { type: String, required: true },
  notes: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Mood', moodSchema);