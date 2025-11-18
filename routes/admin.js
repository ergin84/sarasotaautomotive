const express = require('express');
const RentalRequest = require('../models/RentalRequest');
const Car = require('../models/Car');
const auth = require('../middleware/auth');
const router = express.Router();

const ALLOWED_REQUEST_TYPES = ['rent', 'sale'];
const ALLOWED_STATUSES = ['new', 'contacted', 'ongoing', 'closed'];

// All admin routes require authentication
router.use(auth);

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalCarsForSale,
      availableCarsForSale,
      soldCars,
      totalRentCars,
      totalRentalRequests,
      totalSaleRequests,
      newRentalRequests,
      newSaleRequests
    ] = await Promise.all([
      Car.countDocuments({ type: 'sale' }),
      Car.countDocuments({ type: 'sale', status: 'available' }),
      Car.countDocuments({ type: 'sale', status: 'sold' }),
      Car.countDocuments({ type: 'rent' }),
      RentalRequest.countDocuments({ requestType: 'rent' }),
      RentalRequest.countDocuments({ requestType: 'sale' }),
      RentalRequest.countDocuments({ requestType: 'rent', status: 'new' }),
      RentalRequest.countDocuments({ requestType: 'sale', status: 'new' })
    ]);

    res.json({
      carsForSale: {
        total: totalCarsForSale,
        available: availableCarsForSale,
        sold: soldCars
      },
      rentCars: {
        total: totalRentCars
      },
      requests: {
        rent: {
          total: totalRentalRequests,
          new: newRentalRequests
        },
        sale: {
          total: totalSaleRequests,
          new: newSaleRequests
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

function parsePaginationParams(req) {
  const limitRaw = parseInt(req.query.limit, 10);
  const pageRaw = parseInt(req.query.page, 10);
  const limit = Math.min(Math.max(limitRaw || 10, 1), 100);
  const page = Math.max(pageRaw || 1, 1);
  return { page, limit };
}

async function fetchRequests(type, paginationOptions = {}) {
  const filter = {};
  if (type && ALLOWED_REQUEST_TYPES.includes(type)) {
    filter.requestType = type;
  }

  const limitRaw = parseInt(paginationOptions.limit, 10);
  const pageRaw = parseInt(paginationOptions.page, 10);
  const limit = Math.min(Math.max(limitRaw || 10, 1), 100);
  const total = await RentalRequest.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(pageRaw || 1, 1), totalPages);
  const skip = (page - 1) * limit;

  const data = await RentalRequest.find(filter)
    .populate('carId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages
  };
}

// Get requests (optionally filtered by type)
router.get('/requests', async (req, res) => {
  try {
    const type = req.query.type;
    const { page, limit } = parsePaginationParams(req);
    const result = await fetchRequests(type, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Backwards compatibility: rental requests endpoint
router.get('/rental-requests', async (req, res) => {
  try {
    const hasPagination = typeof req.query.page !== 'undefined' || typeof req.query.limit !== 'undefined';
    const { page, limit } = parsePaginationParams(req);
    const result = await fetchRequests('rent', { page, limit });
    if (hasPagination) {
      res.json(result);
    } else {
      res.json(result.data);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

async function updateRequestStatusById(id, status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const request = await RentalRequest.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  ).populate('carId');

  if (!request) {
    const error = new Error('Request not found');
    error.statusCode = 404;
    throw error;
  }

  return request;
}

// Update request status
router.patch('/requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await updateRequestStatusById(req.params.id, status);
    res.json(updated);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server error' });
  }
});

// Backwards compatibility: rental request status endpoint
router.patch('/rental-requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await updateRequestStatusById(req.params.id, status);
    res.json(updated);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server error' });
  }
});

// Delete request
router.delete('/requests/:id', async (req, res) => {
  try {
    const deleted = await RentalRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.json({ message: 'Request deleted', request: deleted });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Backwards compatibility delete route
router.delete('/rental-requests/:id', async (req, res) => {
  try {
    const deleted = await RentalRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.json({ message: 'Request deleted', request: deleted });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;


