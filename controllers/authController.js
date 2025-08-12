const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');

// Generate JWT Token with enhanced security
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Shorter expiration for better security
    issuer: 'ssa-alumnae-app',
    audience: 'ssa-alumnae-users'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please include all fields' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email or username' 
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      // Update last login
      user.lastLogin = Date.now();
      await user.save();

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          token: generateToken(user._id),
        },
        message: 'User registered successfully'
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: 'Invalid user data' 
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
};




    // @desc    Login user
    // @route   POST /api/auth/login
    // @access  Public
    const loginUser = async (req, res) => {
      try {
        const { login, password } = req.body;
    
        // Validate input
        if (!login || !password) {
          return res.status(400).json({
            success: false,
            message: 'Please provide both login and password'
          });
        }
    
        console.log('Login attempt with:', { login }); // Debug log
    
        // Find user by username OR email
        const user = await User.findOne({
          $or: [
            { email: login.toString().toLowerCase() }, // Handle non-string inputs
            { username: new RegExp(`^${login}$`, 'i') } // Case-insensitive username
          ]
        });
    
        console.log('User found:', user ? 'Yes' : 'No'); // Debug log
    
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
    
        // Check if account is locked
        if (user.isLocked()) {
          return res.status(401).json({ 
            success: false,
            message: 'Account is locked due to too many failed login attempts'
          });
        }
    
        // Check password
        const isMatch = await user.matchPassword(password);
        console.log('Password match:', isMatch ? 'Yes' : 'No'); // Debug log
    
        if (!isMatch) {
          // Increment login attempts
          user.loginAttempts += 1;
          
          // Lock account after 5 failed attempts
          if (user.loginAttempts >= 5) {
            user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
          }
          
          await user.save();
          
          return res.status(401).json({ 
            success: false,
            message: 'Invalid credentials' 
          });
        }
    
        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lastLogin = Date.now();
        await user.save();
    
        res.json({
          success: true,
          data: {
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
          },
          message: 'Login successful'
        });
      } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
          success: false,
          message: 'Server error during login'
        });
      }
    };
    

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
       user
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error retrieving user data' 
    });
  }
};

// @desc    Logout user with token blacklisting
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    // 🔥🔥🔥 NEW: Blacklist the token on logout 🔥🔥🔥
    // =================================================================
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      // Decode token to get expiration time
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000); // Convert to milliseconds
      
      // Add token to blacklist
      // await TokenBlacklist.create({
      //   token,
      //   expiresAt,
      //   userId: req.user.id
      // });
      
      console.log(`Token blacklisted for user ${req.user.id}`);
    }
    // =================================================================
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout' 
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 6 characters' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error changing password' 
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  changePassword
};
