import UserRepository from '../repositories/userRepository.js';
import encryption from '../utils/encryption.js';
import CacheService from './cacheService.js';
import MetaService from './metaService.js';

class UserService {
  /**
   * Find a user by email
   */
  static async findUserByEmail(email) {
    return UserRepository.findByEmail(email);
  }

  /**
   * Find a user by id
   */
  static async findUserById(id) {
    return UserRepository.findById(id);
  }

  /**
   * Save/Update user profile
   */
  static async updateUserProfile(id, updatedFields) {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Update allowable fields
    if (updatedFields.companyName !== undefined) {
      user.companyName = updatedFields.companyName;
    }
    if (updatedFields.metaAccountId !== undefined) {
      user.metaAccountId = updatedFields.metaAccountId;
    }
    
    // Encrypt metaAccessToken if updated
    if (updatedFields.metaAccessToken) {
      user.metaAccessToken = encryption.encrypt(updatedFields.metaAccessToken);
    }

    if (updatedFields.metaAccountName !== undefined) {
      user.metaAccountName = updatedFields.metaAccountName;
    }

    // Set new password (Mongoose pre-save hook will hash it)
    if (updatedFields.password !== undefined) {
      user.password = updatedFields.password;
    }

    // Fetch and persist fresh Meta Ad Account Name if Meta details exist or were modified
    if (user.metaAccountId && user.metaAccessToken) {
      try {
        const accountInfo = await MetaService.getAccountName(user);
        if (accountInfo?.name && accountInfo.name.trim()) {
          user.metaAccountName = accountInfo.name.trim();
        }
      } catch (err) {
        // Ignore fetch error
      }
    }

    await UserRepository.save(user);

    // Flush cache when user profile credentials or settings are updated
    CacheService.flush();

    return user;
  }
}

export default UserService;
