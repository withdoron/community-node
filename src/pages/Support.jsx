import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Mail, MessageSquare, Clock } from 'lucide-react';

export default function Support() {
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Support</h1>
        <p className="text-muted-foreground text-sm mb-10">We're here to help</p>

        <div className="space-y-8">
          {/* Contact Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Email Us</h2>
                <p className="text-muted-foreground mb-3">
                  For questions, feedback, or issues, reach out anytime.
                </p>
                <a
                  href="mailto:support@locallane.app"
                  className="text-primary hover:text-primary-hover transition-colors font-medium"
                >
                  support@locallane.app
                </a>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Response Time</h2>
                <p className="text-muted-foreground">
                  We're a small team building something meaningful for Eugene. We typically
                  respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Common Questions</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-foreground font-medium mb-1">How do I list my business?</h3>
                    <p className="text-muted-foreground text-sm">
                      Create an account and you'll be guided through setting up your listing.
                      It takes about 5 minutes. During our pilot, listings are free.
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h3 className="text-foreground font-medium mb-1">How do I create an event?</h3>
                    <p className="text-muted-foreground text-sm">
                      Once your business is set up, open your workspace from My Lane and
                      go to the Events tab. You can add details, images, and set pricing.
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h3 className="text-foreground font-medium mb-1">Is LocalLane free?</h3>
                    <p className="text-muted-foreground text-sm">
                      LocalLane is free to explore — browse, discover events, and connect with
                      local businesses. When you want more from the community, transparent
                      pricing grows with you. You always see the cost before you commit.
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h3 className="text-foreground font-medium mb-1">How do I cancel my subscription?</h3>
                    <p className="text-muted-foreground text-sm">
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
