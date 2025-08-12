const Alumna = require('../models/alumna');
const BatchYear = require('../models/batchYear');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Add this helper function at the top
const getFullImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Construct full URL
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${imagePath}`;
};


// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Public
const getAlumni = async (req, res) => {
  try {
    const alumni = await Alumna.find()
      .populate('batchYear')
      .sort({ 'batchYear.year': -1, lastName: 1 });

    // Convert relative paths to full URLs for all alumni
    const alumniWithFullUrls = alumni.map(alumna => ({
      ...alumna.toObject(),
      studentPicture: getFullImageUrl(req, alumna.studentPicture),
      currentPicture: getFullImageUrl(req, alumna.currentPicture)
    }));

    res.json({
      success: true,
      count: alumni.length,
      data: alumniWithFullUrls
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get single alumna
// @route   GET /api/alumni/:id
// @access  Public
const getAlumna = async (req, res) => {
  try {
    const alumna = await Alumna.findById(req.params.id).populate('batchYear');
    
    if (!alumna) {
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
      });
    }

    // Convert relative paths to full URLs
    const alumnaWithFullUrls = {
      ...alumna.toObject(),
      studentPicture: getFullImageUrl(req, alumna.studentPicture),
      currentPicture: getFullImageUrl(req, alumna.currentPicture)
    };

    res.json({
      success: true,
      data: alumnaWithFullUrls
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Create new alumna
// @route   POST /api/alumni
// @access  Private/Admin
const createAlumna = async (req, res) => {
  try {
    //Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to create events.' 
      });
    }
    const alumnaData = { ...req.body };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.studentPicture) {
        alumnaData.studentPicture = `/uploads/${req.files.studentPicture[0].filename}`;
      }
      if (req.files.currentPicture) {
        alumnaData.currentPicture = `/uploads/${req.files.currentPicture[0].filename}`;
      }
    }
    
    const alumna = new Alumna(alumnaData);
    const savedAlumna = await alumna.save();
    
    // Populate batchYear for response
    const populatedAlumna = await Alumna.findById(savedAlumna._id).populate('batchYear');
    
    res.status(201).json({
      success: true,
      data: populatedAlumna
    });
  } catch (error) {
    // Clean up uploaded files if alumna creation fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get alumni grouped by batch year
// @route   GET /api/alumni/grouped
// @access  Public
const getAlumniGrouped = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const alumni = await Alumna.find(query)
      .populate('batchYear')
      .sort({ lastName: 1 });
    
    // Convert relative paths to full URLs
    const alumniWithFullUrls = alumni.map(alumna => ({
      ...alumna.toObject(),
      studentPicture: getFullImageUrl(req, alumna.studentPicture),
      currentPicture: getFullImageUrl(req, alumna.currentPicture)
    }));
    
    // Group alumni by batch year
    const grouped = alumniWithFullUrls.reduce((acc, alumna) => {
      const year = alumna.batchYear.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(alumna);
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};


// @desc    Get alumni by batch year
// @route   GET /api/alumni/batch/:batchYearId
// @access  Public
const getAlumniByBatchYear = async (req, res) => {
  try {
    const { batchYearId } = req.params;
    
    const alumni = await Alumna.find({ batchYear: batchYearId })
      .populate('batchYear')
      .sort({ lastName: 1, firstName: 1 });

    if (alumni.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No alumni found for this batch year'
      });
    }

    res.json({
      success: true,
      count: alumni.length,
      batchYear: alumni[0].batchYear,
      alumni
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};


// @desc    Get alumni by batch year value
// @route   GET /api/alumni/year/:year
// @access  Public
const getAlumniByYear = async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year format
    const yearNumber = parseInt(year);
    if (isNaN(yearNumber) || yearNumber < 1923 || yearNumber > new Date().getFullYear() + 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year format. Please provide a valid year (e.g., 1925)'
      });
    }
    
    // First find the BatchYear document with the matching year
    const batchYear = await BatchYear.findOne({ year: yearNumber });
    
    if (!batchYear) {
      return res.status(404).json({
        success: false,
        message: `No batch year found for ${year}`
      });
    }
    
    // Then find all alumni for that batch year
    const alumni = await Alumna.find({ batchYear: batchYear._id })
      .populate('batchYear')
      .sort({ lastName: 1, firstName: 1 });

    if (alumni.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No alumni found for year ${year}`
      });
    }

    res.json({
      success: true,
      year: yearNumber,
      count: alumni.length,
      batchYear: batchYear,
      alumni
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// *** ADDED: New function to search alumni by name ***
// @desc    Search alumni by name (first name, last name, or full name)
// @route   GET /api/alumni/search?q=searchTerm
// @access  Public
const searchAlumniByName = async (req, res) => {
  try {
    const { q } = req.query;
    
    // Validate search query
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required. Use ?q=searchTerm'
      });
    }
    
    const searchTerm = q.trim();
    
    // Minimum search length
    if (searchTerm.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }
    
    // Create case-insensitive regex for partial matching
    const searchRegex = new RegExp(searchTerm, 'i');
    
    // Search in multiple fields using $or operator
    const alumni = await Alumna.find({
      $or: [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { middleName: { $regex: searchRegex } },
        // Search for full name combinations
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: searchTerm,
              options: "i"
            }
          }
        },
        // Search for full name with middle name
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", { $ifNull: ["$middleName", ""] }, " ", "$lastName"] },
              regex: searchTerm,
              options: "i"
            }
          }
        }
      ]
    })
    .populate('batchYear')
    .sort({ lastName: 1, firstName: 1 })
    .limit(50); // Limit results to prevent overwhelming responses

    if (alumni.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No alumni found matching "${searchTerm}"`
      });
    }

    res.json({
      success: true,
      searchTerm: searchTerm,
      count: alumni.length,
      alumni
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// *** ADDED: Advanced search with multiple filters ***
// @desc    Advanced search alumni with multiple criteria
// @route   GET /api/alumni/advanced-search
// @access  Public
const advancedSearchAlumni = async (req, res) => {
  try {
    const { name, yearFrom, yearTo, email, contactNumber, prefix } = req.query;
    
    // Build query object
    const query = {};
    
    // Add name search if provided
    if (name && name.trim().length > 0) {
      const searchRegex = new RegExp(name.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { middleName: searchRegex }
      ];
    }

    // Add year range if provided
    if (yearFrom || yearTo) {
      const yearQuery = {};
      if (yearFrom) yearQuery.$gte = parseInt(yearFrom);
      if (yearTo) yearQuery.$lte = parseInt(yearTo);
      
      // Find batch years in range
      const batchYears = await BatchYear.find({ 
        year: yearQuery 
      }).select('_id');
      
      query.batchYear = { 
        $in: batchYears.map(by => by._id) 
      };
    }

    // Add email search if provided
    if (email) {
      query.email = new RegExp(email, 'i');
    }

    // Add contact number search if provided
    if (contactNumber) {
      query.contactNumber = new RegExp(contactNumber);
    }

    // Add prefix search if provided
    if (prefix) {
      query.prefix = new RegExp(prefix, 'i');
    }

    const alumni = await Alumna.find(query)
      .populate('batchYear')
      .sort({ lastName: 1, firstName: 1 })
      .limit(50);

    if (alumni.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No alumni found matching the search criteria'
      });
    }

    res.json({
      success: true,
      count: alumni.length,
      alumni
    });
    
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// *** END ADDED ***

// *** ADDED: New function to search alumni by year range ***
// @desc    Get alumni by year range
// @route   GET /api/alumni/years?from=1920&to=1930
// @access  Public
const getAlumniByYearRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Validate query parameters
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Both "from" and "to" year parameters are required (e.g., ?from=1920&to=1930)'
      });
    }
    
    const fromYear = parseInt(from);
    const toYear = parseInt(to);
    
    if (isNaN(fromYear) || isNaN(toYear)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year format. Please provide valid years'
      });
    }
    
    if (fromYear > toYear) {
      return res.status(400).json({
        success: false,
        message: 'From year cannot be greater than to year'
      });
    }
    
    // Find batch years within the range
    const batchYears = await BatchYear.find({ 
      year: { $gte: fromYear, $lte: toYear } 
    }).sort({ year: 1 });
    
    if (batchYears.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No batch years found between ${fromYear} and ${toYear}`
      });
    }
    
    // Get the ObjectIds of matching batch years
    const batchYearIds = batchYears.map(batch => batch._id);
    
    // Find all alumni for those batch years
    const alumni = await Alumna.find({ batchYear: { $in: batchYearIds } })
      .populate('batchYear')
      .sort({ 'batchYear.year': 1, lastName: 1, firstName: 1 });

    if (alumni.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No alumni found between years ${fromYear} and ${toYear}`
      });
    }

    // Group alumni by year for better organization
    const alumniByYear = alumni.reduce((acc, alumna) => {
      const year = alumna.batchYear.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(alumna);
      return acc;
    }, {});

    res.json({
      success: true,
      yearRange: { from: fromYear, to: toYear },
      totalCount: alumni.length,
      batchYears: batchYears,
      alumniByYear,
      alumni
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Update alumna
// @route   PUT /api/alumni/:id
// @access  Private/Admin
const updateAlumna = async (req, res) => {
  try {
    //Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to create events.' 
      });
    }

    // Get the old alumna data to potentially clean up old files
    const oldAlumna = await Alumna.findById(req.params.id);
    if (!oldAlumna) {
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
      });
    }

    const alumnaData = { ...req.body };
    
    // Handle file uploads
    if (req.files) {
      // Handle student picture
      if (req.files.studentPicture) {
        alumnaData.studentPicture = `/uploads/${req.files.studentPicture[0].filename}`;
        // Clean up old student picture
        if (oldAlumna.studentPicture) {
          const oldFilePath = path.join(__dirname, '..', oldAlumna.studentPicture);
          fs.unlink(oldFilePath, (err) => {
            if (err && err.code !== 'ENOENT') console.error('Error deleting old file:', err);
          });
        }
      }

      // Handle current picture
      if (req.files.currentPicture) {
        alumnaData.currentPicture = `/uploads/${req.files.currentPicture[0].filename}`;
        // Clean up old current picture
        if (oldAlumna.currentPicture) {
          const oldFilePath = path.join(__dirname, '..', oldAlumna.currentPicture);
          fs.unlink(oldFilePath, (err) => {
            if (err && err.code !== 'ENOENT') console.error('Error deleting old file:', err);
          });
        }
      }
    }

    const alumna = await Alumna.findByIdAndUpdate(
      req.params.id,
      alumnaData,
      { new: true, runValidators: true }
    ).populate('batchYear');

    res.json({
      success: true,
      data: alumna
    });
  } catch (error) {
    // Clean up any uploaded files if update fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Delete alumna
// @route   DELETE /api/alumni/:id
// @access  Private/Admin
const deleteAlumna = async (req, res) => {
  try {
    //Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to create events.' 
      });
    }
    
    const alumna = await Alumna.findById(req.params.id);

    if (!alumna) {
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
      });
    }

    // Clean up associated files
    const filesToDelete = [];
    if (alumna.studentPicture && alumna.studentPicture !== '') {
      filesToDelete.push(path.join(__dirname, '..', alumna.studentPicture));
    }
    if (alumna.currentPicture && alumna.currentPicture !== '') {
      filesToDelete.push(path.join(__dirname, '..', alumna.currentPicture));
    }

    await alumna.deleteOne();

    // Delete files after successful database deletion
    filesToDelete.forEach(filePath => {
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting file:', err);
        }
      });
    });

    res.json({
      success: true,
      message: 'Alumna removed'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Update alumna current profile picture only
// @route   PUT /api/alumni/:id/current-picture
// @access  Private
const updateCurrentPicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    // Get the old alumna data to potentially clean up old file
    const oldAlumna = await Alumna.findById(req.params.id);
    
    if (!oldAlumna) {
      // Clean up uploaded file if alumna not found
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
      });
    }

    const alumna = await Alumna.findByIdAndUpdate(
      req.params.id,
      { currentPicture: `/uploads/${req.file.filename}` },
      { new: true, runValidators: true }
    ).populate('batchYear');

    // Clean up old current picture file if it exists
    if (oldAlumna.currentPicture && oldAlumna.currentPicture !== '') {
      const oldFilePath = path.join(__dirname, '..', oldAlumna.currentPicture);
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting old file:', err);
        }
      });
    }

    res.json({
      success: true,
      data: alumna
    });
  } catch (error) {
    // Clean up uploaded file if update fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get alumni grouped by batch year with search
// @route   GET /api/alumni/grouped
// @access  Public
const getAlumniGroupedWithSearch = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const alumni = await Alumna.find(query)
      .populate('batchYear')
      .sort({ lastName: 1 });
    
    // Group alumni by batch year
    const grouped = alumni.reduce((acc, alumna) => {
      const year = alumna.batchYear.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(alumna);
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

module.exports = {
  getAlumni,
  getAlumna,
  getAlumniByBatchYear,
  getAlumniByYear,
  searchAlumniByName,
  advancedSearchAlumni,
  getAlumniByYearRange,
  createAlumna,
  updateAlumna,
  deleteAlumna,
  getAlumniGrouped,
  getAlumniGroupedWithSearch,
  updateCurrentPicture,
  // Multer middleware exports
  uploadMultiple: upload.fields([
    { name: 'studentPicture', maxCount: 1 },
    { name: 'currentPicture', maxCount: 1 }
  ]),
  uploadSingle: upload.single('currentPicture')
};