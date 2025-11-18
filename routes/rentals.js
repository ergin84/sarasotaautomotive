const express = require('express');
const RentalRequest = require('../models/RentalRequest');
const Car = require('../models/Car');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter setup (only if credentials are provided)
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Submit rental inquiry
router.post('/inquiry', async (req, res) => {
  try {
    const { carId, clientName, clientEmail, clientPhone, message, startDate, endDate } = req.body;

    // Validate car exists
    const car = await Car.findById(carId);
    if (!car || car.type !== 'rent') {
      return res.status(404).json({ message: 'Rental car not found' });
    }

    // Create rental request
    const rentalRequest = new RentalRequest({
      carId,
      requestType: 'rent',
      clientName,
      clientEmail,
      clientPhone,
      message,
      startDate,
      endDate
    });

    await rentalRequest.save();

    // Send email to owner
    if (car.ownerEmail && transporter) {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: car.ownerEmail,
        subject: `New Rental Inquiry for ${car.year} ${car.make} ${car.model}`,
        html: `
          <h2>New Rental Inquiry</h2>
          <p><strong>Car:</strong> ${car.year} ${car.make} ${car.model}</p>
          <p><strong>Client Name:</strong> ${clientName}</p>
          <p><strong>Email:</strong> ${clientEmail}</p>
          <p><strong>Phone:</strong> ${clientPhone}</p>
          <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email error:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    } else if (car.ownerEmail && !transporter) {
      console.warn('Email not sent: SMTP credentials not configured');
    }

    res.status(201).json({ 
      message: 'Rental inquiry submitted successfully',
      rentalRequest 
    });
  } catch (error) {
    res.status(400).json({ message: 'Error submitting inquiry', error: error.message });
  }
});

// Get all rental requests (public endpoint - admin can also use /api/admin/rental-requests)
router.get('/requests', async (req, res) => {
  try {
    const requests = await RentalRequest.find({ requestType: 'rent' })
      .populate('carId')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

