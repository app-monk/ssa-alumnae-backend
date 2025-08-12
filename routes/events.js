const express = require('express');
const router = express.Router();
const {
  getEvents,
  searchEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventsController');
const { auth, admin } = require('../middleware/auth');

// Public routes - anyone can view events
router.route('/').get(getEvents);
router.route('/search').get(searchEvents); 
router.route('/:id').get(getEvent);

// Admin-only routes - restricted to admin users
router.route('/').post(auth, admin, createEvent);
router.route('/:id').put(auth, admin, updateEvent).delete(auth, admin, deleteEvent);
// router.route('/').post(createEvent);
// router.route('/:id').put(updateEvent).delete(deleteEvent);

module.exports = router;