const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Use environment variable for port or default to 5000
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from Public folder
app.use(express.static(path.join(__dirname, 'Public')));

// MongoDB Connection - Use your actual connection string from .env
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://SRIC:SRIC221205@cluster.fmt0jf7.mongodb.net/sric_admissions?retryWrites=true&w=majority&appName=Cluster';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB Atlas successfully'))
.catch(err => {
  console.log('❌ MongoDB connection error:', err.message);
  console.log('💡 Please check your MongoDB Atlas connection string in the .env file');
  console.log('💡 Make sure your IP is whitelisted in MongoDB Atlas');
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/receipts/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'), false);
    }
  }
});

// Define Admission Schema
const admissionSchema = new mongoose.Schema({
  // Student Information
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  motherTongue: { type: String, required: true },
  caste: { type: String, required: true },
  religion: { type: String, required: true },
  previousClass: { type: String, required: true },
  admissionClass: { type: String, required: true },
  previousSchool: { type: String, required: true },
  admissionDate: { type: Date, required: true },
  
  // Parent/Guardian Information
  fatherName: { type: String, required: true },
  motherName: { type: String, required: true },
  fatherContact: { type: String, required: true },
  motherContact: { type: String },
  email: { type: String, required: true },
  occupation: { type: String, required: true },
  motherOccupation: { type: String },
  
  // Address Information
  address: { type: String, required: true },
  
  // Declaration
  declaration: { type: Boolean, required: true },
  
  // Status field
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  
  // Timestamps
  submittedAt: { type: Date, default: Date.now }
});

const Admission = mongoose.model('Application', admissionSchema, 'applications');

// Define Contact Schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  subject: { type: String },
  message: { type: String, required: true },
  
  // Status field
  status: { 
    type: String, 
    enum: ['unread', 'read', 'replied'], 
    default: 'unread' 
  },
  
  submittedAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema, 'contacts');

// Define Fee Payment Schema
const feePaymentSchema = new mongoose.Schema({
  // Student Information
  studentName: { type: String, required: true },
  fatherName: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  className: { type: String, required: true },
  
  // Payment Information
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String, required: true },
  
  // Receipt Information
  receiptNumber: { type: String, required: true },
  receiptDate: { type: Date, required: true },
  
  // File Information
  receiptFile: {
    originalName: { type: String },
    storageName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    path: { type: String }
  },
  
  // Status field
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  
  // Timestamps
  submittedAt: { type: Date, default: Date.now }
});

const FeePayment = mongoose.model('FeePayment', feePaymentSchema, 'feePayments');

// API Routes
app.post('/api/admission', async (req, res) => {
  try {
    console.log('Received form data:', req.body);
    
    const newAdmission = new Admission(req.body);
    const savedAdmission = await newAdmission.save();
    
    console.log('Data saved to MongoDB:', savedAdmission);
    
    res.status(201).json({
      success: true,
      message: 'Admission form submitted successfully!',
      data: savedAdmission
    });
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    res.status(400).json({
      success: false,
      message: 'Error submitting form',
      error: error.message
    });
  }
});

// API Route for Contact Form
app.post('/api/contact', async (req, res) => {
  try {
    console.log('Received contact form data:', req.body);
    
    const newContact = new Contact(req.body);
    const savedContact = await newContact.save();
    
    console.log('Contact data saved to MongoDB:', savedContact);
    
    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully!',
      data: savedContact
    });
  } catch (error) {
    console.error('Error saving contact to MongoDB:', error);
    res.status(400).json({
      success: false,
      message: 'Error submitting contact form',
      error: error.message
    });
  }
});

// API Route for Fee Payment Submission with file upload
app.post('/api/fee-payment', upload.single('receipt'), async (req, res) => {
  try {
    console.log('Received fee payment data:', req.body);
    
    // Parse the payment data
    const paymentData = JSON.parse(req.body.paymentData);
    
    // Add file information if uploaded
    if (req.file) {
      paymentData.receiptFile = {
        originalName: req.file.originalname,
        storageName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };
    }
    
    const newFeePayment = new FeePayment(paymentData);
    const savedFeePayment = await newFeePayment.save();
    
    console.log('Fee payment data saved to MongoDB:', savedFeePayment);
    
    res.status(201).json({
      success: true,
      message: 'Fee payment submitted successfully!',
      data: savedFeePayment
    });
  } catch (error) {
    console.error('Error saving fee payment to MongoDB:', error);
    res.status(400).json({
      success: false,
      message: 'Error submitting fee payment',
      error: error.message
    });
  }
});

