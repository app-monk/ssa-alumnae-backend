const mongoose = require('mongoose');

// Define the main event schema
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Event description cannot exceed 1000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  time: {
    type: String,
    required: [true, 'Event time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)']
  },
  location: {
    type: String,
    required: [true, 'Event location is required'],
    trim: true,
    maxlength: [300, 'Event location cannot exceed 300 characters']
  },
  detailsUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'URL cannot exceed 500 characters'],
    match: [/^https?:\/\/.+/, 'Please enter a valid URL starting with http:// or https://']
  },
  organizerName: {
    type: String,
    required: [true, 'Organizer name is required'],
    trim: true,
    maxlength: [100, 'Organizer name cannot exceed 100 characters']
  },
  organizerEmail: {
    type: String,
    required: [true, 'Organizer email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  organizerPhone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  audience: {
    type: String,
    enum: {
      values: ['batch', 'group', 'alumnae'],
      message: 'Audience must be either batch, group, or alumnae'
    },
    default: 'alumnae'
  },
  batchYear: {
    type: Number,
    min: [1900, 'Batch year must be after 1900'],
    max: [new Date().getFullYear() + 5, 'Batch year cannot be more than 5 years in the future']
  },
  groupName: {
    type: String,
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  createdBy: {
    type: String,
    index: false  // Explicitly disable automatic index
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateUpdated: {
    type: Date
  }
});

// Remove all individual indexes and replace with a single compound index
eventSchema.index({
  date: 1,
  time: 1,
  createdBy: 1,
  audience: 1,
  batchYear: 1,
  groupName: 1
}, { 
  name: 'event_compound_idx' 
});

// Add text search index separately
eventSchema.index({ 
  title: 'text',
  description: 'text',
  location: 'text'
}, { 
  name: 'event_text_idx' 
});

// Virtual for event ID
eventSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Middleware to set dateUpdated before save
eventSchema.pre('save', function(next) {
  this.dateUpdated = Date.now();
  next();
});

// Ensure batchYear is required when audience is 'batch'
eventSchema.pre('validate', function(next) {
  if (this.audience === 'batch' && !this.batchYear) {
    next(new Error('Batch year is required when audience is batch'));
  } else if (this.audience === 'group' && !this.groupName) {
    next(new Error('Group name is required when audience is group'));
  } else {
    next();
  }
});

// Ensure batchYear and groupName are not set when not needed
eventSchema.pre('validate', function(next) {
  if (this.audience !== 'batch') {
    this.batchYear = undefined;
  }
  
  if (this.audience !== 'group') {
    this.groupName = undefined;
  }
  
  next();
});

// Configure toJSON to include virtuals and hide unnecessary fields
eventSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Event', eventSchema);