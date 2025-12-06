const mongoose = require('mongoose');

const rentalRequestSchema = new mongoose.Schema({
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  requestType: {
    type: String,
    enum: ['rent', 'sale'],
    default: 'rent',
    index: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true
  },
  clientPhone: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: function requiredStartDate() {
      return this.requestType === 'rent';
    }
  },
  endDate: {
    type: Date,
    required: function requiredEndDate() {
      return this.requestType === 'rent';
    }
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'],
    default: 'new',
    index: true
  },
  photos: [{
    type: String,
    default: []
  }],
  notes: {
    type: String,
    default: ''
  },
  contractGenerated: {
    type: Boolean,
    default: false
  },
  contractGeneratedAt: {
    type: Date
  },
  signedByCustomer: {
    type: Boolean,
    default: false
  },
  signedAt: {
    type: Date
  },
  customPrice: {
    type: Number,
    default: null // If set, this overrides the calculated price
  },
  discountPercent: {
    type: Number,
    default: 0, // Discount percentage (0-100)
    min: 0,
    max: 100
  },
  fuelLevel: {
    type: String,
    enum: ['', 'Empty', '1/4', '1/2', '3/4', 'Full'],
    default: '' // Fuel level at rental start
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);


