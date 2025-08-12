const express = require('express');
const router = express.Router();
const {
  getAlumni,
  getAlumna,
  createAlumna,
  updateAlumna,
  deleteAlumna,
  getAlumniGrouped,
  upload
} = require('../controllers/alumniController');

// Create new alumna with file upload middleware
router.post('/', upload.fields([
  { name: 'studentPicture', maxCount: 1 },
  { name: 'currentPicture', maxCount: 1 }
]), createAlumna);

// Get all alumni
router.get('/', getAlumni);

// Get alumni grouped by batch year
router.get('/grouped', getAlumniGrouped);

// Get single alumna
router.get('/:id', getAlumna);

// Update alumna
router.put('/:id', upload.fields([
  { name: 'studentPicture', maxCount: 1 },
  { name: 'currentPicture', maxCount: 1 }
]), updateAlumna);

// Delete alumna
router.delete('/:id', deleteAlumna);

module.exports = router;