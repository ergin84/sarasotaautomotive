const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique model per brand
modelSchema.index({ brand: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Model', modelSchema);

