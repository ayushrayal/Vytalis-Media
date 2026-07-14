import AuthService from '../services/authService.js';
import UserService from '../services/userService.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        errorType: 'UNAUTHORIZED',
        message: 'Access denied. No authentication token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Fetch user details (MongoDB query)
    const user = await UserService.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        errorType: 'UNAUTHORIZED',
        message: 'Session invalid. User no longer exists.'
      });
    }

    // Verify account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        errorType: 'DEACTIVATED',
        message: 'Your account is deactivated. Please contact support.'
      });
    }

    // Attach user mongoose document directly to request
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      errorType: 'UNAUTHORIZED',
      message: error.message || 'Invalid or expired session token.'
    });
  }
};

export default authMiddleware;
