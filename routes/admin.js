const express = require('express');
const RentalRequest = require('../models/RentalRequest');
const Car = require('../models/Car');
const SiteSettings = require('../models/SiteSettings');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
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

const ALLOWED_REQUEST_TYPES = ['rent', 'sale'];
const ALLOWED_STATUSES = ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'];

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

async function updateRequestStatusById(id, status, force = false) {
  if (!ALLOWED_STATUSES.includes(status)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const request = await RentalRequest.findById(id).populate('carId');
  if (!request) {
    const error = new Error('Request not found');
    error.statusCode = 404;
    throw error;
  }

  // Check for overlapping accepted requests if trying to accept a rental request
  if (status === 'accepted' && !force && request.requestType === 'rent' && request.startDate && request.endDate) {
    const carId = typeof request.carId === 'object' ? request.carId._id : request.carId;
    
    // Normalize dates to start of day for comparison
    const requestStart = new Date(request.startDate);
    requestStart.setHours(0, 0, 0, 0);
    const requestEnd = new Date(request.endDate);
    requestEnd.setHours(23, 59, 59, 999);
    
    // Find other accepted requests for the same car with overlapping dates
    // Two date ranges overlap if: start1 <= end2 AND start2 <= end1
    const overlappingRequests = await RentalRequest.find({
      _id: { $ne: id },
      carId: carId,
      status: 'accepted',
      requestType: 'rent',
      startDate: { $exists: true },
      endDate: { $exists: true }
    }).populate('carId');

    // Filter for actual overlaps
    const actualOverlaps = overlappingRequests.filter(otherReq => {
      if (!otherReq.startDate || !otherReq.endDate) return false;
      const otherStart = new Date(otherReq.startDate);
      otherStart.setHours(0, 0, 0, 0);
      const otherEnd = new Date(otherReq.endDate);
      otherEnd.setHours(23, 59, 59, 999);
      
      // Check if dates overlap: start1 <= end2 AND start2 <= end1
      return requestStart <= otherEnd && otherStart <= requestEnd;
    });

    if (actualOverlaps.length > 0) {
      const error = new Error('Overlapping accepted requests detected');
      error.statusCode = 409; // Conflict
      error.conflictingRequests = actualOverlaps;
      throw error;
    }
  }

  // Update the status
  request.status = status;
  await request.save();

  // If status is accepted and it's a rental request, generate contract and send email
  if (status === 'accepted' && request.requestType === 'rent' && transporter) {
    try {
      await sendAcceptedRentalEmail(request);
    } catch (emailError) {
      console.error('Error sending acceptance email:', emailError);
      // Don't fail the status update if email fails
    }
  }

  return request;
}

// Send email with contract and photos when rental is accepted
async function sendAcceptedRentalEmail(request) {
  const car = await Car.findById(request.carId);
  if (!car) return;

  const carName = [car.year, car.brand || car.make, car.model].filter(Boolean).join(' ');
  const startDate = new Date(request.startDate).toLocaleDateString();
  const endDate = new Date(request.endDate).toLocaleDateString();
  const days = Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate price: use customPrice if set, otherwise calculate from daily rate
  let basePrice = 0;
  if (request.customPrice !== null && request.customPrice !== undefined) {
    basePrice = request.customPrice;
  } else if (car.dailyRate) {
    basePrice = car.dailyRate * days;
  }
  
  // Apply discount if set
  const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
  const totalPrice = basePrice - discountAmount;

  // Get contract terms from site settings
  const siteSettings = await SiteSettings.getSettings();
  const contractTerms = siteSettings.contractTerms || '';
  // For email, use empty baseUrl as photos are attached separately
  const baseUrl = '';

  // Generate contract HTML (same as PDF endpoint)
  const contractHtml = generateContractHTML(request, car, carName, startDate, endDate, days, totalPrice, contractTerms, baseUrl);

  // Prepare email attachments
  const attachments = [];

  // Add contract as PDF attachment (HTML will be converted by email client or we can use a PDF library)
  attachments.push({
    filename: `rental-contract-${request._id}.html`,
    content: contractHtml,
    contentType: 'text/html'
  });

  // Add photo attachments if they exist
  if (request.photos && request.photos.length > 0) {
    for (const photoUrl of request.photos) {
      const photoPath = path.join(__dirname, '../public', photoUrl);
      if (fs.existsSync(photoPath)) {
        attachments.push({
          filename: path.basename(photoPath),
          path: photoPath
        });
      }
    }
  }

  const mailOptions = {
    from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
    to: request.clientEmail,
    cc: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    subject: `Rental Confirmation - ${carName} - Contract #${request._id}`,
    html: `
      <h2>Rental Request Accepted</h2>
      <p>Dear ${request.clientName},</p>
      <p>Your rental request for <strong>${carName}</strong> has been accepted!</p>
      <h3>Rental Details:</h3>
      <ul>
        <li><strong>Vehicle:</strong> ${carName}</li>
        <li><strong>Rental Period:</strong> ${startDate} to ${endDate} (${days} days)</li>
        <li><strong>Total Price:</strong> $${totalPrice.toLocaleString()}</li>
      </ul>
      <p>Please find attached:</p>
      <ul>
        <li>Your rental contract (ready to sign)</li>
        ${request.photos && request.photos.length > 0 ? `<li>${request.photos.length} damage photo(s) for your records</li>` : ''}
      </ul>
      <p>Please review the contract and sign it when you pick up the vehicle.</p>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br>Sarasota Automotive</p>
    `,
    attachments: attachments
  };

  await transporter.sendMail(mailOptions);
}

// Generate contract HTML
function generateContractHTML(request, car, carName, startDate, endDate, days, totalPrice, contractTerms = '', baseUrl = '') {
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'Price not set';
    const number = Number(value);
    if (Number.isNaN(number)) return value;
    return `$${number.toLocaleString()}`;
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  };

  // Format contract terms (convert line breaks to paragraphs)
  const formatContractTerms = (terms) => {
    if (!terms) return '';
    // Split by double newlines for paragraphs, single newlines for line breaks
    const paragraphs = terms.split(/\n\n+/).filter(p => p.trim());
    return paragraphs.map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  };

  // Generate photos section HTML
  const photosHtml = request.photos && request.photos.length > 0
    ? `<div class="contract-section">
        <h2>Damage Photos (Pre-Rental Condition)</h2>
        <div class="contract-photos-grid">
          ${request.photos.map((photo, index) => {
            // Convert relative URLs to absolute if baseUrl is provided
            const photoUrl = photo.startsWith('http') ? photo : (baseUrl + photo);
            return `<div class="contract-photo-item">
              <img src="${photoUrl}" alt="Damage photo ${index + 1}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px;">
              <div style="text-align: center; font-size: 12px; color: #666;">Photo ${index + 1}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rental Contract - ${request._id}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #333; border-bottom: 3px solid #1db0c9; padding-bottom: 10px; }
        .contract-section { margin: 30px 0; }
        .contract-section h2 { color: #1db0c9; border-bottom: 2px solid #1db0c9; padding-bottom: 5px; }
        .contract-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .info-label { font-weight: bold; color: #666; }
        .info-value { margin-top: 5px; color: #333; }
        .signature-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .signature-box { border-top: 2px solid #333; padding-top: 10px; text-align: center; }
        .notes-section { margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #1db0c9; }
        .notes-section h3 { margin-top: 0; color: #1db0c9; }
        .contract-photos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .contract-photo-item { text-align: center; }
        .contract-photo-item img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <h1>VEHICLE RENTAL AGREEMENT</h1>
    <div class="contract-section">
        <h2>Company Information</h2>
        <div class="contract-info">
            <div class="info-item">
                <div class="info-label">Company Name</div>
                <div class="info-value"><strong>Sarasota Automotive</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">5671 McIntosh Rd<br>Sarasota, FL 34233</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">941-780-1333</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">QualityCarsFlorida@gmail.com</div>
            </div>
        </div>
    </div>
    <div class="contract-section">
        <h2>Rental Information</h2>
        <div class="contract-info">
            <div class="info-item">
                <div class="info-label">Contract Number</div>
                <div class="info-value">${request._id}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${new Date().toLocaleDateString()}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Vehicle</div>
                <div class="info-value">${escapeHtml(carName)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Rental Period</div>
                <div class="info-value">${startDate} to ${endDate} (${days} days)</div>
            </div>
            <div class="info-item">
                <div class="info-label">Daily Rate</div>
                <div class="info-value">${car.dailyRate ? formatCurrency(car.dailyRate) : 'N/A'}</div>
            </div>
            ${request.fuelLevel ? `
            <div class="info-item">
                <div class="info-label">Fuel Level (at rental start)</div>
                <div class="info-value"><strong>${escapeHtml(request.fuelLevel)}</strong></div>
            </div>` : ''}
            ${request.customPrice !== null && request.customPrice !== undefined ? `
            <div class="info-item">
                <div class="info-label">Custom Price</div>
                <div class="info-value">${formatCurrency(request.customPrice)}</div>
            </div>` : ''}
            ${request.discountPercent && request.discountPercent > 0 ? `
            <div class="info-item">
                <div class="info-label">Discount</div>
                <div class="info-value">${request.discountPercent}%</div>
            </div>` : ''}
            <div class="info-item">
                <div class="info-label">Total Amount</div>
                <div class="info-value"><strong>${formatCurrency(totalPrice)}</strong></div>
            </div>
        </div>
    </div>
    <div class="contract-section">
        <h2>Renter Information</h2>
        <div class="contract-info">
            <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${escapeHtml(request.clientName)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${escapeHtml(request.clientEmail)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${escapeHtml(request.clientPhone)}</div>
            </div>
        </div>
    </div>
    ${request.notes ? `<div class="notes-section"><h3>Additional Notes</h3><p>${escapeHtml(request.notes).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${photosHtml}
    <div class="contract-section">
        <h2>Terms and Conditions</h2>
        ${contractTerms ? formatContractTerms(contractTerms) : '<p>By signing below, the renter agrees to return the vehicle in the same condition as received, except for normal wear and tear. Any damages beyond normal wear will be charged to the renter.</p><p>The renter is responsible for all traffic violations, tolls, and parking fees during the rental period.</p><p>Fuel must be returned at the same level as received, or a refueling fee will apply.</p>'}
    </div>
    <div class="signature-section">
        <div class="signature-box">
            <div style="height: 60px;"></div>
            <div>Renter Signature</div>
            <div style="margin-top: 5px; font-size: 12px;">${escapeHtml(request.clientName)}</div>
        </div>
        <div class="signature-box">
            <div style="height: 60px;"></div>
            <div>Company Representative</div>
            <div style="margin-top: 5px; font-size: 12px;">Sarasota Automotive</div>
            <div style="margin-top: 5px; font-size: 11px; color: #666;">5671 McIntosh Rd, Sarasota, FL 34233</div>
        </div>
    </div>
</body>
</html>
  `;
}

// Generate sales contract HTML
function generateSalesContractHTML(request, car, carName, totalPrice, contractTerms = '', baseUrl = '') {
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'Price not set';
    const number = Number(value);
    if (Number.isNaN(number)) return value;
    return `$${number.toLocaleString()}`;
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  };

  // Format contract terms (convert line breaks to paragraphs)
  const formatContractTerms = (terms) => {
    if (!terms) return '';
    const paragraphs = terms.split(/\n\n+/).filter(p => p.trim());
    return paragraphs.map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  };

  // Generate photos section HTML
  const photosHtml = request.photos && request.photos.length > 0
    ? `<div class="contract-section">
        <h2>Vehicle Photos</h2>
        <div class="contract-photos-grid">
          ${request.photos.map((photo, index) => {
            const photoUrl = photo.startsWith('http') ? photo : (baseUrl + photo);
            return `<div class="contract-photo-item">
              <img src="${photoUrl}" alt="Vehicle photo ${index + 1}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px;">
              <div style="text-align: center; font-size: 12px; color: #666;">Photo ${index + 1}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sales Contract - ${request._id}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #333; border-bottom: 3px solid #1db0c9; padding-bottom: 10px; }
        .contract-section { margin: 30px 0; }
        .contract-section h2 { color: #1db0c9; border-bottom: 2px solid #1db0c9; padding-bottom: 5px; }
        .contract-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .info-label { font-weight: bold; color: #666; }
        .info-value { margin-top: 5px; color: #333; }
        .signature-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .signature-box { border-top: 2px solid #333; padding-top: 10px; text-align: center; }
        .notes-section { margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #1db0c9; }
        .notes-section h3 { margin-top: 0; color: #1db0c9; }
        .contract-photos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .contract-photo-item { text-align: center; }
        .contract-photo-item img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <h1>VEHICLE SALE AGREEMENT</h1>
    <div class="contract-section">
        <h2>Company Information</h2>
        <div class="contract-info">
            <div class="info-item">
                <div class="info-label">Company Name</div>
                <div class="info-value"><strong>Sarasota Automotive</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">5671 McIntosh Rd<br>Sarasota, FL 34233</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">941-780-1333</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">QualityCarsFlorida@gmail.com</div>
            </div>
        </div>
    </div>
    <div class="contract-section">
        <h2>Sale Information</h2>
        <div class="contract-info">
            <div class="info-item">
                <div class="info-label">Contract Number</div>
                <div class="info-value">${request._id}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${new Date().toLocaleDateString()}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Vehicle</div>
                <div class="info-value">${escapeHtml(carName)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Original Asking Price</div>
                <div class="info-value">${car.price ? formatCurrency(car.price) : 'N/A'}</div>
            </div>
            ${request.customPrice !== null && request.customPrice !== undefined ? `
            <div class="info-item">
                <div class="info-label">Agreed Price</div>
                <div class="info-value">${formatCurrency(request.customPrice)}</div>
            </div>` : ''}
            ${request.discountPercent && request.discountPercent > 0 ? `
            <div class="info-item">
                <div class="info-label">Discount</div>
                <div class="info-value">${request.discountPercent}%</div>
            </div>` : ''}
            <div class="info-item">
                <div class="info-label">Final Sale Price</div>
                <div class="info-value"><strong>${formatCurrency(totalPrice)}</strong></div>
            </div>
        </div>
    </div>
    <div class="contract-section">
        <h2>Buyer Information</h2>
        <div class="contract-info">
            <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${escapeHtml(request.clientName)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${escapeHtml(request.clientEmail)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${escapeHtml(request.clientPhone)}</div>
            </div>
        </div>
    </div>
    ${request.notes ? `<div class="notes-section"><h3>Additional Notes</h3><p>${escapeHtml(request.notes).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${photosHtml}
    <div class="contract-section">
        <h2>Terms and Conditions</h2>
        ${contractTerms ? formatContractTerms(contractTerms) : '<p>By signing below, the buyer agrees to purchase the vehicle as described in this contract for the agreed-upon price.</p><p>The vehicle is sold "as is" with no warranties expressed or implied, except as required by law.</p><p>The buyer is responsible for all transfer fees, registration, and title fees.</p><p>Full payment must be received before the vehicle title is transferred.</p>'}
    </div>
    <div class="signature-section">
        <div class="signature-box">
            <div style="height: 60px;"></div>
            <div>Buyer Signature</div>
            <div style="margin-top: 5px; font-size: 12px;">${escapeHtml(request.clientName)}</div>
        </div>
        <div class="signature-box">
            <div style="height: 60px;"></div>
            <div>Seller Signature</div>
            <div style="margin-top: 5px; font-size: 12px;">Sarasota Automotive</div>
            <div style="margin-top: 5px; font-size: 11px; color: #666;">5671 McIntosh Rd, Sarasota, FL 34233</div>
        </div>
    </div>
</body>
</html>
  `;
}

// Get single request by ID
router.get('/requests/:id', async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id).populate('carId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Check for overlapping accepted requests
router.get('/requests/:id/check-overlap', async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id).populate('carId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.requestType !== 'rent' || !request.startDate || !request.endDate) {
      return res.json({ hasOverlap: false, conflictingRequests: [] });
    }

    const carId = typeof request.carId === 'object' ? request.carId._id : request.carId;
    
    // Normalize dates to start of day for comparison
    const requestStart = new Date(request.startDate);
    requestStart.setHours(0, 0, 0, 0);
    const requestEnd = new Date(request.endDate);
    requestEnd.setHours(23, 59, 59, 999);
    
    // Find other accepted requests for the same car
    const allAcceptedRequests = await RentalRequest.find({
      _id: { $ne: req.params.id },
      carId: carId,
      status: 'accepted',
      requestType: 'rent',
      startDate: { $exists: true },
      endDate: { $exists: true }
    }).populate('carId');

    // Filter for actual overlaps
    const overlappingRequests = allAcceptedRequests.filter(otherReq => {
      if (!otherReq.startDate || !otherReq.endDate) return false;
      const otherStart = new Date(otherReq.startDate);
      otherStart.setHours(0, 0, 0, 0);
      const otherEnd = new Date(otherReq.endDate);
      otherEnd.setHours(23, 59, 59, 999);
      
      // Check if dates overlap: start1 <= end2 AND start2 <= end1
      return requestStart <= otherEnd && otherStart <= requestEnd;
    });

    res.json({
      hasOverlap: overlappingRequests.length > 0,
      conflictingRequests: overlappingRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update request status
router.patch('/requests/:id/status', async (req, res) => {
  try {
    const { status, force } = req.body || {};
    const updated = await updateRequestStatusById(req.params.id, status, force === true);
    res.json(updated);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const response = { message: error.message || 'Server error' };
    if (error.conflictingRequests) {
      response.conflictingRequests = error.conflictingRequests;
    }
    res.status(statusCode).json(response);
  }
});

// Backwards compatibility: rental request status endpoint
router.patch('/rental-requests/:id/status', async (req, res) => {
  try {
    const { status, force } = req.body || {};
    const updated = await updateRequestStatusById(req.params.id, status, force === true);
    res.json(updated);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const response = { message: error.message || 'Server error' };
    if (error.conflictingRequests) {
      response.conflictingRequests = error.conflictingRequests;
    }
    res.status(statusCode).json(response);
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

// Update request notes
router.patch('/requests/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body || {};
    const request = await RentalRequest.findByIdAndUpdate(
      req.params.id,
      { notes: notes || '' },
      { new: true }
    ).populate('carId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update request price/discount
router.patch('/requests/:id/price', async (req, res) => {
  try {
    const { customPrice, discountPercent } = req.body || {};
    const updateData = {};
    
    if (customPrice !== undefined) {
      // If customPrice is null, empty string, or 0, remove custom price
      if (customPrice === null || customPrice === '' || customPrice === 0) {
        updateData.customPrice = null;
      } else {
        const price = parseFloat(customPrice);
        if (isNaN(price) || price < 0) {
          return res.status(400).json({ message: 'Invalid custom price' });
        }
        updateData.customPrice = price;
      }
    }
    
    if (discountPercent !== undefined) {
      const discount = parseFloat(discountPercent);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({ message: 'Invalid discount percentage (must be 0-100)' });
      }
      updateData.discountPercent = discount;
    }

    const request = await RentalRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('carId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update request fuel level
router.patch('/requests/:id/fuel-level', async (req, res) => {
  try {
    const { fuelLevel } = req.body || {};
    
    const validFuelLevels = ['', 'Empty', '1/4', '1/2', '3/4', 'Full'];
    if (fuelLevel !== undefined && !validFuelLevels.includes(fuelLevel)) {
      return res.status(400).json({ message: 'Invalid fuel level' });
    }

    const request = await RentalRequest.findByIdAndUpdate(
      req.params.id,
      { fuelLevel: fuelLevel || '' },
      { new: true }
    ).populate('carId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Add photos to request (append to existing)
router.patch('/requests/:id/photos', async (req, res) => {
  try {
    const { photos } = req.body || {};
    if (!Array.isArray(photos)) {
      return res.status(400).json({ message: 'Photos must be an array' });
    }

    const request = await RentalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Append new photos to existing ones (avoid duplicates)
    const existingPhotos = request.photos || [];
    const newPhotos = photos.filter(photo => photo && !existingPhotos.includes(photo));
    request.photos = [...existingPhotos, ...newPhotos];
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete photo from request
router.delete('/requests/:id/photos/:photoIndex', async (req, res) => {
  try {
    const photoIndex = parseInt(req.params.photoIndex, 10);
    const request = await RentalRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!request.photos || photoIndex < 0 || photoIndex >= request.photos.length) {
      return res.status(400).json({ message: 'Invalid photo index' });
    }

    request.photos.splice(photoIndex, 1);
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Generate PDF contract for sale
router.get('/requests/:id/sales-contract/pdf', async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id).populate('carId');
    if (!request || request.requestType !== 'sale') {
      return res.status(404).json({ message: 'Sale request not found' });
    }

    const car = request.carId || {};
    const carName = [car.year, car.brand || car.make, car.model].filter(Boolean).join(' ');
    
    // Calculate price: use customPrice if set, otherwise use car price
    let basePrice = 0;
    if (request.customPrice !== null && request.customPrice !== undefined) {
      basePrice = request.customPrice;
    } else if (car.price) {
      basePrice = car.price;
    }
    
    // Apply discount if set
    const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
    const totalPrice = basePrice - discountAmount;
    
    // Mark contract as generated
    request.contractGenerated = true;
    request.contractGeneratedAt = new Date();
    await request.save();

    // Get contract terms from site settings
    const siteSettings = await SiteSettings.getSettings();
    const contractTerms = siteSettings.salesContractTerms || '';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Generate HTML contract using shared function
    const contractHtml = generateSalesContractHTML(request, car, carName, totalPrice, contractTerms, baseUrl);

    // Return HTML with proper headers for download/printing
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="sales-contract-${request._id}.html"`);
    res.send(contractHtml);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Generate PDF contract for rental
router.get('/requests/:id/contract/pdf', async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id).populate('carId');
    if (!request || request.requestType !== 'rent') {
      return res.status(404).json({ message: 'Rental request not found' });
    }

    // For now, return HTML contract that can be printed as PDF
    // In production, you would use a library like pdfkit or puppeteer
    const car = request.carId || {};
    const carName = [car.year, car.brand || car.make, car.model].filter(Boolean).join(' ');
    const startDate = new Date(request.startDate).toLocaleDateString();
    const endDate = new Date(request.endDate).toLocaleDateString();
    const days = Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate price: use customPrice if set, otherwise calculate from daily rate
    let basePrice = 0;
    if (request.customPrice !== null && request.customPrice !== undefined) {
      basePrice = request.customPrice;
    } else if (car.dailyRate) {
      basePrice = car.dailyRate * days;
    }
    
    // Apply discount if set
    const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
    const totalPrice = basePrice - discountAmount;
    
    // Mark contract as generated
    request.contractGenerated = true;
    request.contractGeneratedAt = new Date();
    await request.save();

    // Get contract terms from site settings
    const siteSettings = await SiteSettings.getSettings();
    const contractTerms = siteSettings.contractTerms || '';
    // Use request protocol and host for absolute URLs in PDF contract
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Generate HTML contract using shared function
    const contractHtml = generateContractHTML(request, car, carName, startDate, endDate, days, totalPrice, contractTerms, baseUrl);

    // Return HTML with proper headers for download/printing
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="rental-contract-${request._id}.html"`);
    res.send(contractHtml);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});


module.exports = router;


