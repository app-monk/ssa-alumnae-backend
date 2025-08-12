const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const alumniRoutes = require('./routes/alumni');
const batchYearRoutes = require('./routes/batchYears');
const eventRoutes = require('./routes/events');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve static files from uploads folder
app.use('/uploads', express.static('uploads')); 

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/batch-years', batchYearRoutes);
app.use('/api/events', eventRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'SSA Alumnae API is running!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});