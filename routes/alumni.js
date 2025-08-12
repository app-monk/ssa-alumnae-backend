const express = require('express');
const router = express.Router();

// Import controllers
const {
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
  updateCurrentPicture,
  uploadMultiple,
  uploadSingle
} = require('../controllers/alumniController');
// Import middleware
const { auth, admin } = require('../middleware/auth');

// Base routes
router.route('/')
  .get(getAlumni)
  .post(auth, admin, uploadMultiple, createAlumna);

// Search and filter routes - specific routes first
router.route('/advanced-search').get(advancedSearchAlumni);
router.route('/search').get(searchAlumniByName);
router.route('/grouped').get(getAlumniGrouped);
router.route('/years').get(getAlumniByYearRange);
router.route('/batch/:batchYearId').get(getAlumniByBatchYear);
router.route('/year/:year').get(getAlumniByYear);
// Update the grouped route to handle search
//router.route('/grouped').get((req, res) => {
//  if (req.query.search) {
//    return alumniController.getAlumniGroupedWithSearch(req, res);
//  }
//  return alumniController.getAlumniGrouped(req, res);
//});

// ID routes last
router.route('/:id')
  .get(getAlumna)
  .put(auth, admin, uploadMultiple, updateAlumna)
  .delete(auth, admin, deleteAlumna);

router.route('/:id/current-picture')
  .put(uploadSingle, updateCurrentPicture);

module.exports = router;