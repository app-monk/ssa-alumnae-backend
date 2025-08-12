const Event = require('../models/Event');

// @desc    Get all events (Public - anyone can view)
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'username')
      .sort({ date: 1, time: 1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Search events with filters
// @route   GET /api/events/search
// @access  Public
const searchEvents = async (req, res) => {
  try {
    const { keyword, year, location, batchYear } = req.query;
    
    // Build search query
    let query = {};
    
    // Keyword search (title, description, location, organizer name)
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { location: { $regex: keyword, $options: 'i' } },
        { organizerName: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    // Year filter (only future years and current year)
    if (year) {
      const currentYear = new Date().getFullYear();
      const searchYear = parseInt(year);
      
      // Only allow current year and future years
      if (searchYear >= currentYear) {
        const startOfYear = new Date(searchYear, 0, 1);
        const endOfYear = new Date(searchYear, 11, 31, 23, 59, 59);
        query.date = { $gte: startOfYear, $lte: endOfYear };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Year must be the current year or a future year'
        });
      }
    } else {
      // Default: only show upcoming events (today and future)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.date = { $gte: today };
    }
    
    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Batch year filter
    if (batchYear) {
      query.$and = [
        { audience: 'batch' },
        { batchYear: parseInt(batchYear) }
      ];
    }
    
    const events = await Event.find(query)
      .populate('createdBy', 'username')
      .sort({ date: 1, time: 1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get single event (Public - anyone can view)
// @route   GET /api/events/:id
// @access  Public
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    res.json({
      success: true,
       event
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Create new event (Admin only)
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    //Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to create events.' 
      });
    }

    const {
      title,
      description,
      date,
      time,
      location,
      detailsUrl,
      organizerName,
      organizerEmail,
      organizerPhone,
      audience,
      batchYear,
      groupName,
    } = req.body;

    // For testing purposes, use a mock user ID
    const mockUserId = '666666666666666666666666'; 

    const event = new Event({
      title,
      description,
      date,
      time,
      location,
      detailsUrl,
      organizerName,
      organizerEmail,
      organizerPhone,
      audience,
      batchYear: audience === 'batch' ? batchYear : undefined,
      groupName: audience === 'group' ? groupName : undefined,
      //createdBy: mockUserId, // Replace with req.user._id in production
      createdBy: req.user._id
    });
    
    const savedEvent = await event.save();
    
    // Populate for response
    const populatedEvent = await Event.findById(savedEvent._id)
      .populate('createdBy', 'username');
    
    res.status(201).json({
      success: true,
       populatedEvent,
      message: 'Event created successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Update event (Admin only)
// @route   PUT /api/events/:id
// @access  Private/Admin
const updateEvent = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to update events.' 
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    const {
      title,
      description,
      date,
      time,
      location,
      detailsUrl,
      organizerName,
      organizerEmail,
      organizerPhone,
      audience,
      batchYear,
      groupName
    } = req.body;

    const updateData = {
      title,
      description,
      date,
      time,
      location,
      detailsUrl,
      organizerName,
      organizerEmail,
      organizerPhone,
      audience,
      batchYear: audience === 'batch' ? batchYear : undefined,
      groupName: audience === 'group' ? groupName : undefined,
      dateUpdated: Date.now()
    };

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    res.json({
      success: true,
       updatedEvent,
      message: 'Event updated successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Delete event (Admin only)
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin rights required to delete events.' 
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    await event.deleteOne();
    res.json({
      success: true,
      message: 'Event removed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

module.exports = {
  getEvents,
  searchEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
};