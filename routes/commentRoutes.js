const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get comments for a post
router.get('/posts/:postId/comments', optionalAuth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name username avatar')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// Add comment to a post
router.post('/posts/:postId/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.postId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const comment = new Comment({
      post: postId,
      author: req.user._id,
      content: content.trim()
    });

    await comment.save();
    await comment.populate('author', 'name username avatar');

    // Update commentsCount on Post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    res.status(201).json({
      message: 'Comment added!',
      comment,
      commentsCount: post.commentsCount
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// Delete comment
router.delete('/comments/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const post = await Post.findById(comment.post);

    // Comment author or Post author can delete the comment
    const isCommentAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = post && post.author.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
    }

    await Comment.findByIdAndDelete(req.params.id);

    if (post && post.commentsCount > 0) {
      post.commentsCount -= 1;
      await post.save();
    }

    res.json({
      message: 'Comment deleted successfully.',
      commentsCount: post ? post.commentsCount : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
