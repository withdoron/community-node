/**
 * Process monthly Joy Coin grants for Community Pass subscribers.
 *
 * This function should be called:
 * - By Stripe webhook when subscription renews, OR
 * - Manually from admin panel for testing, OR
 * - By a scheduled job on the 1st of each month (batch mode)
 *
 * Logic:
 * 1. Set user's Joy Coin balance to the monthly grant amount
 * 2. Create a monthly_grant transaction
 * 3. Existing reservations remain valid (they're already committed)
 *
 * NOTE: The grant amount should eventually come from:
 * - User's subscription tier (different tiers = different grants)
 * - Platform config (AdminSettings)
 * For now, we use a default constant.
 */

import { base44 } from '@/api/base44Client';

const DEFAULT_MONTHLY_GRANT = 15;

/**
 * Process monthly grant for a single user.
 * Call this from Stripe webhook when subscription renews.
 *
 * @param {string} userId - The user ID to process
 * @param {number} grantAmount - Number of coins to grant (optional, uses default)
 * @returns {object} Result with success status and details
 */
export async function processMonthlyGrantForUser(userId, grantAmount = DEFAULT_MONTHLY_GRANT) {
  try {
    let joyCoinsRecords = await base44.entities.JoyCoins.filter({ user_id: userId });
    let joyCoins;

    if (joyCoinsRecords.length === 0) {
      joyCoins = await base44.entities.JoyCoins.create({
        user_id: userId,
        balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0
      });
    } else {
      joyCoins = joyCoinsRecords[0];
    }

    const previousBalance = joyCoins.balance ?? 0;
    const newBalance = grantAmount;
    const newLifetimeEarned = (joyCoins.lifetime_earned ?? 0) + grantAmount;

    await base44.entities.JoyCoins.update(joyCoins.id, {
      balance: newBalance,
      lifetime_earned: newLifetimeEarned
    });

    await base44.entities.JoyCoinTransactions.create({
      user_id: userId,
      type: 'monthly_grant',
      amount: grantAmount,
      balance_after: newBalance,
      note: previousBalance > 0
        ? `Monthly grant (${previousBalance} unused coins expired)`
        : 'Monthly grant'
    });

    return {
      success: true,
      userId,
      previousBalance,
      newBalance,
      grantAmount,
      coinsExpired: previousBalance
    };
  } catch (error) {
    return {
      success: false,
      userId,
      error: error.message
    };
  }
}

/**
 * Batch process monthly grants for all users with JoyCoins records.
 * Call this from admin panel or scheduled job.
 *
 * WARNING: This processes ALL users - use with caution.
 * In production, this should only process users whose subscription
 * billing date matches today.
 *
 * @param {number} grantAmount - Number of coins to grant (optional)
 * @returns {object} Results summary
 */
export async function processMonthlyGrantsBatch(grantAmount = DEFAULT_MONTHLY_GRANT) {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalCoinsGranted: 0,
    totalCoinsExpired: 0,
    errors: []
  };

  try {
    const allJoyCoins = await base44.entities.JoyCoins.filter({});

    for (const joyCoins of allJoyCoins) {
      const result = await processMonthlyGrantForUser(joyCoins.user_id, grantAmount);
      results.processed++;

      if (result.success) {
        results.succeeded++;
        results.totalCoinsGranted += result.grantAmount;
        results.totalCoinsExpired += result.coinsExpired;
      } else {
        results.failed++;
        results.errors.push({
          userId: joyCoins.user_id,
          error: result.error
        });
      }
    }
  } catch (error) {
    results.errors.push({
      type: 'batch',
      error: error.message
    });
  }

  return results;
}

/**
 * Process monthly grants for a specific list of users.
 * Useful for processing specific subscription cohorts.
 *
 * @param {string[]} userIds - Array of user IDs to process
 * @param {number} grantAmount - Number of coins to grant (optional)
 * @returns {object} Results summary
 */
export async function processMonthlyGrantsForUsers(userIds, grantAmount = DEFAULT_MONTHLY_GRANT) {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalCoinsGranted: 0,
    totalCoinsExpired: 0,
    errors: []
  };

  for (const userId of userIds) {
    const result = await processMonthlyGrantForUser(userId, grantAmount);
    results.processed++;

    if (result.success) {
      results.succeeded++;
      results.totalCoinsGranted += result.grantAmount;
      results.totalCoinsExpired += result.coinsExpired;
    } else {
      results.failed++;
      results.errors.push({
        userId,
        error: result.error
      });
    }
  }

  return results;
}

/**
 * Get the default monthly grant amount.
 * Eventually this should read from AdminSettings or subscription tier.
 */
export function getDefaultGrantAmount() {
  return DEFAULT_MONTHLY_GRANT;
}
