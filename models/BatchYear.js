const mongoose = require('mongoose');



const batchYearSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

batchYearSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

batchYearSchema.set('toJSON', {
  virtuals: true,
});

module.exports = mongoose.model('BatchYear', batchYearSchema);