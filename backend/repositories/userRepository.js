import User from '../models/User.js';

class UserRepository {
  /**
   * Find a user by their email address.
   */
  static async findByEmail(email) {
    return User.findOne({ email });
  }

  /**
   * Find a user by their unique database ID.
   */
  static async findById(id) {
    return User.findById(id);
  }

  /**
   * Create and save a new user.
   */
  static async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  /**
   * Update a user document by ID.
   */
  static async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  /**
   * Save a user mongoose document.
   */
  static async save(userDoc) {
    return userDoc.save();
  }
}

export default UserRepository;
