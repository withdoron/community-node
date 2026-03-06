import React, { useEffect, useRef, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';

// ─── CSS Animations (injected once) ─────────────────────────────────
const ANIMATION_STYLES = `
@keyframes emberGlow {
  0%, 100% {
    text-shadow: 0 0 30px rgba(212, 160, 70, 0.1), 0 0 60px rgba(212, 160, 70, 0.03);
  }
  50% {
    text-shadow: 0 0 50px rgba(212, 160, 70, 0.2), 0 0 100px rgba(212, 160, 70, 0.06);
  }
}
@keyframes floatUp {
  0% { opacity: 0; transform: translateY(0); }
  15% { opacity: 0.15; }
  85% { opacity: 0.15; }
  100% { opacity: 0; transform: translateY(-700px); }
}
@keyframes scrollDot {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(8px); opacity: 0.8; }
}
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.2; }
  75%, 100% { transform: scale(2.5); opacity: 0; }
}
`;

// ─── Constants ──────────────────────────────────────────────────────
const COMPLETIONS = [
  'a better neighbor.',
  'a creator.',
  'game ready.',
  'part of something real.',
  'the coach they need.',
  'connected.',
  'known.',
  'the reason they show up.',
];

const SPORE_COUNT = 7;

// ─── Mycelium Canvas ───────────────────────────────────────────────
function MyceliumCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isMobile = window.innerWidth < 768;
    const NODE_COUNT = isMobile ? 20 : 35;
    const CONNECTION_DIST = 140;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function createNodes() {
      nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1.2 + Math.random() * 1.2,
      }));
    }

    function draw(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;
      const sineVal = Math.sin(time / 3000) * 0.5 + 0.5; // 0-1 over ~6s

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.35 * (0.5 + sineVal * 0.5);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(212, 160, 70, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 160, 70, ${0.3 + sineVal * 0.2})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    createNodes();
    animRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      resize();
      createNodes();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.45 }}
    />
  );
}

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
            backgroundColor: 'rgba(212, 160, 70, 0.1)',
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
        className="text-lg md:text-3xl text-slate-300 transition-all duration-500 ease-out"
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

// ─── Scroll Indicator ───────────────────────────────────────────────
function ScrollIndicator() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      <div className="w-5 h-8 rounded-full border border-slate-700/50 flex items-start justify-center pt-1.5">
        <div
          className="w-1 h-1.5 rounded-full bg-slate-500"
          style={{ animation: 'scrollDot 2s ease-in-out infinite' }}
        />
      </div>
    </div>
  );
}

// ─── Organism Pulse Divider ─────────────────────────────────────────
function PulseDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-16">
      <div className="flex-1 max-w-[120px] h-px bg-gradient-to-r from-transparent to-amber-500/20" />
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-amber-500/40" />
        <div
          className="absolute inset-0 w-2 h-2 rounded-full bg-amber-500/20"
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
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-5 hover:border-amber-500/20 transition-colors">
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
        <span className="text-xs text-slate-500 uppercase tracking-wider">{type}</span>
      </div>
      <h4 className="text-slate-200 font-semibold text-sm mb-1">{title}</h4>
      <p className="text-slate-500 text-xs">{detail}</p>
    </div>
  );
}

