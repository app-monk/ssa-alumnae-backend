const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  changePassword
} = require('../controllers/authController');

const { auth } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', auth, logoutUser);
router.get('/me', auth, getMe);
router.put('/change-password', auth, changePassword);

module.exports = router;