import jwt from 'jsonwebtoken';
import validator from 'validator';
import UserService from './userService.js';
import UserRepository from '../repositories/userRepository.js';
import encryption from '../utils/encryption.js';

class AuthService {
  /**
   * Validate user credentials and handle login.
   */
  static async login(email, password) {
    console.log('[Login Flow] Request received for email:', email);

    if (!email || !password) {
      console.warn('[Login Flow] Validation failed: Missing email or password');
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }

    const user = await UserService.findUserByEmail(email);
    if (!user) {
      console.warn('[Login Flow] User not found for email:', email);
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    // Check if user account is active
    if (!user.isActive) {
      console.warn('[Login Flow] User account is deactivated for email:', email);
      const err = new Error('Your account is deactivated. Please contact support.');
      err.status = 403;
      throw err;
    }

    // Compare hashed password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn('[Login Flow] Password mismatch for email:', email);
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await UserRepository.save(user);
    console.log('[Login Flow] Password verified and lastLoginAt updated.');

    // Generate JWT token containing the user id
    console.log('[Login Flow] Generating JWT token...');
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      secret,
      { expiresIn: '24h' }
    );
    console.log('[Login Flow] JWT token generated successfully.');

    // Return token and sanitized user profile (camelCase properties)
    return {
      token,
      user: {
        id: user._id.toString(),
        companyName: user.companyName,
        email: user.email,
        metaAccountId: user.metaAccountId,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt
      }
    };
  }

  /**
   * Handle user signup registration.
   */
  static async signup(userData) {
    console.log('[Signup Flow] Request received:', { 
      companyName: userData.companyName, 
      email: userData.email, 
      metaAccountId: userData.metaAccountId 
    });

    const { companyName, email, password, metaAccountId, metaAccessToken, accessCode } = userData;

    // Validate presence with granular, descriptive error messages
    if (!companyName) {
      console.warn('[Signup Flow] Validation failed: Missing Company Name');
      const err = new Error('Company Name is required.');
      err.status = 400;
      throw err;
    }
    if (!email) {
      console.warn('[Signup Flow] Validation failed: Missing Email');
      const err = new Error('Email Address is required.');
      err.status = 400;
      throw err;
    }
    if (!password) {
      console.warn('[Signup Flow] Validation failed: Missing Password');
      const err = new Error('Password is required.');
      err.status = 400;
      throw err;
    }
    if (!metaAccountId) {
      console.warn('[Signup Flow] Validation failed: Missing Meta Account ID');
      const err = new Error('Meta Ad Account ID is required.');
      err.status = 400;
      throw err;
    }
    if (!metaAccessToken) {
      console.warn('[Signup Flow] Validation failed: Missing Meta Access Token');
      const err = new Error('Meta Access Token is required.');
      err.status = 400;
      throw err;
    }
    if (!accessCode) {
      console.warn('[Signup Flow] Validation failed: Missing System Access Code');
      const err = new Error('System Access Code is required.');
      err.status = 400;
      throw err;
    }

    // Validate access code
    if (accessCode !== process.env.SIGNUP_ACCESS_CODE) {
      console.warn('[Signup Flow] Access code verification failed');
      const err = new Error('Invalid signup access code.');
      err.status = 403;
      throw err;
    }
    console.log('[Signup Flow] Access code verified.');

    // Validate email format
    if (!validator.isEmail(email)) {
      console.warn('[Signup Flow] Validation failed: Invalid email format');
      const err = new Error('Please provide a valid email address.');
      err.status = 400;
      throw err;
    }

    // Validate password length
    if (password.length < 8) {
      console.warn('[Signup Flow] Validation failed: Password too short');
      const err = new Error('Password must be at least 8 characters long.');
      err.status = 400;
      throw err;
    }

    console.log('[Signup Flow] Input validation passed.');

    // Check if email already exists
    const existingUser = await UserService.findUserByEmail(email);
    if (existingUser) {
      console.warn('[Signup Flow] Email already registered:', email);
      const err = new Error('This email is already registered.');
      err.status = 409;
      throw err;
    }

    // Encrypt Meta Access Token
    console.log('[Signup Flow] Encrypting Meta access token...');
    const encryptedMetaToken = encryption.encrypt(metaAccessToken);
    console.log('[Signup Flow] Meta token encrypted successfully.');

    // Create user
    console.log('[Signup Flow] Saving user to MongoDB...');
    const newUser = await UserRepository.create({
      companyName,
      email,
      password, // Pre-save hook hashes this
      metaAccountId,
      metaAccessToken: encryptedMetaToken,
      role: 'Client',
      isActive: true,
      lastLoginAt: new Date()
    });
    console.log('[Signup Flow] User saved to MongoDB with ID:', newUser._id);

    // Generate JWT token containing the user id
    console.log('[Signup Flow] Generating JWT token...');
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign(
      { userId: newUser._id.toString(), email: newUser.email },
      secret,
      { expiresIn: '24h' }
    );
    console.log('[Signup Flow] JWT token generated successfully.');

    return {
      token,
      user: {
        id: newUser._id.toString(),
        companyName: newUser.companyName,
        email: newUser.email,
        metaAccountId: newUser.metaAccountId,
        role: newUser.role,
        isActive: newUser.isActive,
        lastLoginAt: newUser.lastLoginAt
      }
    };
  }

  /**
   * Verify JWT token and extract payload
   */
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_key';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired authentication token');
    }
  }
}

export default AuthService;
