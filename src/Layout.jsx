import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { sanitizeText } from '@/utils/sanitize';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Store, User, LogOut, LayoutDashboard, Shield, Calendar, Menu, Sparkles, Settings, MessageSquarePlus, X, Send, Camera, Lightbulb, Bug } from "lucide-react";
import Footer from '@/components/layout/Footer';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';

export default function Layout({ children, currentPageName: currentPageNameProp }) {
  const location = useLocation();
  const currentPageName = currentPageNameProp ?? location.pathname?.replace(/^\//, '').split('?')[0]?.split('/')[0] ?? '';

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const { isAppAdmin } = useRole();

  // Hide feedback button when a workspace superagent is active (agent IS the feedback channel)
  const [agentActive, setAgentActive] = useState(false);
  useEffect(() => {
    const handler = (e) => setAgentActive(!!e.detail);
    window.addEventListener('agent-active', handler);
    return () => window.removeEventListener('agent-active', handler);
  }, []);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [whatHappened, setWhatHappened] = useState('');
  const [whatExpected, setWhatExpected] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const handleFeedbackSubmit = async (e) => {
    e?.preventDefault?.();
    if (!whatHappened?.trim()) return;
    setFeedbackSubmitting(true);
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        const result = await base44.integrations.Core.UploadFile({ file: screenshotFile });
        screenshotUrl = result?.file_url || result?.url || null;
      }
      const payload = {
        user_id: currentUser?.id ?? undefined,
        user_email: currentUser?.email ?? undefined,
        user_role: isAppAdmin ? 'admin' : 'user',
        page_url: window.location.pathname ?? undefined,
        feedback_type: feedbackType,
        what_happened: sanitizeText(whatHappened.trim()),
        what_expected: sanitizeText(whatExpected?.trim()) || undefined,
      };
      if (screenshotUrl) payload.screenshot = screenshotUrl;
      await base44.entities.FeedbackLog.create(payload);
      setWhatHappened('');
      setWhatExpected('');
      setScreenshotFile(null);
      setFeedbackType('feedback');
      setFeedbackOpen(false);
      toast.success('Thanks — we got it! Your feedback helps make Local Lane better.');
    } catch (err) {
      console.error('Feedback submit error:', err);
      toast.error('Could not submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navLinkClass = (page) =>
    currentPageName === page ? 'px-3 py-2 text-primary' : 'px-3 py-2 text-foreground-soft hover:text-primary';

  const sheetLinkClass = (page) =>
    currentPageName === page
      ? 'py-3 px-4 rounded-lg bg-primary/10 text-primary'
      : 'py-3 px-4 rounded-lg text-foreground-soft hover:text-primary hover:bg-secondary';

  const displayName = currentUser?.data?.display_name || currentUser?.full_name || currentUser?.email?.split('@')[0];

  const getUserInitials = () => {
    if (!displayName) return null;
    const parts = displayName.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userInitials = getUserInitials();

  // DEC-117 / Build 2: Hide nav header for unauthenticated visitors on the Home page.
  // Home page handles its own floating logo overlay — the organism invites before gating.
  // DEC-131: MyLane spinner surface has its own complete header — hide the app nav.
  const hideNavHeader = (currentPageName === 'Home' && currentUser === null) || currentPageName === 'MyLane';

  return (
    <div className="min-h-screen bg-background">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes breathe { 0%, 100% { box-shadow: 0 0 0px rgba(212, 160, 70, 0); } 50% { box-shadow: 0 0 10px rgba(212, 160, 70, 0.25); } }` }} />
      {!hideNavHeader && (
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <Link
            to={createPageUrl(currentUser ? 'MyLane' : 'Home')}
            className="group flex items-center gap-3 py-2 -ml-2 pl-2 pr-4 cursor-pointer transition-all rounded-lg"
          >
            <img
              src="/LocalLaneLogo.png"
              alt="Local Lane"
              className="h-9 w-9 rounded-lg object-cover transition-opacity group-hover:opacity-80"
            />
            <span className="font-bold text-foreground text-lg transition-colors group-hover:text-primary">
              Local Lane
            </span>
          </Link>

          {/* Desktop nav — garden gate: Directory, Events, Become/Profile */}
          <nav className="hidden md:flex items-center gap-8 ml-auto">
            <Link to={createPageUrl('Directory')} className={navLinkClass('Directory')}>
              Directory
            </Link>
            <Link to={createPageUrl('Events')} className={navLinkClass('Events')}>
              Events
            </Link>

            {/* Separator */}
            <div className="w-px h-5 bg-surface mx-1" />

            {/* Far right: User area */}
            {!currentUser ? (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-5 py-2 rounded-lg transition-colors"
                style={{
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '0.02em',
                  animation: 'breathe 4s ease-in-out infinite',
                }}
              >
                Become
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-full bg-primary/10 border-2 border-primary/30 hover:border-primary/60 flex items-center justify-center transition-colors cursor-pointer">
                    {userInitials ? (
                      <span className="text-xs font-bold text-primary">{userInitials}</span>
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 bg-card border border-border shadow-xl shadow-black/20 [&>*]:bg-transparent">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground/70">{currentUser.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-secondary" />
                  <DropdownMenuItem asChild className="text-foreground-soft hover:text-primary !bg-transparent hover:!bg-secondary focus:text-primary focus:!bg-secondary cursor-pointer">
                    <Link to={createPageUrl('MyLane')} className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      My Lane
                    </Link>
                  </DropdownMenuItem>
                  {currentUser.role === 'admin' && (
                    <DropdownMenuItem asChild className="text-foreground-soft hover:text-primary !bg-transparent hover:!bg-secondary focus:text-primary focus:!bg-secondary cursor-pointer">
                      <Link to={createPageUrl('Admin')} className="flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="text-foreground-soft hover:text-primary !bg-transparent hover:!bg-secondary focus:text-primary focus:!bg-secondary cursor-pointer">
                    <Link to={createPageUrl('Settings')} className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-secondary" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 !bg-transparent hover:!bg-secondary focus:text-red-300 focus:!bg-secondary cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Mobile: Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {!currentUser ? (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
                style={{
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '0.02em',
                  animation: 'breathe 4s ease-in-out infinite',
                }}
              >
                Become
              </button>
            ) : null}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card border-l border-border p-0 flex flex-col w-full max-w-[280px]">
                <div className="flex flex-col flex-1 overflow-y-auto">
                  <div className="p-4 border-b border-border">
                    <SheetClose asChild>
                      <Link to={createPageUrl(currentUser ? 'MyLane' : 'Home')} className="group flex items-center gap-2">
                        <img
                          src="/LocalLaneLogo.png"
                          alt="Local Lane"
                          className="h-9 w-9 rounded-lg object-cover"
                        />
                        <span className="font-bold text-primary text-lg">Local Lane</span>
                      </Link>
                    </SheetClose>
                  </div>

                  {/* Public garden paths */}
                  <div className="py-4 flex flex-col">
                    <SheetClose asChild>
                      <Link to={createPageUrl('Directory')} className={`flex items-center gap-3 ${sheetLinkClass('Directory')}`}>
                        <Store className="h-5 w-5 flex-shrink-0" />
                        Directory
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to={createPageUrl('Events')} className={`flex items-center gap-3 ${sheetLinkClass('Events')}`}>
                        <Calendar className="h-5 w-5 flex-shrink-0" />
                        Events
                      </Link>
                    </SheetClose>
                  </div>

                  {/* Authenticated: My Lane + admin */}
                  {currentUser && (
                    <>
                      <div className="border-t border-border my-2" />
                      <div className="flex flex-col gap-1 px-4 py-2">
                        <SheetClose asChild>
                          <Link to={createPageUrl('MyLane')} className={`flex items-center gap-3 ${sheetLinkClass('MyLane')}`}>
                            <Sparkles className="h-5 w-5 flex-shrink-0" />
                            My Lane
                          </Link>
                        </SheetClose>
                        {currentUser.role === 'admin' && (
                          <SheetClose asChild>
                            <Link to={createPageUrl('Admin')} className={`flex items-center gap-3 ${sheetLinkClass('Admin')}`}>
                              <Shield className="h-5 w-5 flex-shrink-0" />
                              Admin Panel
                            </Link>
                          </SheetClose>
                        )}
                        <SheetClose asChild>
                          <Link to={createPageUrl('Settings')} className={`flex items-center gap-3 ${sheetLinkClass('Settings')}`}>
                            <Settings className="h-5 w-5 flex-shrink-0" />
                            Settings
                          </Link>
                        </SheetClose>
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom: User info or Become CTA */}
                <div className="mt-auto p-4 border-t border-border">
                  {currentUser ? (
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{currentUser.email}</p>
                      <button
                        onClick={handleLogout}
                        className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Join the community. Support your neighbors.
                      </p>
                      <Button
                        className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
                        onClick={() => base44.auth.redirectToLogin()}
                        style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.02em' }}
                      >
                        Become
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      )} {/* end !isPublicHome header */}

      <main>{children}</main>

      {/* Footer hidden on MyLane — surface fills edge to edge */}
      {currentPageName !== 'MyLane' && <Footer />}

      {/* Feedback Button + Panel — hidden when superagent is active (agent IS the feedback channel) */}
      {currentUser && !agentActive && (
        <>
          {!feedbackOpen && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full shadow-lg transition-all hover:shadow-xl print:hidden"
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
          )}

          {feedbackOpen && (
            <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-secondary border border-border rounded-2xl shadow-2xl print:hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-foreground font-semibold">Send Feedback</h3>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackOpen(false);
                    setFeedbackType('feedback');
                    setWhatHappened('');
                    setWhatExpected('');
                    setScreenshotFile(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex gap-2 px-4 pt-3">
                <button
                  type="button"
                  onClick={() => setFeedbackType('feedback')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    feedbackType === 'feedback'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-card text-muted-foreground border border-border hover:text-foreground-soft'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('bug')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    feedbackType === 'bug'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-card text-muted-foreground border border-border hover:text-foreground-soft'
                  }`}
                >
                  <Bug className="w-4 h-4" />
                  Report Bug
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="p-4 space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{feedbackType === 'bug' ? 'Describe the bug *' : 'What happened? *'}</label>
                  <textarea
                    value={whatHappened}
                    onChange={(e) => setWhatHappened(e.target.value)}
                    placeholder={feedbackType === 'bug' ? 'What went wrong...' : 'Share your idea or suggestion...'}
                    rows={3}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{feedbackType === 'bug' ? 'What should have happened? (optional)' : 'What did you expect? (optional)'}</label>
                  <textarea
                    value={whatExpected}
                    onChange={(e) => setWhatExpected(e.target.value)}
                    placeholder={feedbackType === 'bug' ? 'What should have happened instead...' : 'Any additional context...'}
                    rows={2}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Screenshot (optional)</label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-muted-foreground text-sm cursor-pointer hover:border-border transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>{screenshotFile ? screenshotFile.name || 'Image selected' : 'Attach image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <p className="text-xs text-muted-foreground/70">
                  Page and account info are captured automatically.
                </p>

                <button
                  type="submit"
                  disabled={!whatHappened?.trim() || feedbackSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-muted-foreground/70 text-primary-foreground font-semibold rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {feedbackSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
