const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users (discover/suggestions/search)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const { search } = req.query;

    let query = {};
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    if (search && search.trim().length > 0) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const searchConditions = [
        { name: searchRegex },
        { username: searchRegex },
        { bio: searchRegex }
      ];

      if (query._id) {
        query = {
          _id: query._id,
          $or: searchConditions
        };
      } else {
        query = { $or: searchConditions };
      }
    }

    const users = await User.find(query)
      .select('-password')
      .limit(30)
      .sort({ createdAt: -1 });

    const formattedUsers = users.map(user => {
      const uObj = user.toObject();
      uObj.isFollowing = currentUserId ? user.followers.some(id => id.toString() === currentUserId.toString()) : false;
      return uObj;
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Get user profile by username
router.get('/username/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.username || req.params.username.toLowerCase() })
      .select('-password')
      .populate('followers', 'name username avatar bio')
      .populate('following', 'name username avatar bio');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUserId = req.user ? req.user._id : null;
    const isFollowing = currentUserId
      ? user.followers.some(f => f._id.toString() === currentUserId.toString())
      : false;
    const isSelf = currentUserId ? currentUserId.toString() === user._id.toString() : false;

    // Fetch user posts count
    const postsCount = await Post.countDocuments({ author: user._id });

    res.json({
      ...user.toObject(),
      postsCount,
      isFollowing,
      isSelf
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, avatar, coverImage } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;
    if (coverImage) user.coverImage = coverImage;

    await user.save();
    res.json({ message: 'Profile updated successfully!', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Follow a user
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User to follow not found.' });
    }

    // Check if already following
    if (targetUser.followers.includes(currentUserId)) {
      return res.status(400).json({ error: 'Already following this user.' });
    }

    // Add to target's followers & current's following
    targetUser.followers.push(currentUserId);
    currentUser.following.push(targetUserId);

    await targetUser.save();
    await currentUser.save();

    res.json({
      message: `You are now following @${targetUser.username}`,
      targetUser: {
        _id: targetUser._id,
        followersCount: targetUser.followers.length,
        isFollowing: true
      }
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user.' });
  }
});

// Unfollow a user
router.post('/:id/unfollow', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    targetUser.followers = targetUser.followers.filter(
      id => id.toString() !== currentUserId.toString()
    );
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== targetUserId.toString()
    );

    await targetUser.save();
    await currentUser.save();

    res.json({
      message: `Unfollowed @${targetUser.username}`,
      targetUser: {
        _id: targetUser._id,
        followersCount: targetUser.followers.length,
        isFollowing: false
      }
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user.' });
  }
});

// Get followers list for a user
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'followers',
      'name username avatar bio followers'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUserId = req.user ? req.user._id.toString() : null;
    const followers = user.followers.map(f => {
      const fObj = f.toObject();
      fObj.isFollowing = currentUserId ? f.followers.some(id => id.toString() === currentUserId) : false;
      delete fObj.followers;
      return fObj;
    });

    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers.' });
  }
});

// Get following list for a user
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'following',
      'name username avatar bio followers'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUserId = req.user ? req.user._id.toString() : null;
    const following = user.following.map(f => {
      const fObj = f.toObject();
      fObj.isFollowing = currentUserId ? f.followers.some(id => id.toString() === currentUserId) : false;
      delete fObj.followers;
      return fObj;
    });

    res.json(following);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following.' });
  }
});

module.exports = router;
