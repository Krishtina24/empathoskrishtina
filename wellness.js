const express = require('express');
const Activity = require('../models/Activity');
const router = express.Router();

router.post('/:userId', async (req, res) => {
  try {
    const { type, duration, notes } = req.body;
    
    const activity = new Activity({
      activity: `Completed ${type} activity`,
      notes,
      userId: req.params.userId
    });
    await activity.save();

    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;