const express = require('express');
const Contact = require('../models/Contact');
const { getAdminEmail, sendMail } = require('../services/email');

const router = express.Router();

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function sendContactEmail(contact) {
  try {
    const toEmail = await getAdminEmail();
    if (!toEmail) {
      console.warn('Contact email skipped: no admin email configured');
      return;
    }

    await sendMail({
      to: toEmail,
      subject: `Contact Form: ${contact.subject}`,
      replyTo: contact.email,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${contact.name}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Subject:</strong> ${contact.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${contact.message.replace(/\n/g, '<br>')}</p>
        <p><em>Submitted at ${new Date(contact.createdAt).toLocaleString()}</em></p>
      `
    });
  } catch (error) {
    console.error('Failed to send contact email:', error);
  }
}

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message
    } = req.body || {};

    const contactData = {
      name: normalizeString(name),
      email: normalizeString(email),
      subject: normalizeString(subject),
      message: normalizeString(message)
    };

    // Validate required fields
    if (!contactData.name || !contactData.email || !contactData.subject || !contactData.message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    // Create contact submission
    const contact = new Contact(contactData);
    await contact.save();

    // Send email notification to admin (non-blocking)
    sendContactEmail(contact).catch(err => {
      console.error('Error sending contact email:', err);
    });

    res.status(201).json({
      message: 'Contact form submitted successfully',
      contact
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Error submitting contact form', error: error.message });
  }
});

// Get all contact submissions (for admin dashboard)
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Error fetching contacts', error: error.message });
  }
});

// Get single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ message: 'Error fetching contact', error: error.message });
  }
});

// Update contact status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ message: 'Error updating contact status', error: error.message });
  }
});

module.exports = router;

