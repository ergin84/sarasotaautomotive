const express = require('express');
const RentalRequest = require('../models/RentalRequest');
const Car = require('../models/Car');
const auth = require('../middleware/auth');
const router = express.Router();

// All admin routes require authentication
router.use(auth);

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalCarsForSale = await Car.countDocuments({ type: 'sale' });
    const availableCarsForSale = await Car.countDocuments({ type: 'sale', status: 'available' });
    const soldCars = await Car.countDocuments({ type: 'sale', status: 'sold' });
    const totalRentCars = await Car.countDocuments({ type: 'rent' });
    const pendingRentalRequests = await RentalRequest.countDocuments({ status: 'pending' });
    const totalRentalRequests = await RentalRequest.countDocuments();

    res.json({
      carsForSale: {
        total: totalCarsForSale,
        available: availableCarsForSale,
        sold: soldCars
      },
      rentCars: {
        total: totalRentCars
      },
      rentalRequests: {
        total: totalRentalRequests,
        pending: pendingRentalRequests
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all rental requests
router.get('/rental-requests', async (req, res) => {
  try {
    const requests = await RentalRequest.find()
      .populate('carId')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update rental request status
router.patch('/rental-requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const request = await RentalRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('carId');

    if (!request) {
      return res.status(404).json({ message: 'Rental request not found' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


