const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, avatar, bio } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields (name, username, email, password).' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: avatar || undefined,
      bio: bio || undefined
    });

    await user.save();
    await user.populate('followers', 'name username avatar bio');
    await user.populate('following', 'name username avatar bio');

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Please provide email/username and password.' });
    }

    const user = await User.findOne({
      $or: [{ email: usernameOrEmail.toLowerCase() }, { username: usernameOrEmail.toLowerCase() }]
    })
    .populate('followers', 'name username avatar bio')
    .populate('following', 'name username avatar bio');

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Logged in successfully!',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'name username avatar bio')
      .populate('following', 'name username avatar bio');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

module.exports = router;
