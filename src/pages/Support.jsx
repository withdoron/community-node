import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Mail, MessageSquare, Clock } from 'lucide-react';

export default function Support() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Support</h1>
        <p className="text-slate-400 text-sm mb-10">We're here to help</p>

        <div className="space-y-8">
          {/* Contact Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-800 rounded-lg">
                <Mail className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Email Us</h2>
                <p className="text-slate-400 mb-3">
                  For questions, feedback, or issues, reach out anytime.
                </p>
                <a
                  href="mailto:support@locallane.app"
                  className="text-amber-500 hover:text-amber-400 transition-colors font-medium"
                >
                  support@locallane.app
                </a>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-800 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Response Time</h2>
                <p className="text-slate-400">
                  We're a small team building something meaningful for Eugene. We typically
                  respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-800 rounded-lg">
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Common Questions</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">How do I list my business?</h3>
                    <p className="text-slate-400 text-sm">
                      Create an account, then use the business onboarding wizard to set up your
                      profile. It takes about 5 minutes. During our pilot, listings are free.
                    </p>
                  </div>
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-white font-medium mb-1">How do I create an event?</h3>
                    <p className="text-slate-400 text-sm">
                      Once your business is set up, go to your Business Dashboard and click
                      "Create Event." You can add details, images, and set pricing options.
                    </p>
                  </div>
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-white font-medium mb-1">Is LocalLane free?</h3>
                    <p className="text-slate-400 text-sm">
                      Browsing, RSVPing to events, and recommending businesses is always free.
                      Business listings are free during our pilot. Community Pass memberships
                      and business tier subscriptions will be available soon.
                    </p>
                  </div>
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-white font-medium mb-1">What is Community Pass?</h3>
                    <p className="text-slate-400 text-sm">
                      Community Pass is a monthly membership that gives you access to
                      participating local businesses through a punch-based system. Think of it
                      like a community access pass, not stored value. Coming soon.
                    </p>
                  </div>
                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-white font-medium mb-1">How do I cancel my subscription?</h3>
                    <p className="text-slate-400 text-sm">
                      You can cancel anytime through your account settings. Cancellation takes
                      effect at the end of your current billing period. You can also email us
                      and we'll handle it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