// ─── Main Homepage ──────────────────────────────────────────────────
export default function Home() {
  const { region } = useActiveRegion();

  // Real data: upcoming events
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['homepage-upcoming-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const events = await base44.entities.Event.filter(
        { is_active: true },
        'date',
        20
      );
      return events
        .filter((e) => e.date >= now && !e.network_only && e.status !== 'cancelled')
        .slice(0, 3);
    },
  });

  // Real data: recent businesses
  const { data: recentBusinesses = [] } = useQuery({
    queryKey: ['homepage-recent-businesses', region?.id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter(
        { is_active: true },
        '-created_date',
        10
      );
      return filterBusinessesByRegion(businesses, region).slice(0, 3);
    },
    enabled: !!region,
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
        dotColor: 'bg-amber-400',
        type: 'Business',
        title: b.name || 'Local Business',
        detail: b.category || 'Community business',
      });
    }

    if (upcomingEvents.length > 1) {
      const e = upcomingEvents[1];
      const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
      cards.push({
        dotColor: 'bg-emerald-400',
        type: 'Event',
        title: e.title || 'Community Event',
        detail: dateStr + (e.location_name ? ` · ${e.location_name}` : ''),
      });
    } else if (recentBusinesses.length > 1) {
      const b = recentBusinesses[1];
      cards.push({
        dotColor: 'bg-amber-400',
        type: 'Business',
        title: b.name || 'Local Business',
        detail: b.category || 'Community business',
      });
    }

    // Fallback placeholders if no real data
    if (cards.length === 0) {
      cards.push(
        { dotColor: 'bg-emerald-400', type: 'Event', title: 'Community events coming soon', detail: 'Eugene / Springfield' },
        { dotColor: 'bg-amber-400', type: 'Business', title: 'Local businesses joining daily', detail: 'Directory growing' },
        { dotColor: 'bg-blue-400', type: 'Network', title: 'Neighborhoods connecting', detail: 'Real people, near you' }
      );
    }

    // Pad to 3 if needed
    while (cards.length < 3) {
      cards.push({
        dotColor: 'bg-blue-400',
        type: 'Network',
        title: 'Community growing',
        detail: 'New neighbors joining',
      });
    }

    return cards;
  }, [upcomingEvents, recentBusinesses]);

  return (
    <div className="min-h-screen bg-slate-950">
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-center overflow-hidden bg-slate-950"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        <MyceliumCanvas />
        <FloatingSpores />

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* Built in Eugene pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/15 bg-amber-500/5 mb-12">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400/80 tracking-wide">Built in Eugene, For Eugene</span>
          </div>

          {/* Become */}
          <h1
            className="text-5xl md:text-8xl lg:text-9xl font-bold text-amber-400"
            style={{
              fontFamily: 'Georgia, serif',
              letterSpacing: '-0.02em',
              animation: 'emberGlow 6s ease-in-out infinite',
            }}
          >
            Become
          </h1>

          {/* Rotating completions */}
          <div className="mt-4">
            <RotatingCompletions />
          </div>

          {/* Supporting text */}
          <p className="mt-12 text-slate-600 text-base max-w-md leading-relaxed">
            Support your neighbors. Organize your family.
            <br />
            Strengthen the community you call home.
          </p>
        </div>

        <ScrollIndicator />
      </section>

      {/* ── Organism Pulse Divider ── */}
      <PulseDivider />

      {/* ── Dual Path Cards ── */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* For Your Family */}
          <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-8 hover:border-amber-500/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              For Your Family
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Build team rosters, run plays from a shared playbook, manage schedules, and track family finances — all in one place.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Teams', 'Playbook Pro', 'Schedule', 'Finance'].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-slate-800/40 text-slate-600 text-xs border border-slate-700/20">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* For Your Community */}
          <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-8 hover:border-amber-500/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              For Your Community
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Discover local businesses, find family-friendly events, join neighborhood networks, and support the people near you.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Directory', 'Events', 'Networks', 'Local Businesses'].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-slate-800/40 text-slate-600 text-xs border border-slate-700/20">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What's alive this week ── */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-100" style={{ fontFamily: 'Georgia, serif' }}>
            What's alive this week
          </h2>
          <p className="text-slate-500 text-sm mt-1">Real things. Real people. Near you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aliveCards.map((card, i) => (
            <AliveCard key={i} {...card} />
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
        <p className="text-slate-300">
          <strong className="text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>No ads. Ever.</strong>
          <span className="text-slate-600"> — Businesses earn trust through community, not ad spend.</span>
        </p>
        <p className="text-slate-300">
          <strong className="text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>Your ideas shape this.</strong>
          <span className="text-slate-600"> — Features come from real conversations with real neighbors.</span>
        </p>
        <p className="text-slate-300">
          <strong className="text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>Money stays local.</strong>
          <span className="text-slate-600"> — Circulation over extraction. Support the people who live where you live.</span>
        </p>
      </section>

      {/* ── How it grows ── */}
      <section className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-xs text-slate-700 tracking-widest uppercase mb-6">How it grows</p>
        <p className="text-slate-400 italic text-lg leading-relaxed">
          "Your neighbor suggested this feature. We built it last week."
        </p>
      </section>

      {/* Layout Footer (with newsletter) renders below via LayoutWrapper */}
    </div>
  );
}
