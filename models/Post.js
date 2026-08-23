const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    image: {
      type: String,
      default: null
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    commentsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Virtual field for likesCount
postSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
