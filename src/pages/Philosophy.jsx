import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Philosophy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back — goes to where the user came from, falls back to Home */}
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('Home'))}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-white mb-10">Why LocalLane exists</h1>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <p className="text-lg">How much is an hour of your time worth?</p>
          </section>

          <section>
            <p>
              LocalLane makes people more efficient so they can focus on what matters most.
              A coach who spends less time texting parents. A parent who never has to ask
              "when's practice?" A contractor who generates an estimate in minutes, not hours.
            </p>
          </section>

          <section>
            <p>
              Most platforms make money by selling your attention. We make money by being useful.
            </p>
          </section>

          <section>
            <p>
              No ads. No algorithms deciding what you see. No data sold to anyone, ever.
              Your information is yours.
            </p>
          </section>

          <section>
            <p>
              We built LocalLane because we believe technology should strengthen communities,
              not extract from them. When you support a local business, join a team, or connect
              with a neighbor — that value circulates. It stays in your community.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How we sustain this</h2>
            <p className="mb-4">
              The platform is free to explore. When you want Mylane, our AI companion, to do
              real work for you — schedule your team's season, import your finances, manage
              your properties — that's where we earn our keep. You see exactly what it costs
              before you commit. No surprises. No hidden fees.
            </p>
            <p>
              We call this "circulation over extraction." The money that flows through
              LocalLane stays in your community. We take only what we need to keep the
              organism alive and growing.
            </p>
          </section>

          <section className="pt-4">
            <p
              className="text-amber-400 text-lg font-medium"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Built by your community. Built for your community.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
