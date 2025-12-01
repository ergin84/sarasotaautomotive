const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    if (error.message && error.message.includes('JWT_SECRET')) {
      console.error('JWT configuration error:', error.message);
      return res.status(500).json({ message: 'Server configuration error' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = auth;


