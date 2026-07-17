import UserRepository from '../repositories/userRepository.js';
import encryption from '../utils/encryption.js';

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

    // Set new password (Mongoose pre-save hook will hash it)
    if (updatedFields.password !== undefined) {
      user.password = updatedFields.password;
    }

    await UserRepository.save(user);
    return user;
  }

  /**
   * Get user dashboard preferences
   */
  static async getDashboardPreferences(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.dashboardPreferences || { version: 1, visibleCards: undefined, cardOrder: undefined };
  }

  /**
   * Update user dashboard preferences
   */
  static async updateDashboardPreferences(userId, { visibleCards, cardOrder, version = 1 }) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.dashboardPreferences = {
      version: version || 1,
      visibleCards: Array.isArray(visibleCards) ? visibleCards : (user.dashboardPreferences?.visibleCards || []),
      cardOrder: Array.isArray(cardOrder) ? cardOrder : (user.dashboardPreferences?.cardOrder || [])
    };

    await UserRepository.save(user);
    return user.dashboardPreferences;
  }

  /**
   * Reset user dashboard preferences
   */
  static async resetDashboardPreferences(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.dashboardPreferences = {
      version: 1,
      visibleCards: undefined,
      cardOrder: undefined
    };

    await UserRepository.save(user);
    return user.dashboardPreferences;
  }
}

export default UserService;
