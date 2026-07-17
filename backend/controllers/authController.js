import AuthService from '../services/authService.js';
import UserService from '../services/userService.js';
import CreativeService from '../services/creativeService.js';
import CacheService from '../services/cacheService.js';

class AuthController {
  /**
   * Handle Login Request
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          errorType: 'BAD_REQUEST',
          message: 'Email and password are required.'
        });
      }

      const result = await AuthService.login(email, password);
      
      // Cache warm-up immediately after successful login
      const userDoc = await UserService.findUserByEmail(email);
      if (userDoc) {
        console.log('[CACHE WARMUP STARTED]');
        setTimeout(async () => {
          try {
            await CreativeService.getSalesCreatives(userDoc, false);
            console.log('[CACHE WARMUP COMPLETED]');
            CacheService.logTelemetry();
          } catch (err) {
            console.warn('[CACHE WARMUP ERROR]', err.message);
          }
        }, 1000);
      }

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: result
      });
    } catch (error) {
      res.status(error.status || 401).json({
        success: false,
        errorType: 'INVALID_CREDENTIALS',
        message: error.message || 'Invalid email or password.'
      });
    }
  }

  /**
   * Handle Signup Request
   */
  static async signup(req, res, next) {
    try {
      const result = await AuthService.signup(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful.',
        data: result
      });
    } catch (error) {
      res.status(error.status || 400).json({
        success: false,
        errorType: 'BAD_REQUEST',
        message: error.message || 'Registration failed.'
      });
    }
  }

  /**
   * Handle Me Request (Gets currently authenticated user)
   */
  static me(req, res, next) {
    try {
      // req.user has already been verified and populated by authMiddleware.
      const userObj = req.user.toObject ? req.user.toObject() : req.user;
      
      // We sanitise Meta token and password details here to prevent exposing them to the frontend.
      const { password, metaAccessToken, ...sanitizedUser } = userObj;
      
      // Format response to use camelCase id property instead of _id if needed, but keeping mongoose representation
      const userResponse = {
        id: sanitizedUser._id ? sanitizedUser._id.toString() : sanitizedUser.id,
        companyName: sanitizedUser.companyName,
        email: sanitizedUser.email,
        metaAccountId: sanitizedUser.metaAccountId,
        metaAccountName: sanitizedUser.metaAccountName || '',
        role: sanitizedUser.role,
        isActive: sanitizedUser.isActive,
        lastLoginAt: sanitizedUser.lastLoginAt,
        createdAt: sanitizedUser.createdAt,
        updatedAt: sanitizedUser.updatedAt
      };

      res.status(200).json({
        success: true,
        data: {
          user: userResponse
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Profile Update Request
   */
  static async updateProfile(req, res, next) {
    try {
      const { companyName, metaAccountId, metaAccessToken, currentPassword, password } = req.body;
      const user = req.user; // Mongoose document populated by authMiddleware
      
      const updatedFields = {};
      if (companyName !== undefined) updatedFields.companyName = companyName;
      if (metaAccountId !== undefined) updatedFields.metaAccountId = metaAccountId;
      if (metaAccessToken) updatedFields.metaAccessToken = metaAccessToken;

      // Handle password changes securely
      if (password) {
        if (!currentPassword) {
          const err = new Error('Current password is required to update your password.');
          err.status = 400;
          throw err;
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          const err = new Error('Incorrect current password.');
          err.status = 400;
          throw err;
        }
        updatedFields.password = password;
      }

      const updatedUser = await UserService.updateUserProfile(user._id, updatedFields);
      const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
      const { password: _, metaAccessToken: __, ...sanitized } = userObj;
      
      const userResponse = {
        id: sanitized._id ? sanitized._id.toString() : sanitized.id,
        companyName: sanitized.companyName,
        email: sanitized.email,
        metaAccountId: sanitized.metaAccountId,
        metaAccountName: sanitized.metaAccountName || '',
        role: sanitized.role,
        isActive: sanitized.isActive,
        lastLoginAt: sanitized.lastLoginAt,
        createdAt: sanitized.createdAt,
        updatedAt: sanitized.updatedAt
      };

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          user: userResponse
        }
      });
    } catch (error) {
      res.status(error.status || 400).json({
        success: false,
        errorType: 'BAD_REQUEST',
        message: error.message || 'Profile update failed.'
      });
    }
  }

  /**
   * Handle Logout Request
   */
  static logout(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
