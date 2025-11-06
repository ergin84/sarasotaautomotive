const express = require('express');
const Car = require('../models/Car');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all cars for sale
router.get('/sale', async (req, res) => {
  try {
    const cars = await Car.find({ type: 'sale' }).sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all cars for rent
router.get('/rent', async (req, res) => {
  try {
    const cars = await Car.find({ type: 'rent' }).sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single car
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin routes - require authentication
// Add new car
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating car with data:', req.body);
    const car = new Car(req.body);
    await car.validate(); // Validate before saving
    await car.save();
    console.log('Car saved successfully:', car._id);
    // Fire-and-forget: trigger feed refresh workflow (stub)
    try {
      require('../services/marketingFlow').onCarCreated(car).catch(() => {});
    } catch (_) {}
    res.status(201).json(car);
  } catch (error) {
    console.error('Error creating car:', error);
    res.status(400).json({ 
      message: 'Error creating car', 
      error: error.message,
      details: error.errors || undefined
    });
  }
});

// Update car
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating car:', req.params.id, 'with data:', req.body);
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    console.log('Car updated successfully:', car._id);
    res.json(car);
  } catch (error) {
    console.error('Error updating car:', error);
    res.status(400).json({ 
      message: 'Error updating car', 
      error: error.message,
      details: error.errors || undefined
    });
  }
});

// Delete car
router.delete('/:id', auth, async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark car as sold
router.patch('/:id/sold', auth, async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { status: 'sold' },
      { new: true }
    );
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


