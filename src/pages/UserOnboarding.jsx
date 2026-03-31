import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, User, Users } from 'lucide-react';
import { userOnboardingConfig } from '@/config/userOnboardingConfig';
import { useConfig } from '@/hooks/useConfig';

/** Fallback taglines when admin config doesn't provide them. */
const NETWORK_TAGLINES = {
  recess: 'Move your body, build your crew',
  harvest: 'Know your farmer, feed your family',
  creative_alliance: 'Learn together, grow together',
  gathering_circle: 'Show up for each other',
};

/** Philosophy statements for Step 2. */
const VALUES = [
  {
    title: 'No ads. No algorithms.',
    description: 'Businesses earn visibility through community, not ad spend.',
  },
  {
    title: 'Built by neighbors.',
    description: 'Features come from real conversations with real people.',
  },
  {
    title: 'Your money stays local.',
    description: 'Circulation over extraction. Support the people who live where you live.',
  },
];

const activeSteps = userOnboardingConfig.steps.filter((s) => s.active);

// ─── Simplified Mycelium Background ─────────────────────────────────
function MyceliumBackground() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isMobile = window.innerWidth < 768;
    const NODE_COUNT = isMobile ? 12 : 20;
    const CONNECTION_DIST = 120;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function createNodes() {
      nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 1 + Math.random() * 1,
      }));
    }

    function draw(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;
      const sineVal = Math.sin(time / 4000) * 0.5 + 0.5;

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.25 * (0.5 + sineVal * 0.5);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(212, 160, 70, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 160, 70, ${0.2 + sineVal * 0.15})`;
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
      style={{ opacity: 0.25 }}
    />
  );
}

// ─── Progress Dots ──────────────────────────────────────────────────
function ProgressDots({ stepIndex, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2.5 pt-6 pb-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i <= stepIndex ? 'bg-amber-500' : 'border border-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function UserOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [networkInterests, setNetworkInterests] = useState([]);
  const [workspaceSelection, setWorkspaceSelection] = useState(new Set());

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const networks = useMemo(
    () => Array.isArray(networksConfig) ? networksConfig.filter((n) => n.active !== false) : [],
    [networksConfig]
  );

  const updateUserMutation = useMutation({
    mutationFn: async (payload) => {
      if (!currentUser?.id) throw new Error('No user');
      const data = {
        onboarding_complete: payload.onboarding_complete,
        network_interests: payload.network_interests ?? [],
      };
      if (payload.full_name != null && payload.full_name.trim() !== '') {
        data.full_name = payload.full_name.trim();
      }
      if (payload.display_name != null && payload.display_name.trim() !== '') {
        data.display_name = payload.display_name.trim();
      }
      try {
        await base44.functions.invoke('updateUser', {
          action: 'update_onboarding',
          data,
        });
      } catch (err) {
        // Server function failed — try direct entity update as fallback
        console.warn('updateUser server function failed, trying direct update:', err?.message);
        await base44.entities.User.update(currentUser.id, data);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['currentUser'], (old) => {
        if (!old) return old;
        return { ...old, onboarding_complete: true };
      });
      queryClient.invalidateQueries(['currentUser']);
    },
    onError: () => {
      // Even if both paths fail, optimistically set the cache so user isn't stuck in a loop
      queryClient.setQueryData(['currentUser'], (old) => {
        if (!old) return old;
        return { ...old, onboarding_complete: true };
      });
    },
  });

  const handleNext = () => {
    window.scrollTo(0, 0);
    setStepIndex((prev) => prev + 1);
  };

  const handleFinish = () => {
    // Family only → BusinessDashboard (NOTE: route will be renamed to Workspaces, separate task)
    // Community, both, or neither → MyLane (community first is default)
    const familyOnly = workspaceSelection.has('family') && !workspaceSelection.has('community');
    const targetPage = familyOnly ? 'BusinessDashboard' : 'MyLane';

    updateUserMutation.mutate(
      {
        onboarding_complete: true,
        network_interests: networkInterests,
        full_name: displayName.trim() || undefined,
        display_name: displayName.trim() || undefined,
      },
      {
        onSettled: () => {
          window.scrollTo(0, 0);
          navigate(createPageUrl(targetPage));
        },
      }
    );
  };

  const toggleNetwork = (value) => {
    setNetworkInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleWorkspace = (value) => {
    setWorkspaceSelection((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const currentStepId = activeSteps[stepIndex]?.id;

  if (userLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Mycelium background — welcome step only */}
      {currentStepId === 'welcome' && <MyceliumBackground />}

      <div className="relative z-10">
        <ProgressDots stepIndex={stepIndex} totalSteps={activeSteps.length} />

        {/* ── Step 1: Welcome ── */}
        {currentStepId === 'welcome' && (
          <div
            className="max-w-md mx-auto px-4 flex flex-col justify-center"
            style={{ minHeight: 'calc(100vh - 48px)' }}
          >
            <div className="space-y-8 -mt-8">
              <div className="text-center">
                <h1
                  className="text-2xl font-bold text-slate-100"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Welcome. You just became part of something.
                </h1>
                <p className="text-slate-400 mt-3 text-base">
                  This is Local Lane — a community built by the people who use it.
                </p>
              </div>

              <div className="text-left">
                <label className="block text-sm text-slate-300 mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-base transition-colors"
                  autoComplete="given-name"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleNext}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-xl transition-colors"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1 inline" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: How We Work ── */}
        {currentStepId === 'how_it_works' && (
          <div className="max-w-md mx-auto px-4 py-8 space-y-8">
            <h2
              className="text-2xl font-bold text-slate-100"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              How Local Lane works
            </h2>

            <div className="space-y-6">
              {VALUES.map((v, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-500 text-sm">{v.title}</p>
                    <p className="text-slate-500 text-sm mt-0.5">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={handleNext}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-xl transition-colors"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1 inline" />
              </Button>
              <button
                type="button"
                onClick={handleNext}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-400 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Interests ── */}
        {currentStepId === 'interests' && (
          <div className="max-w-md mx-auto px-4 py-8 space-y-6">
            <div>
              <h2
                className="text-2xl font-bold text-slate-100"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                What do you care about?
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Follow what resonates. You can always change this later.
              </p>
            </div>

            {networks.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">
                No networks available right now. You can add interests later.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {networks.map((net) => {
                  const value = net.value ?? net.slug ?? net.id;
                  const label = net.label ?? net.name ?? value;
                  const tagline = net.tagline || NETWORK_TAGLINES[value];
                  const isSelected = networkInterests.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleNetwork(value)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/5'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <p className="font-semibold text-slate-100 text-sm">{label}</p>
                      {tagline && (
                        <p className="text-slate-500 text-xs mt-1">{tagline}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                onClick={handleNext}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-xl transition-colors"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1 inline" />
              </Button>
              <button
                type="button"
                onClick={handleNext}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-400 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Workspaces ── */}
        {currentStepId === 'workspaces' && (
          <div className="max-w-md mx-auto px-4 py-8 space-y-6">
            <div>
              <h2
                className="text-2xl font-bold text-slate-100"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Two ways to grow
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Local Lane gives you tools for your family and your community.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* For Your Family */}
              <button
                type="button"
                onClick={() => toggleWorkspace('family')}
                className={`text-left p-6 rounded-2xl border transition-colors ${
                  workspaceSelection.has('family')
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-slate-800/50 bg-slate-900/50 hover:border-amber-500/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <User className="w-5 h-5 text-amber-500" />
                </div>
                <h3
                  className="font-bold text-slate-100 mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  For Your Family
                </h3>
                <p className="text-slate-500 text-xs mb-3">
                  Teams, playbooks, schedules, and family tools.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Teams', 'Playbook Pro', 'Schedule'].map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>

              {/* For Your Community */}
              <button
                type="button"
                onClick={() => toggleWorkspace('community')}
                className={`text-left p-6 rounded-2xl border transition-colors ${
                  workspaceSelection.has('community')
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-slate-800/50 bg-slate-900/50 hover:border-amber-500/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <h3
                  className="font-bold text-slate-100 mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  For Your Community
                </h3>
                <p className="text-slate-500 text-xs mb-3">
                  Local businesses, events, and neighborhood networks.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Directory', 'Events', 'Networks'].map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleFinish}
                disabled={updateUserMutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-xl transition-colors"
              >
                {updateUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  <>
                    Let&apos;s go
                    <ChevronRight className="h-4 w-4 ml-1 inline" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
