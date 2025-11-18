const express = require('express');
const Car = require('../models/Car');
const router = express.Router();

const GOOGLE_PRICE_CURRENCY = 'USD';
const META_PRICE_CURRENCY = 'USD';

const buildCanonicalUrl = (req, carId) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  return `${origin}/#car-${carId}`;
};

const ensureAbsoluteUrl = (req, value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  return `${origin}${normalized}`;
};

const buildImageList = (req, images = []) =>
  images
    .filter(Boolean)
    .map((img) => ensureAbsoluteUrl(req, img));

const pickPrimaryImage = (req, car) => {
  if (Array.isArray(car.images) && car.images.length > 0) {
    return ensureAbsoluteUrl(req, car.images[0]);
  }
  return ensureAbsoluteUrl(req, car.image || '');
};

const normaliseMake = (car) => car.make || car.brand || '';
const normaliseModel = (car) => car.model || car.modelVersion || '';
const normaliseYear = (car) => {
  if (car.year) return car.year;
  if (car.firstRegistrationDate) {
    return new Date(car.firstRegistrationDate).getFullYear();
  }
  return '';
};

const formatPrice = (price, currency) => {
  if (price == null) return '';
  // Google/META accept either integers or two-decimal floats with trailing currency.
  const value = Number.isFinite(price) ? price.toFixed(2) : '';
  if (!value) return '';
  return `${value} ${currency}`;
};

// Google Vehicle Ads feed (JSON example; GMC may also accept scheduled fetches)
router.get('/google-vehicles.json', async (req, res) => {
  try {
    const cars = await Car.find({ type: 'sale', status: 'available' }).sort({ updatedAt: -1 });
    const items = cars.map((c) => ({
      id: String(c._id),
      title: `${normaliseYear(c)} ${normaliseMake(c)} ${normaliseModel(c)}`.trim(),
      description: c.description || '',
      image_link: pickPrimaryImage(req, c),
      additional_image_link: buildImageList(req, Array.isArray(c.images) ? c.images.slice(1) : []).join(','),
      price: formatPrice(c.price, GOOGLE_PRICE_CURRENCY),
      mileage: c.mileage ?? '',
      condition: 'used',
      make: normaliseMake(c),
      model: normaliseModel(c),
      year: normaliseYear(c),
      fuel_type: c.fuelType || '',
      transmission: c.gearbox || '',
      availability: c.status === 'available' ? 'in_stock' : 'out_of_stock',
      link: buildCanonicalUrl(req, c._id)
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
      'id',
      'title',
      'description',
      'image_link',
      'additional_image_link',
      'price',
      'mileage',
      'condition',
      'make',
      'model',
      'year',
      'fuel_type',
      'transmission',
      'availability',
      'link'
    ];
    const rows = cars.map((c) => [
      String(c._id),
      `${normaliseYear(c)} ${normaliseMake(c)} ${normaliseModel(c)}`.trim(),
      (c.description || '').replace(/\n/g, ' ').replace(/\r/g, ' '),
      pickPrimaryImage(req, c),
      buildImageList(req, Array.isArray(c.images) ? c.images.slice(1) : []).join('|'),
      formatPrice(c.price, META_PRICE_CURRENCY),
      c.mileage ?? '',
      'used',
      normaliseMake(c),
      normaliseModel(c),
      normaliseYear(c),
      c.fuelType || '',
      c.gearbox || '',
      c.status === 'available' ? 'in stock' : 'out of stock',
      buildCanonicalUrl(req, c._id)
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        r
          .map((v) => {
            if (v == null) return '';
            const value = String(v);
            if (/[",\n]/.test(value)) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(',')
      )
    ].join('\n');
    res.header('Content-Type', 'text/csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


