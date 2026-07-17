import MetaService from './metaService.js';
import CacheService from './cacheService.js';
import UserService from './userService.js';
import UserRepository from '../repositories/userRepository.js';

class BrandService {
  /**
   * Resolve dynamic brand name for a user based on connected Meta account details.
   * Priority:
   * 1. Meta Ad Account Name (metaAccountName)
   * 2. Business Manager Name (businessName)
   * 3. Facebook Page Name (pageName)
   * 4. Fallback: ""
   *
   * Dynamic Cache Key: brand_name::<userId>::<metaAccountId>::<tokenHash>
   * Ensures instant updates when account ID or access token changes.
   */
  static async getBrandDisplayName(user) {
    if (!user) {
      return { brandName: '' };
    }

    let userId = null;
    let userObj = null;

    if (typeof user === 'string') {
      userId = user;
    } else if (user && typeof user === 'object') {
      userId = user.id || user._id?.toString();
      userObj = user;
    }

    if (!userId) {
      return { brandName: '' };
    }

    // If user object not provided or missing tokens, try fetching user document
    if (!userObj || !userObj.metaAccountId || !userObj.metaAccessToken) {
      try {
        userObj = await UserService.findUserById(userId);
      } catch (err) {
        // User lookup failed or not found
      }
    }

    const accountId = userObj?.metaAccountId || 'no_account';
    const tokenHash = userObj?.metaAccessToken
      ? String(userObj.metaAccessToken).slice(-8)
      : 'no_token';

    // Dynamic cache key tied directly to account ID & token state
    const cacheKey = `brand_name::${userId}::${accountId}::${tokenHash}`;

    // Check cache
    const cached = CacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return { brandName: cached };
    }

    let metaAccountName = userObj?.metaAccountName || null;
    let businessName = null;
    let pageName = null;

    if (userObj && userObj.metaAccountId && userObj.metaAccessToken) {
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

      // Fetch Meta Ad Account Name & Business Manager Name
      try {
        const accountData = await MetaService.get(formattedAccountId, userObj, {
          fields: 'name,business{name},promoted_object'
        });

        if (accountData?.name && accountData.name.trim()) {
          metaAccountName = accountData.name.trim();
        }
        if (accountData?.business?.name && accountData.business.name.trim()) {
          businessName = accountData.business.name.trim();
        }
        if (accountData?.promoted_object?.name && accountData.promoted_object.name.trim()) {
          pageName = accountData.promoted_object.name.trim();
        }
      } catch (err) {
        // Ignore Meta API error for account details fetch
      }

      // Fetch Facebook Page Name from me/accounts if not resolved yet
      if (!pageName) {
        try {
          const pagesData = await MetaService.get('me/accounts', userObj, {
            fields: 'name',
            limit: 1
          });
          if (pagesData?.data?.[0]?.name && pagesData.data[0].name.trim()) {
            pageName = pagesData.data[0].name.trim();
          }
        } catch (err) {
          // Ignore page fetch error
        }
      }

      // Persist metaAccountName on User document if modified or updated
      if (metaAccountName && userObj.metaAccountName !== metaAccountName) {
        try {
          userObj.metaAccountName = metaAccountName;
          await UserRepository.save(userObj);
        } catch (err) {
          // Ignore save error
        }
      }
    }

    // Step 4 Logging: Log resolved details for dev tracing
    console.log({
      metaAccountId: userObj?.metaAccountId || null,
      metaAccountName: metaAccountName || null,
      businessName: businessName || null,
      pageName: pageName || null
    });

    // Step 5 Brand Resolver priority logic
    const resolvedBrandName = (
      metaAccountName ||
      businessName ||
      pageName ||
      ""
    ).trim();

    // Cache resolved brand name (tied to account ID & token hash)
    CacheService.set(cacheKey, resolvedBrandName, 86400);

    return { brandName: resolvedBrandName };
  }

  /**
   * Alias helper method as required by contract
   */
  static async getBrandName(user) {
    return BrandService.getBrandDisplayName(user);
  }
}

export const getBrandDisplayName = BrandService.getBrandDisplayName;
export const getBrandName = BrandService.getBrandName;
export default BrandService;
