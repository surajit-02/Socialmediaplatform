const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get Posts Feed (All / Following / User Specific)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { feed, username, search } = req.query;
    let query = {};

    if (username) {
      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        return res.json([]);
      }
      query.author = user._id;
    } else if (feed === 'following' && req.user) {
      // Get array of user IDs req.user is following + req.user._id
      const currentUser = await User.findById(req.user._id);
      const followingIds = currentUser ? [...currentUser.following, currentUser._id] : [];
      query.author = { $in: followingIds };
    }

    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const posts = await Post.find(query)
      .populate('author', 'name username avatar bio')
      .sort({ createdAt: -1 })
      .limit(50);

    const currentUserId = req.user ? req.user._id.toString() : null;

    const formattedPosts = posts.map(post => {
      const pObj = post.toObject();
      pObj.isLiked = currentUserId ? post.likes.some(id => id.toString() === currentUserId) : false;
      pObj.likesCount = post.likes.length;
      return pObj;
    });

    res.json(formattedPosts);
  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// Create Post
router.post('/', auth, async (req, res) => {
  try {
    const { content, image, mediaType } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    const post = new Post({
      author: req.user._id,
      content: content.trim(),
      image: image || null,
      mediaType: mediaType || 'image'
    });

    await post.save();
    await post.populate('author', 'name username avatar bio');

    const pObj = post.toObject();
    pObj.isLiked = false;
    pObj.likesCount = 0;

    res.status(201).json({
      message: 'Post published!',
      post: pObj
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// Get Single Post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name username avatar bio');
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const currentUserId = req.user ? req.user._id.toString() : null;
    const pObj = post.toObject();
    pObj.isLiked = currentUserId ? post.likes.some(id => id.toString() === currentUserId) : false;
    pObj.likesCount = post.likes.length;

    res.json(pObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// Delete Post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post: req.params.id });

    res.json({ message: 'Post and associated comments deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// Toggle Like / Unlike Post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const currentUserId = req.user._id.toString();
    const hasLiked = post.likes.some(id => id.toString() === currentUserId);

    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== currentUserId);
    } else {
      // Like
      post.likes.push(currentUserId);
    }

    await post.save();

    res.json({
      message: hasLiked ? 'Post unliked' : 'Post liked!',
      isLiked: !hasLiked,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('Like toggle error:', error);
    res.status(500).json({ error: 'Failed to update like status.' });
  }
});

module.exports = router;
