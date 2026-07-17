import crypto from 'crypto';
import jwt from 'jsonwebtoken';

class ShopifyOAuth {
  /**
   * Generate a cryptographically signed state token bound to user ID for OAuth CSRF protection.
   * @param {string} userId - Authenticated User ID
   * @returns {string} Signed JWT state token
   */
  static generateOAuthState(userId) {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    return jwt.sign(
      {
        userId: String(userId),
        nonce: crypto.randomBytes(16).toString('hex')
      },
      secret,
      { expiresIn: '15m' } // State expires in 15 minutes
    );
  }

  /**
   * Verify and decode an OAuth state token.
   * @param {string} state - State token received from Shopify callback
   * @returns {object} Decoded payload containing userId
   */
  static verifyOAuthState(state) {
    if (!state || typeof state !== 'string') {
      const err = new Error('OAuth state parameter is required.');
      err.status = 400;
      err.errorType = 'BAD_REQUEST';
      throw err;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(state, secret);
      return decoded;
    } catch (error) {
      const err = new Error('Invalid or expired OAuth state token (CSRF protection triggered).');
      err.status = 400;
      err.errorType = 'BAD_REQUEST';
      throw err;
    }
  }

  /**
   * Verify Shopify OAuth HMAC SHA-256 signature.
   * @param {object} queryParams - Express req.query object from Shopify callback
   * @param {string} clientSecret - Shopify Partner App Client Secret
   * @returns {boolean} True if signature is valid
   */
  static verifyHMAC(queryParams, clientSecret = process.env.SHOPIFY_CLIENT_SECRET) {
    if (!clientSecret) {
      const err = new Error('SHOPIFY_CLIENT_SECRET environment variable is missing.');
      err.status = 500;
      err.errorType = 'INTERNAL_SERVER_ERROR';
      throw err;
    }

    const { hmac, signature, ...params } = queryParams;
    if (!hmac) return false;

    // Sort keys lexicographically and join with &
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${Array.isArray(params[key]) ? params[key].join(',') : params[key]}`)
      .join('&');

    const generatedHmac = crypto
      .createHmac('sha256', clientSecret)
      .update(message)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(generatedHmac, 'utf-8'),
        Buffer.from(String(hmac), 'utf-8')
      );
    } catch (e) {
      return false;
    }
  }
}

export default ShopifyOAuth;
