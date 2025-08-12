const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }


    // 🔥🔥🔥 NEW: Check if token is blacklisted 🔥🔥🔥
    // =================================================================
    const blacklistedToken = await TokenBlacklist.findOne({ token });
    if (blacklistedToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated. Please log in again.' 
      });
    }
    // =================================================================

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Token is not valid - user not found' 
      });
    }

    // Check if user is locked
    if (user.isLocked()) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is locked due to too many failed login attempts' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin rights required.' 
    });
  }
};

module.exports = { auth, admin };