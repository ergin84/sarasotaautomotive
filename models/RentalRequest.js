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
    enum: ['new', 'contacted', 'ongoing', 'closed'],
    default: 'new',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);


