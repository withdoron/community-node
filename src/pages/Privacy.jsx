import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* 1. Overview */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Overview</h2>
            <p>
              LocalLane is built for community, not for ads. We collect only what we need to
              operate the platform and we never sell your data to third parties. This policy
              explains what we collect, why, and how it's protected.
            </p>
          </section>

          {/* 2. What We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. What We Collect</h2>
            <p className="mb-3">
              <span className="text-white font-medium">Account information:</span> Name, email
              address, and optionally phone number and home community preference. This is provided
              by you during registration and in your account settings.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">Activity data:</span> Events you RSVP to,
              businesses you recommend, and your interactions with the platform. This powers your
              personalized MyLane experience and community recommendations.
            </p>
            <p className="mb-3">
              <span className="text-white font-medium">Business information:</span> If you register
              a business, we collect your business name, description, category, contact details, and
              location. Business profiles are publicly visible on the platform.
            </p>
            <p>
              <span className="text-white font-medium">Payment data:</span> When payment features
              are active, payment processing is handled entirely by Stripe. LocalLane does not
              store credit card numbers, bank account details, or other sensitive financial
              information on our servers, and we do not have access to your full payment card or
              bank account number. We may retain information about your subscription or purchase
              (such as plan type or transaction date) but not your payment method details. See{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 transition-colors"
              >
                Stripe's Privacy Policy
              </a>{' '}
              for how they handle payment data. For businesses that receive payments through the
              platform, we may collect tax identification information (e.g. EIN) as required for
              tax reporting; payment processing and card/bank data remain with Stripe.
            </p>
          </section>

          {/* 3. How We Use Your Data */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Data</h2>
            <p>
              We use your information to operate the platform: showing you relevant events,
              powering recommendations, connecting you with local businesses, and managing your
              account. We may send you transactional emails (account confirmations, subscription
              changes) and, with your consent, occasional community updates.
            </p>
          </section>

          {/* 4. What We Don't Do */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. What We Don't Do</h2>
            <p>
              We do not sell, rent, or share your personal information with advertisers or data
              brokers. We do not serve ads. We do not track you across other websites. We do not
              use your data to build advertising profiles. LocalLane's revenue comes from business
              subscriptions and Community Pass memberships, not from monetizing your data.
            </p>
          </section>

          {/* 5. Data Storage */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Storage and Security</h2>
            <p>
              Your data is stored securely through our infrastructure provider. We use
              authentication, access controls, and encryption to protect your information. While
              no system is perfectly secure, we take reasonable measures to safeguard your data.
            </p>
          </section>

          {/* 6. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>
              You can view and update your personal information through your account settings at
              any time. If you'd like to delete your account and associated data, contact us at{' '}
              <a href="mailto:support@locallane.org" className="text-amber-500 hover:text-amber-400 transition-colors">
                support@locallane.org
              </a>{' '}
              and we'll process your request promptly.
            </p>
          </section>

          {/* 7. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Services</h2>
            <p>
              LocalLane uses third-party services to operate. These include our hosting and
              authentication provider (Base44) and payment processor (Stripe). Each has their
              own privacy policies governing how they handle data. We only share with these
              services what is necessary to provide the platform to you.
            </p>
          </section>

          {/* 8. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this policy as the platform evolves. Material changes will be
              communicated through the platform or via email. Continued use of LocalLane
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 9. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact</h2>
            <p>
              Privacy questions? Reach us at{' '}
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
