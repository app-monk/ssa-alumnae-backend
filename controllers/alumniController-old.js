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

// @desc    Create new alumna
// @route   POST /api/alumni
// @access  Private/Admin
const createAlumna = async (req, res) => {
  try {
    // Get form fields from req.body
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const batchYear = req.body.batchYear;
    
    // Validate required fields
    if (!firstName || !lastName || !batchYear) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, and batchYear are required fields'
      });
    }

    // Verify batchYear exists
    const batchYearExists = await BatchYear.findById(batchYear);
    if (!batchYearExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batchYear ID'
      });
    }

    const alumnaData = { 
      firstName,
      lastName,
      batchYear
    };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.studentPicture && req.files.studentPicture[0]) {
        alumnaData.studentPicture = `/uploads/${req.files.studentPicture[0].filename}`;
      }
      if (req.files.currentPicture && req.files.currentPicture[0]) {
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


// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Public
const getAlumni = async (req, res) => {
  try {
    const alumni = await Alumna.find()
      .populate('batchYear')
      .sort({ 'batchYear.year': -1, lastName: 1 });

    res.json({
      success: true,
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

    res.json({
      success: true,
      data: alumna
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
// const createAlumna = async (req, res) => {
//   try {
//     const alumna = new Alumna(req.body);
//     const savedAlumna = await alumna.save();
    
//     // Populate batchYear for response
//     const populatedAlumna = await Alumna.findById(savedAlumna._id).populate('batchYear');
    
//     res.status(201).json({
//       success: true,
//        populatedAlumna
//     });
//   } catch (error) {
//     res.status(400).json({ 
//       success: false,
//       message: error.message 
//     });
//   }
// };


// @desc    Get alumni grouped by batch year
// @route   GET /api/alumni/grouped
// @access  Public
const getAlumniGrouped = async (req, res) => {
  try {
    const alumni = await Alumna.find().populate('batchYear').sort({ lastName: 1 });
    
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

// // @desc    Update alumna
// // @route   PUT /api/alumni/:id
// // @access  Private/Admin
// const updateAlumna = async (req, res) => {
//   try {
//     const alumna = await Alumna.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     ).populate('batchYear');

//     if (!alumna) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'Alumna not found' 
//       });
//     }

//     res.json({
//       success: true,
//        alumna
//     });
//   } catch (error) {
//     res.status(400).json({ 
//       success: false,
//       message: error.message 
//     });
//   }
// };

// @desc    Update alumna
// @route   PUT /api/alumni/:id
// @access  Private/Admin
const updateAlumna = async (req, res) => {
  try {
    const alumnaData = { ...req.body };
    
    // Handle current picture upload
    if (req.file) {
      // Get the old alumna data to potentially clean up old file
      const oldAlumna = await Alumna.findById(req.params.id);
      
      alumnaData.currentPicture = `/uploads/${req.file.filename}`;
      
      // Clean up old current picture file if it exists
      if (oldAlumna && oldAlumna.currentPicture && oldAlumna.currentPicture !== '') {
        const oldFilePath = path.join(__dirname, '..', oldAlumna.currentPicture);
        fs.unlink(oldFilePath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Error deleting old file:', err);
          }
        });
      }
    }

    const alumna = await Alumna.findByIdAndUpdate(
      req.params.id,
      alumnaData,
      { new: true, runValidators: true }
    ).populate('batchYear');

    if (!alumna) {
      // Clean up uploaded file if alumna not found
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
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

// @desc    Delete alumna
// @route   DELETE /api/alumni/:id
// @access  Private/Admin
const deleteAlumna = async (req, res) => {
  try {
    const alumna = await Alumna.findById(req.params.id);

    if (!alumna) {
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
      });
    }

    await alumna.deleteOne();
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

// @desc    Update alumna profile picture
// @route   PUT /api/alumni/:id/current-profile-picture
// @access  Private
const currentProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    const alumna = await Alumna.findByIdAndUpdate(
      req.params.id,
      { currentPicture: `/uploads/${req.file.filename}` },
      { new: true, runValidators: true }
    ).populate('batchYear');

    if (!alumna) {
      return res.status(404).json({ 
        success: false,
        message: 'Alumna not found' 
      });
    }

    res.json({
      success: true,
      data: alumna
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};



module.exports = {
  getAlumni,
  getAlumna,
  createAlumna,
  updateAlumna,
  deleteAlumna,
  getAlumniGrouped,
  currentProfilePicture,
  upload // Export the upload object directly, not configured
};