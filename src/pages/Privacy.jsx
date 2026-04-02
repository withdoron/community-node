import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back — goes to where the user came from, falls back to Home */}
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('Home'))}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-foreground-soft leading-relaxed">
          {/* 1. Overview */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
            <p>
              LocalLane is built for community, not for ads. We collect only what we need to
              operate the platform and we never sell your data to third parties. LocalLane
              includes an AI companion called Mylane that helps you organize your community
              life. Mylane is artificial intelligence — not a human. This policy explains what
              we collect, why, and how it's protected.
            </p>
          </section>

          {/* 2. What We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. What We Collect</h2>
            <p className="mb-3">
              <span className="text-foreground font-medium">Account information:</span> Name, email
              address, and optionally phone number and home community preference. This is provided
              by you during registration and in your account settings.
            </p>
            <p className="mb-3">
              <span className="text-foreground font-medium">Activity data:</span> Events you RSVP to,
              businesses you recommend, and your interactions with the platform. This powers your
              personalized experience and community recommendations.
            </p>
            <p className="mb-3">
              <span className="text-foreground font-medium">Conversation data:</span> When you talk to
              Mylane, your conversations are stored in your account to provide personalized
              assistance. Mylane remembers what you've discussed to serve you better across
              sessions.
            </p>
            <p className="mb-3">
              <span className="text-foreground font-medium">Interaction patterns:</span> How you navigate
              the app — which spaces you visit, how often, what you tap — helps the platform adapt
              to your preferences. This powers features like card dimming, discovery suggestions, and
              how Mylane adjusts to your style.
            </p>
            <p className="mb-3">
              <span className="text-foreground font-medium">Team and family data:</span> If you join a
              team workspace, your role (coach, parent, player), roster information, and parent-player
              links are stored. Parents may create and manage accounts on behalf of minor children.
            </p>
            <p className="mb-3">
              <span className="text-foreground font-medium">Financial data:</span> If you use the finance
              workspace, personal transaction records (amounts, vendors, categories, dates) are stored
              in your account. This data is never shared with other users or third parties.
            </p>
            <p className="mb-3">
              <span className="text-foreground font-medium">Business information:</span> If you register
              a business, we collect your business name, description, category, contact details, and
              location. Business profiles are publicly visible on the platform.
            </p>
            <p>
              <span className="text-foreground font-medium">Payment data:</span> When payment features
              are active, payment processing is handled entirely by Stripe. LocalLane does not
              store credit card numbers, bank account details, or other sensitive financial
              information on our servers. See{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover transition-colors"
              >
                Stripe's Privacy Policy
              </a>{' '}
              for how they handle payment data.
            </p>
          </section>

          {/* 3. How We Use Your Data */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Data</h2>
            <p className="mb-3">
              We use your information to operate the platform: showing you relevant events,
              powering recommendations, connecting you with local businesses, and managing your
              account. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Powering your Mylane companion — personalized responses, workspace awareness, continuity across conversations</li>
              <li>Adapting the interface to your usage patterns — spaces dim when unused, brighten when active, and discovery suggestions appear based on your relationships</li>
              <li>Showing you what's relevant based on your connections — parent-player links, team membership, workspace activity</li>
              <li>Sending transactional emails (account confirmations, subscription changes) and, with your consent, occasional community updates</li>
            </ul>
          </section>

          {/* 4. What We Don't Do */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. What We Don't Do</h2>
            <p>
              We do not sell, rent, or share your personal information with advertisers or data
              brokers. We do not serve ads. We do not track you across other websites. We do not
              use your data to build advertising profiles. We do not use your conversations with
              Mylane to train AI models — your conversations are yours. LocalLane's revenue comes
              from business subscriptions and community memberships, not from monetizing your data.
            </p>
          </section>

          {/* 5. AI Companion (Mylane) */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. AI Companion (Mylane)</h2>
            <p className="mb-3">
              Mylane is an AI assistant powered by artificial intelligence. She is not a human.
              Mylane clearly identifies herself as AI in all interactions.
            </p>
            <p className="mb-3">
              Mylane conversations are stored per user account to provide continuity and
              personalization. Mylane may suggest actions (creating events, categorizing
              transactions, connecting you with resources) but always asks for your confirmation
              before making changes to your data.
            </p>
            <p>
              Mylane does not make autonomous decisions about your data without your approval.
              You can delete your conversation history at any time through the chat interface.
            </p>
          </section>

          {/* 6. Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Children's Privacy</h2>
            <p className="mb-3">
              LocalLane serves families, including children as young as 10 through team
              workspaces. Children's accounts are created and managed by their parents. Parents
              oversee their child's participation and can access their child's data at any time.
            </p>
            <p className="mb-3">
              We collect minimal data from minor users: name, team role, and participation data.
              Mylane clearly identifies itself as AI, not a human, in all interactions with users
              of any age.
            </p>
            <p>
              We do not serve ads to minors, track minors across other sites, or sell their data.
              Parents can request deletion of their child's data at any time by contacting{' '}
              <a href="mailto:support@locallane.app" className="text-primary hover:text-primary-hover transition-colors">
                support@locallane.app
              </a>.
            </p>
          </section>

          {/* 7. Data Storage */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Storage and Security</h2>
            <p>
              Your data is stored securely through our infrastructure provider. We use
              authentication, access controls, and encryption to protect your information.
              Workspace data is scoped to your account — other users cannot access your
              financial records, private conversations, or personal workspace data. While
              no system is perfectly secure, we take reasonable measures to safeguard your data.
            </p>
          </section>

          {/* 8. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
            <p>
              You can view and update your personal information through your account settings at
              any time. You can delete your Mylane conversation history through the chat interface.
              If you'd like to delete your account and all associated data, contact us at{' '}
              <a href="mailto:support@locallane.app" className="text-primary hover:text-primary-hover transition-colors">
                support@locallane.app
              </a>{' '}
              and we'll process your request promptly.
            </p>
          </section>

          {/* 9. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Third-Party Services</h2>
            <p>
              LocalLane uses third-party services to operate. These include our hosting and
              authentication provider (Base44), payment processor (Stripe), and AI provider
              (Anthropic, which powers Mylane). Each has their own privacy policies governing
              how they handle data. We only share with these services what is necessary to
              provide the platform to you.
            </p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this policy as the platform evolves. Material changes will be
              communicated through the platform or via email. Continued use of LocalLane
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact</h2>
            <p>
              Privacy questions? Reach us at{' '}
              <a href="mailto:support@locallane.app" className="text-primary hover:text-primary-hover transition-colors">
                support@locallane.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
