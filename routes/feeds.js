const express = require('express');
const Car = require('../models/Car');
const router = express.Router();

// Google Vehicle Ads feed (JSON example; GMC may also accept scheduled fetches)
router.get('/google-vehicles.json', async (req, res) => {
  try {
    const cars = await Car.find({ type: 'sale', status: 'available' }).sort({ updatedAt: -1 });
    const items = cars.map((c) => ({
      id: String(c._id),
      title: `${c.year} ${c.make} ${c.model}`.trim(),
      description: c.description,
      image_link: c.image || '',
      price: c.price,
      mileage: c.mileage,
      condition: 'used',
      make: c.make,
      model: c.model,
      year: c.year,
      availability: c.status === 'available' ? 'in_stock' : 'out_of_stock',
      link: `${req.protocol}://${req.get('host')}/#car-${c._id}`
    }));
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Facebook Vehicle Catalog feed (CSV minimal). CSV formatting here is simple; for production consider escaping/quoting.
router.get('/meta-vehicles.csv', async (req, res) => {
  try {
    const cars = await Car.find({ type: 'sale', status: 'available' }).sort({ updatedAt: -1 });
    const headers = [
      'id', 'title', 'description', 'image_link', 'price', 'mileage', 'condition', 'make', 'model', 'year', 'availability', 'link'
    ];
    const rows = cars.map((c) => [
      String(c._id),
      `${c.year} ${c.make} ${c.model}`.trim(),
      (c.description || '').replace(/\n/g, ' ').replace(/\r/g, ' '),
      c.image || '',
      c.price,
      c.mileage,
      'used',
      c.make,
      c.model,
      c.year,
      c.status === 'available' ? 'in stock' : 'out of stock',
      `${req.protocol}://${req.get('host')}/#car-${c._id}`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))].join('\n');
    res.header('Content-Type', 'text/csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


