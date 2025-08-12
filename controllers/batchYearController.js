const BatchYear = require('../models/batchYear');

// @desc    Get all batch years
// @route   GET /api/batch-years
// @access  Public
const getBatchYears = async (req, res) => {
  try {
    const batchYears = await BatchYear.find().sort({ year: -1 });
    res.json({
      success: true,
      count: batchYears.length,
       batchYears
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Create batch year
// @route   POST /api/batch-years
// @access  Private/Admin
const createBatchYear = async (req, res) => {
  try {
    //Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to create events.' 
      });
    }

    const { year } = req.body;
    
    // Check if year already exists
    const existingYear = await BatchYear.findOne({ year });
    if (existingYear) {
      return res.status(400).json({ 
        success: false,
        message: 'Batch year already exists' 
      });
    }

    const batchYear = new BatchYear({ year });
    const savedBatchYear = await batchYear.save();
    
    res.status(201).json({
      success: true,
       savedBatchYear
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Delete batchYearController.js if it exists
// @desc    Delete batch year
// @route   DELETE /api/batch-years/:id
// @access  Private/Admin
const deleteBatchYear = async (req, res) => {
  try {
    //Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to create events.' 
      });
    }
    
    const { id } = req.params;
    const batchYear = await BatchYear.findById(id);
    if (!batchYear) {
      return res.status(404).json({ 
        success: false,
        message: 'Batch year not found' 
      });
    } 
    await batchYear.deleteOne(); // Changed from remove() to deleteOne()
    res.json({
      success: true,
      message: 'Batch year deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getBatchYears,
  createBatchYear,
  deleteBatchYear
};