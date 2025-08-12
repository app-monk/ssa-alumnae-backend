const mongoose = require('mongoose');

const alumnaSchema = new mongoose.Schema({
  prefix: {
    type: String,
    enum: ['Ms.', 'Mrs.', 'Mr.', 'Dr.', 'Prof.', 'Atty.', 'Eng.', 'Sr.'],
    default: 'Ms.',
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  batchYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BatchYear',
    required: true,
  },
  studentPicture: {
    type: String,
    default: '',
  },
  currentPicture: {
    type: String,
    default: '',
  },
  dateCreated: {
    type: Date, 
    default: Date.now,
  }
});

alumnaSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

alumnaSchema.set('toJSON', {
  virtuals: true,
});

module.exports = mongoose.model('Alumna', alumnaSchema);