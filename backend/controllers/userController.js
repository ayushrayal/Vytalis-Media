import UserService from '../services/userService.js';

class UserController {
  /**
   * GET /api/users/dashboard-preferences
   */
  static async getDashboardPreferences(req, res, next) {
    try {
      const userId = req.user._id;
      const preferences = await UserService.getDashboardPreferences(userId);

      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/dashboard-preferences
   */
  static async updateDashboardPreferences(req, res, next) {
    try {
      const userId = req.user._id;
      const { visibleCards, cardOrder, version } = req.body;

      const preferences = await UserService.updateDashboardPreferences(userId, {
        visibleCards,
        cardOrder,
        version
      });

      res.status(200).json({
        success: true,
        message: 'Dashboard preferences updated successfully.',
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/dashboard-preferences/reset
   */
  static async resetDashboardPreferences(req, res, next) {
    try {
      const userId = req.user._id;
      const preferences = await UserService.resetDashboardPreferences(userId);

      res.status(200).json({
        success: true,
        message: 'Dashboard preferences reset to default.',
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;
