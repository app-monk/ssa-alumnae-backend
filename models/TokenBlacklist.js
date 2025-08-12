const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '7d' } // Automatically delete after 7 days
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreated: {
    type: Date,
    default: Date.now
  }
});

// Index for better performance
tokenBlacklistSchema.index({ token: 1 });
tokenBlacklistSchema.index({ userId: 1 });
tokenBlacklistSchema.index({ expiresAt: 1 });

tokenBlacklistSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

tokenBlacklistSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);