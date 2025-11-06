const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  // Common fields
  brand: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'rent'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'coming_soon'],
    default: 'available'
  },
  description: {
    type: String,
    default: ''
  },
  images: {
    type: [String],
    default: []
  },
  
  // Fields for sale cars
  modelVersion: {
    type: String,
    default: ''
  },
  mileage: {
    type: Number
  },
  gearbox: {
    type: String,
    enum: ['Manual', 'Automatic', 'CVT', 'Semi-Automatic']
  },
  firstRegistrationDate: {
    type: Date
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid', 'LPG', 'CNG']
  },
  power: {
    type: Number // in HP or kW
  },
  price: {
    type: Number
  },
  vehicleOptions: {
    type: [String],
    default: []
  },
  
  // Fields for rent cars
  dailyRate: {
    type: Number
  },
  numPersons: {
    type: Number
  },
  ownerEmail: {
    type: String
  },
  
  // Legacy fields (for backward compatibility)
  make: String,
  year: Number,
  image: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Car', carSchema);


