import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import { filterListedBusinesses } from '@/utils/directoryVisibility';
import { ChevronDown } from 'lucide-react';

// ─── CSS Animations (injected once) ─────────────────────────────────
const ANIMATION_STYLES = `
@keyframes emberGlow {
  0%, 100% {
    text-shadow: 0 0 40px rgba(212, 160, 70, 0.15), 0 0 80px rgba(212, 160, 70, 0.05), 0 0 120px rgba(212, 160, 70, 0.02);
  }
  50% {
    text-shadow: 0 0 60px rgba(212, 160, 70, 0.45), 0 0 120px rgba(212, 160, 70, 0.18), 0 0 200px rgba(212, 160, 70, 0.07);
  }
}
@keyframes floatUp {
  0% { opacity: 0; transform: translateY(0); }
  15% { opacity: 0.15; }
  85% { opacity: 0.15; }
  100% { opacity: 0; transform: translateY(-700px); }
}
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.2; }
  75%, 100% { transform: scale(2.5); opacity: 0; }
}
@keyframes glowBreathe {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 0.35; }
  50% { transform: translateY(6px); opacity: 0.65; }
}
`;

// ─── Constants ──────────────────────────────────────────────────────
const COMPLETIONS = [
  'a better neighbor.',
  'part of something alive.',
  'the reason they show up.',
  'connected.',
  'known.',
  'the coach they need.',
  'rooted.',
  'part of something real.',
];

const SPORE_COUNT = 7;

// ─── Floating Spores ────────────────────────────────────────────────
function FloatingSpores() {
  const spores = useMemo(() =>
    Array.from({ length: SPORE_COUNT }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      size: 1.5 + Math.random() * 2,
      delay: Math.random() * 14,
      duration: 12 + Math.random() * 8,
    })), []);

  return (
    <>
      {spores.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: s.left,
            bottom: '-10px',
            width: s.size,
            height: s.size,
            backgroundColor: 'rgba(212, 160, 70, 0.12)',
            animation: `floatUp ${s.duration}s ${s.delay}s infinite linear`,
            opacity: 0,
          }}
        />
      ))}
    </>
  );
}

// ─── Rotating Completions ───────────────────────────────────────────
function RotatingCompletions() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % COMPLETIONS.length);
        setVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-10 md:h-14 flex items-center justify-center overflow-hidden">
      <p
        className="text-lg md:text-3xl text-foreground-soft transition-all duration-500 ease-out"
        style={{
          fontWeight: 300,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
        }}
      >
        {COMPLETIONS[index]}
      </p>
    </div>
  );
}

// ─── Organism Pulse Divider ─────────────────────────────────────────
function PulseDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-12">
      <div className="flex-1 max-w-[120px] h-px bg-gradient-to-r from-transparent to-amber-500/20" />
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-primary/40" />
        <div
          className="absolute inset-0 w-2 h-2 rounded-full bg-primary/20"
          style={{ animation: 'ping-slow 2s cubic-bezier(0,0,0.2,1) infinite' }}
        />
      </div>
      <div className="flex-1 max-w-[120px] h-px bg-gradient-to-l from-transparent to-amber-500/20" />
    </div>
  );
}

// ─── What's Alive Card ──────────────────────────────────────────────
function AliveCard({ dotColor, type, title, detail }) {
  return (
    <div className="bg-card/40 border border-border/40 rounded-xl p-5 hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
        <span className="text-xs text-muted-foreground/70 uppercase tracking-wider">{type}</span>
      </div>
      <h4 className="text-foreground font-semibold text-sm mb-1">{title}</h4>
      <p className="text-muted-foreground/70 text-xs">{detail}</p>
    </div>
  );
}

