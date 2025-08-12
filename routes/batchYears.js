const express = require('express');
const router = express.Router();
const { getBatchYears, createBatchYear, deleteBatchYear } = require('../controllers/batchYearController');

const { auth, admin } = require('../middleware/auth');

router.route('/').get(getBatchYears).post(auth, admin, createBatchYear);

//router.route('/').get(getBatchYears).post(createBatchYear);

router.route('/:id').delete(deleteBatchYear);

module.exports = router;