// API to update admission status
app.put('/api/admissions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updatedAdmission = await Admission.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedAdmission) {
      return res.status(404).json({
        success: false,
        message: 'Admission not found'
      });
    }
    
    res.json({
      success: true,
      message: `Admission ${status} successfully`,
      data: updatedAdmission
    });
  } catch (error) {
    console.error('Error updating admission status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admission status',
      error: error.message
    });
  }
});

// API to update contact status
app.put('/api/contacts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['unread', 'read', 'replied'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: `Contact marked as ${status}`,
      data: updatedContact
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact status',
      error: error.message
    });
  }
});

// API to update fee payment status
app.put('/api/fee-payments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'verified', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updatedFeePayment = await FeePayment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedFeePayment) {
      return res.status(404).json({
        success: false,
        message: 'Fee payment not found'
      });
    }
    
    res.json({
      success: true,
      message: `Fee payment ${status}`,
      data: updatedFeePayment
    });
  } catch (error) {
    console.error('Error updating fee payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating fee payment status',
      error: error.message
    });
  }
});

// API to delete contact
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedContact = await Contact.findByIdAndDelete(id);
    
    if (!deletedContact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
});

// API Routes for Admin Dashboard
app.get('/api/admissions', async (req, res) => {
  try {
    const admissions = await Admission.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      count: admissions.length,
      data: admissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admissions',
      error: error.message
    });
  }
});

app.get('/api/fee-payments', async (req, res) => {
  try {
    const feePayments = await FeePayment.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      count: feePayments.length,
      data: feePayments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching fee payments',
      error: error.message
    });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
});

// Admin authentication route
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  // Simple authentication (use hashed passwords + DB in production)
  if (username === '221205' && password === 'Sitaram@2002') {
    res.json({
      success: true,
      token: 'adminToken123', // static token for now
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// Middleware to check admin authentication
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization || req.query.token;
  
  if (token === 'adminToken123') {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }
};

// Protected admin API routes
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const admissions = await Admission.find().sort({ submittedAt: -1 });
    const feePayments = await FeePayment.find().sort({ submittedAt: -1 });
    const contacts = await Contact.find().sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      data: {
        admissions: admissions.length,
        feePayments: feePayments.length,
        contacts: contacts.length,
        recentAdmissions: admissions.slice(0, 5),
        recentPayments: feePayments.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// Route to check if server is running
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    success: true, 
    message: 'Server is running!',
    database: dbStatus,
  });
});

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Route to serve admin login page
app.get('/admin-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'admin-login.html'));
});

// FIXED: Route to serve admin dashboard - Only serve the file, no redirect logic
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'admin.html'));
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Function to find available port
const findAvailablePort = (desiredPort) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(desiredPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        findAvailablePort(desiredPort + 1).then(resolve);
      } else {
        reject(err);
      }
    });
  });
};

// Start server on available port
findAvailablePort(PORT).then(actualPort => {
  app.listen(actualPort, () => {
    console.log(`🚀 Server running on http://localhost:${actualPort}`);
    console.log(`📋 API Health Check: http://localhost:${actualPort}/api/health`);
    console.log(`📝 Admission Form: http://localhost:${actualPort}/admission_form.html`);
    console.log(`🔐 Admin Login: http://localhost:${actualPort}/admin-login.html`);
    console.log(`🏠 Home Page: http://localhost:${actualPort}`);
    
    // Show MongoDB connection status
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB Atlas is connected and ready');
    } else {
      console.log('❌ MongoDB is not connected');
    }
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
});

// Logout route
app.post('/api/admin/logout', (req, res) => {
    // In a real application, you would blacklist the token
    // For this simple implementation, we just acknowledge the logout
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});
