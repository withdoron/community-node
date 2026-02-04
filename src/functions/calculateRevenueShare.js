/**
 * Calculate revenue share for businesses based on Joy Coin redemptions.
 *
 * Revenue share model (from spec):
 * - 75% of coin value goes to businesses
 * - 25% retained by LocalLane
 * - Based on REDEMPTIONS (check-ins), not reservations
 *
 * Coin value calculation:
 * - Community Pass subscription price / monthly grant = value per coin
 * - Example: $50/month subscription, 15 coins/month = $3.33 per coin
 * - Business receives 75% = $2.50 per coin redeemed
 *
 * NOTE: This is a calculation function. Actual payouts via Stripe Connect
 * are handled separately in Phase 6.
 */

import { base44 } from '@/api/base44Client';

const DEFAULT_SUBSCRIPTION_PRICE = 50;
const DEFAULT_MONTHLY_GRANT = 15;
const BUSINESS_SHARE_PERCENT = 0.75;
const PLATFORM_SHARE_PERCENT = 0.25;

export function getCoinValue(
  subscriptionPrice = DEFAULT_SUBSCRIPTION_PRICE,
  monthlyGrant = DEFAULT_MONTHLY_GRANT
) {
  return subscriptionPrice / monthlyGrant;
}

export function getBusinessSharePerCoin(
  subscriptionPrice = DEFAULT_SUBSCRIPTION_PRICE,
  monthlyGrant = DEFAULT_MONTHLY_GRANT
) {
  const coinValue = getCoinValue(subscriptionPrice, monthlyGrant);
  return coinValue * BUSINESS_SHARE_PERCENT;
}

export async function calculateRevenueShareForBusiness(
  businessId,
  startDate,
  endDate,
  options = {}
) {
  const { subscriptionPrice = DEFAULT_SUBSCRIPTION_PRICE, monthlyGrant = DEFAULT_MONTHLY_GRANT } =
    options;

  const coinValue = getCoinValue(subscriptionPrice, monthlyGrant);
  const businessSharePerCoin = coinValue * BUSINESS_SHARE_PERCENT;

  try {
    const allTransactions = await base44.entities.JoyCoinTransactions.filter({
      business_id: businessId,
      type: 'redemption'
    });

    const redemptions = allTransactions.filter((tx) => {
      const txDate = new Date(tx.created_at || tx.created_date || 0);
      return txDate >= startDate && txDate < endDate;
    });

    const eventIds = [...new Set(redemptions.map((tx) => tx.event_id).filter(Boolean))];
    const reservationIds = [...new Set(redemptions.map((tx) => tx.reservation_id).filter(Boolean))];

    const eventResults = await Promise.all(
      eventIds.map((id) => base44.entities.Event.filter({ id }))
    );
    const events = eventResults.flat();
    const eventMap = events.reduce((map, event) => {
      map[event.id] = event;
      return map;
    }, {});

    let totalCoinsRedeemed = 0;
    const reservationResults = await Promise.all(
      reservationIds.map((id) => base44.entities.JoyCoinReservations.filter({ id }))
    );
    const reservations = reservationResults.flat();

    for (const reservation of reservations) {
      if (reservation.status === 'redeemed') {
        totalCoinsRedeemed += reservation.amount ?? 0;
      }
    }

    const totalCoinValue = totalCoinsRedeemed * coinValue;
    const businessShare = totalCoinsRedeemed * businessSharePerCoin;
    const platformShare = totalCoinValue - businessShare;

    const eventBreakdown = eventIds
      .map((eventId) => {
        const event = eventMap[eventId];
        const eventReservations = reservations.filter(
          (r) => r.event_id === eventId && r.status === 'redeemed'
        );
        const eventCoins = eventReservations.reduce((sum, r) => sum + (r.amount ?? 0), 0);

        return {
          eventId,
          eventTitle: event?.title || 'Unknown Event',
          eventDate: event?.date || event?.start_date,
          coinsRedeemed: eventCoins,
          businessShare: eventCoins * businessSharePerCoin
        };
      })
      .filter((e) => e.coinsRedeemed > 0)
      .sort((a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0));

    return {
      success: true,
      businessId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalRedemptions: redemptions.length,
        totalCoinsRedeemed,
        coinValue,
        totalCoinValue,
        businessSharePercent: BUSINESS_SHARE_PERCENT * 100,
        businessShare,
        platformShare
      },
      eventBreakdown,
      pricing: {
        subscriptionPrice,
        monthlyGrant,
        businessSharePerCoin
      }
    };
  } catch (error) {
    return {
      success: false,
      businessId,
      error: error.message
    };
  }
}

export async function calculateMonthlyRevenueShare(year, month, options = {}) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const results = {
    period: {
      year,
      month,
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    businesses: [],
    totals: {
      totalCoinsRedeemed: 0,
      totalBusinessShare: 0,
      totalPlatformShare: 0
    },
    errors: []
  };

  try {
    const allBusinesses = await base44.entities.Business.list('-created_date', 500);
    const businesses = allBusinesses.filter((b) => b.is_active !== false);

    for (const business of businesses) {
      const result = await calculateRevenueShareForBusiness(
        business.id,
        startDate,
        endDate,
        options
      );

      if (result.success && result.summary.totalCoinsRedeemed > 0) {
        results.businesses.push({
          businessId: business.id,
          businessName: business.name,
          ...result.summary,
          eventBreakdown: result.eventBreakdown
        });

        results.totals.totalCoinsRedeemed += result.summary.totalCoinsRedeemed;
        results.totals.totalBusinessShare += result.summary.businessShare;
        results.totals.totalPlatformShare += result.summary.platformShare;
      } else if (!result.success) {
        results.errors.push({
          businessId: business.id,
          businessName: business.name,
          error: result.error
        });
      }
    }

    results.businesses.sort((a, b) => b.businessShare - a.businessShare);
  } catch (error) {
    results.errors.push({
      type: 'general',
      error: error.message
    });
  }

  return results;
}

export function getPricingConfig() {
  return {
    subscriptionPrice: DEFAULT_SUBSCRIPTION_PRICE,
    monthlyGrant: DEFAULT_MONTHLY_GRANT,
    coinValue: getCoinValue(),
    businessSharePercent: BUSINESS_SHARE_PERCENT * 100,
    platformSharePercent: PLATFORM_SHARE_PERCENT * 100,
    businessSharePerCoin: getBusinessSharePerCoin()
  };
}
