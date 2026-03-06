const express = require('express');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const User = require('../models/User');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId });

    const columns = {
      todo: tasks.filter(task => task.column === 'todo'),
      inprogress: tasks.filter(task => task.column === 'inprogress'),
      done: tasks.filter(task => task.column === 'done')
    };

    res.json({ success: true, columns });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:userId', async (req, res) => {
  try {
    const { title, description, subtasks, members, column } = req.body;

    const task = new Task({
      title,
      description,
      subtasks: subtasks || [],
      members: members || [],
      column: column || 'todo',
      userId: req.params.userId
    });
    await task.save();

    const activity = new Activity({
      activity: `Added task: ${title}`,
      userId: req.params.userId
    });
    await activity.save();

    const user = await User.findById(req.params.userId);
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('new-activity', {
        ...activity.toObject(),
        userDisplayName: user ? user.displayName : 'Unknown User',
        time: new Date().toLocaleTimeString()
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:taskId', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;