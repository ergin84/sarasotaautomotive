const express = require('express');
const RentalRequest = require('../models/RentalRequest');
const Car = require('../models/Car');
const { getAdminEmail, sendMail } = require('../services/email');

const router = express.Router();

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function sendAdminNotificationEmail(request, car) {
  try {
    const toEmail = await getAdminEmail();
    if (!toEmail) {
      console.warn('Admin notification skipped: no admin email configured');
      return;
    }

    const carTitle = [
      car?.year,
      car?.brand || car?.make,
      car?.model
    ].filter(Boolean).join(' ') || 'Vehicle';

    const requestType = request.requestType === 'rent' ? 'Rental' : 'Sale';

    const lines = [
      `<h2>New ${requestType} Request</h2>`,
      `<p><strong>Car:</strong> ${carTitle}</p>`,
      `<p><strong>Client:</strong> ${request.clientName}</p>`,
      `<p><strong>Email:</strong> ${request.clientEmail}</p>`,
      `<p><strong>Phone:</strong> ${request.clientPhone}</p>`
    ];

    if (request.requestType === 'rent' && request.startDate && request.endDate) {
      lines.push(`<p><strong>Rental dates:</strong> ${new Date(request.startDate).toLocaleDateString()} → ${new Date(request.endDate).toLocaleDateString()}</p>`);
    }

    if (request.message) {
      lines.push('<p><strong>Message:</strong></p>');
      lines.push(`<p>${request.message.replace(/\n/g, '<br>')}</p>`);
    }

    lines.push(`<p><em>Submitted at ${new Date(request.createdAt).toLocaleString()}</em></p>`);

    await sendMail({
      to: toEmail,
      subject: `New ${requestType} Request for ${carTitle}`,
      html: lines.join('\n')
    });
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
  }
}

router.post('/', async (req, res) => {
  try {
    const {
      carId,
      requestType,
      clientName,
      clientEmail,
      clientPhone,
      message,
      startDate,
      endDate
    } = req.body || {};

    if (!carId) {
      return res.status(400).json({ message: 'Missing car ID' });
    }

    const type = normalizeString(requestType).toLowerCase();
    if (!['rent', 'sale'].includes(type)) {
      return res.status(400).json({ message: 'Invalid request type' });
    }

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const carType = normalizeString(car.type).toLowerCase();
    if (carType && carType !== type) {
      return res.status(400).json({ message: 'Request type does not match car availability' });
    }

    const requestBody = {
      carId,
      requestType: type,
      clientName: normalizeString(clientName),
      clientEmail: normalizeString(clientEmail),
      clientPhone: normalizeString(clientPhone),
      message: normalizeString(message)
    };

    if (!requestBody.clientName || !requestBody.clientEmail || !requestBody.clientPhone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    if (type === 'rent') {
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start and end dates are required for rental requests' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid rental dates provided' });
      }

      if (start > end) {
        return res.status(400).json({ message: 'Start date must be before end date' });
      }

      requestBody.startDate = start;
      requestBody.endDate = end;
    }

    const request = new RentalRequest(requestBody);
    await request.save();

    sendAdminNotificationEmail(request, car);

    res.status(201).json({
      message: 'Request submitted successfully',
      request
    });
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ message: 'Error submitting request', error: error.message });
  }
});

module.exports = router;

