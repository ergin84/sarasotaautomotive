const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  fullDescription: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'fas fa-cog' // FontAwesome icon class
  },
  images: [{
    type: String // URLs to uploaded images
  }],
  mainImage: {
    type: String, // URL of the main image displayed on service card
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for ordering
serviceSchema.index({ order: 1 });

module.exports = mongoose.model('Service', serviceSchema);