// ─── Main Homepage ──────────────────────────────────────────────────
export default function Home() {
  const { region } = useActiveRegion();

  // Auth state — determines hero height and floating logo
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });
  const isUnauth = currentUser === null; // explicitly not authenticated (not loading)

  // Real data: upcoming events — region-filtered
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['homepage-upcoming-events', region?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const events = await base44.entities.Event.filter(
        { is_active: true },
        'date',
        20
      );
      const regional = filterBusinessesByRegion(events, region);
      return regional
        .filter((e) => e.date >= now && !e.network_only && e.status !== 'cancelled')
        .slice(0, 3);
    },
    enabled: !!region,
    staleTime: 10 * 60 * 1000,
  });

  // Real data: recent businesses (homepage teaser)
  const { data: recentBusinesses = [] } = useQuery({
    queryKey: ['homepage-recent-businesses', region?.id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter(
        { is_active: true },
        '-created_date',
        10
      );
      return filterBusinessesByRegion(filterListedBusinesses(businesses), region).slice(0, 3);
    },
    enabled: !!region,
    staleTime: 10 * 60 * 1000,
  });

  // Real data: community pulse
  const { data: communityCount = 0 } = useQuery({
    queryKey: ['homepage-community-pulse'],
    queryFn: async () => {
      try {
        const [teams, members] = await Promise.all([
          base44.entities.Team.filter({ status: 'active' }),
          base44.entities.TeamMember.filter({ status: 'active' }),
        ]);
        const teamCount = Array.isArray(teams) ? teams.length : 0;
        const memberCount = Array.isArray(members) ? members.length : 0;
        return teamCount + memberCount;
      } catch { return 0; }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build "What's alive" cards from real data
  const aliveCards = useMemo(() => {
    const cards = [];

    if (upcomingEvents.length > 0) {
      const e = upcomingEvents[0];
      const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
      cards.push({
        dotColor: 'bg-emerald-400',
        type: 'Event',
        title: e.title || 'Community Event',
        detail: dateStr + (e.location_name ? ` · ${e.location_name}` : ''),
      });
    }

    if (recentBusinesses.length > 0) {
      const b = recentBusinesses[0];
      cards.push({
        dotColor: 'bg-primary-hover',
        type: 'Business',
        title: b.name || 'Local Business',
        detail: b.category || 'Community business',
      });
    }

    if (communityCount > 0) {
      cards.push({
        dotColor: 'bg-primary-hover/60',
        type: 'Community',
        title: 'People connected',
        detail: 'Teams, families, neighbors — near you',
      });
    } else if (upcomingEvents.length > 1) {
      const e = upcomingEvents[1];
      const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
      cards.push({
        dotColor: 'bg-emerald-400',
        type: 'Event',
        title: e.title || 'Community Event',
        detail: dateStr + (e.location_name ? ` · ${e.location_name}` : ''),
      });
    }

    if (cards.length === 0) {
      cards.push(
        { dotColor: 'bg-emerald-400', type: 'Event', title: 'Community events coming soon', detail: 'Something is growing' },
        { dotColor: 'bg-primary-hover', type: 'Business', title: 'Local businesses joining', detail: 'The garden is opening' },
        { dotColor: 'bg-primary-hover/60', type: 'Community', title: 'People connecting', detail: 'Real neighbors, near you' },
      );
    }

    while (cards.length < 3) {
      cards.push({
        dotColor: 'bg-primary-hover/60',
        type: 'Community',
        title: 'Something is growing',
        detail: 'Real people, near you',
      });
    }

    return cards;
  }, [upcomingEvents, recentBusinesses, communityCount]);

  // Hero height: full viewport when unauth (no nav header), minus 64px header when auth
  const heroHeight = isUnauth ? '100vh' : 'calc(100vh - 64px)';

  return (
    <div className="min-h-screen bg-background">
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-start justify-start overflow-hidden bg-background"
        style={{ height: heroHeight, minHeight: heroHeight }}
      >
        {/* Mushroom artwork — responsive via <picture> */}
        <div className="absolute inset-0 w-full h-full">
          <picture>
            {/* Portrait crop for mobile — shows mushroom centered */}
            <source media="(max-width: 767px)" srcSet="/mushroom-portrait.jpg" type="image/jpeg" />
            {/* Landscape for tablet/desktop */}
            <source media="(min-width: 768px)" srcSet="/mushroom-landscape.jpg" type="image/jpeg" />
            <img
              src="/mushroom-landscape.jpg"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-center"
            />
          </picture>

          {/* Dark base overlay — readability */}
          <div className="absolute inset-0 bg-background/40" />

          {/* Amber radial glow — breathes over the cap, 4s cycle */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 35%, rgba(212,160,70,0.12) 0%, transparent 60%)',
              animation: 'glowBreathe 4s ease-in-out infinite',
            }}
          />
        </div>

        {/* Floating spores */}
        <FloatingSpores />

        {/* Text content — "Become" floats in the dark sky above the cap.
            For unauthenticated visitors, the entire block is the door.
            One tap on "Become" and you enter. */}
        <div
          className={`relative z-10 w-full flex flex-col items-center text-center px-4 group ${isUnauth ? 'cursor-pointer select-none' : ''}`}
          style={{ paddingTop: '10vh' }}
          onClick={isUnauth ? () => base44.auth.redirectToLogin() : undefined}
          role={isUnauth ? 'button' : undefined}
          aria-label={isUnauth ? 'Sign in to LocalLane' : undefined}
        >
          {/* Become */}
          <h1
            className="text-5xl md:text-8xl lg:text-9xl font-bold text-primary-hover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-125"
            style={{
              fontFamily: 'Georgia, serif',
              letterSpacing: '-0.02em',
              animation: 'emberGlow 4s ease-in-out infinite',
            }}
          >
            Become
          </h1>

          {/* Rotating completions */}
          <div className="mt-4 transition-opacity duration-500 group-hover:opacity-80">
            <RotatingCompletions />
          </div>
        </div>

        {/* Scroll indicator — bottom center */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          style={{ animation: 'scrollBounce 2.4s ease-in-out infinite' }}
        >
          <ChevronDown className="h-6 w-6 text-primary-hover/50" />
        </div>
      </section>

      {/* ── Organism Pulse Divider ── */}
      <PulseDivider />

      {/* ── What's alive this week ── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Georgia, serif' }}>
            What's alive this week
          </h2>
          <p className="text-muted-foreground/70 text-sm mt-1">Real things. Real people. Near you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aliveCards.map((card, i) => (
            <AliveCard key={i} {...card} />
          ))}
        </div>
      </section>

      {/* ── Values (compressed) ── */}
      <section className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground/70 text-sm leading-relaxed">
          <span className="text-primary-hover/80">No ads.</span> Your ideas shape this. <span className="text-primary-hover/80">Money stays local.</span>
        </p>
      </section>

      {/* Layout Footer (with newsletter) renders below via LayoutWrapper */}
    </div>
  );
}
