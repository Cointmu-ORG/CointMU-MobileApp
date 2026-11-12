/** How many separate wallets (secrets) the app holds at once (D-78). */
export const MAX_WALLETS = 10;

/**
 * Id of the wallet that existed before several wallets were supported. Its secret stays under
 * the SecureStore key it always had, so upgrading never rewrites or moves a key (D-79).
 */
export const LEGACY_WALLET_ID = 'legacy';

/** Random bytes in a new wallet id (hex-encoded: 32 characters). */
export const WALLET_ID_BYTES = 16;
