import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          to={createPageUrl('MyLane')}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* 1. About LocalLane */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. About LocalLane</h2>
            <p>
              LocalLane is a community discovery platform connecting residents with local businesses
              through events, experiences, and membership programs in Eugene, Oregon. By using
              LocalLane, you agree to these terms.
            </p>
          </section>

          {/* 2. Accounts */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Accounts</h2>
            <p>
              You may browse LocalLane without an account. Creating an account requires a valid email
              address. You are responsible for maintaining the security of your account and for all
              activity that occurs under it. You must be at least 13 years old to create an account.
            </p>
          </section>

          {/* 3. Community Pass Membership */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Community Pass Membership</h2>
            <p className="mb-3">
              Community Pass is an optional paid membership that provides access to participating
              local businesses. By subscribing, you acknowledge and agree to the following:
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">Nature of product:</span> Community Pass
              punches are access rights to participate in offerings at participating businesses. They
              are not money, stored value, credits, or a payment instrument.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">No cash value:</span> Punches have no cash
              or set monetary value. They cannot be exchanged for money, refunded, or applied toward
              purchases.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">Ownership of fees:</span> Membership fees
              become LocalLane's revenue upon receipt. LocalLane is not holding funds on behalf of
              members or businesses.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">No business entitlement:</span> Participating
              businesses have no claim to specific member funds. Business payments are discretionary
              revenue shares from LocalLane's operating income.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">Expiration and non-transferability:</span>{' '}
              Punches are non-transferable, expire at the end of each billing cycle, and do not roll
              over except as specified in the membership tier description.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">Prohibited uses:</span> Members may not
              transfer, sell, gift, cash out, or redeem punches for monetary value. Peer-to-peer
              transfer of punches is not permitted.
            </p>
            <p>
              <span className="text-white font-medium">Regulatory statement:</span> LocalLane is
              not a money transmitter, payment processor, or provider/seller of prepaid access.
              LocalLane does not hold, transmit, or process payments on behalf of members or
              businesses.
            </p>
          </section>

          {/* 4. Auto-Renewal */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Auto-Renewal and Cancellation</h2>
            <p className="mb-3">
              Community Pass memberships and business tier subscriptions renew automatically at the
              end of each billing cycle unless cancelled. You will be charged the then-current rate
              for your plan.
            </p>
            <p className="mb-3">
              You may cancel your subscription at any time through your account settings or by
              contacting support. Cancellation takes effect at the end of your current billing
              period. No refunds are issued for partial billing periods.
            </p>
            <p>
              You will receive a confirmation email when your subscription is created and when
              any changes are made to your billing.
            </p>
          </section>

          {/* 5. Business Tiers */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Business Subscriptions</h2>
            <p className="mb-3">
              Businesses subscribe to LocalLane for platform access, event management, and community
              visibility. Business tier subscriptions are independent of Community Pass activity.
            </p>
            <p>
              Businesses participating in the Community Pass network receive revenue shares
              calculated from aggregate usage data. Revenue shares are discretionary and paid from
              LocalLane's operating income, not from member-specific funds.
            </p>
          </section>

          {/* 6. Direct Purchases */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Direct Purchases</h2>
            <p>
              Users may purchase directly from businesses through LocalLane. These transactions are
              processed by Stripe on behalf of the business. LocalLane does not take a commission on
              direct purchases and does not handle, hold, or transmit funds for these transactions.
            </p>
          </section>

          {/* 7. User Content */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. User Content and Recommendations</h2>
            <p className="mb-3">
              You may submit recommendations, stories, vouches, and other content. You retain
              ownership of your content but grant LocalLane a license to display it on the platform.
            </p>
            <p>
              Content must be honest and based on genuine experience. LocalLane reserves the right
              to remove content that violates community standards, is fraudulent, or is abusive.
              Private concerns are routed to platform administrators and are never displayed publicly.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>
              LocalLane is a discovery and connection platform. We do not guarantee the quality,
              safety, or availability of any business, event, or experience listed on the platform.
              Interactions with businesses are between you and the business. LocalLane is not
              responsible for disputes, injuries, or damages arising from those interactions.
            </p>
          </section>

          {/* 9. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. Material changes will be communicated
              through the platform or via email. Continued use of LocalLane after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p>
              Questions about these terms? Reach us at{' '}
              <a href="mailto:support@locallane.org" className="text-amber-500 hover:text-amber-400 transition-colors">
                support@locallane.org
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
