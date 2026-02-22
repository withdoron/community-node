import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60 * 1000,
  });

  const footerLinks = [
    { label: 'Terms', href: '/Terms' },
    { label: 'Privacy', href: '/Privacy' },
    { label: 'Support', href: '/Support' }
  ];

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !value.includes('@') || !value.includes('.') || value.length < 6) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const allSubscribers = await base44.entities.NewsletterSubscriber.list();
      const alreadyExists = (Array.isArray(allSubscribers) ? allSubscribers : []).some(
        (sub) => (sub.email || '').toLowerCase() === value.toLowerCase()
      );
      if (alreadyExists) {
        toast.success("You're already subscribed!");
        setEmail('');
        setIsSubmitting(false);
        return;
      }

      const firstName = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : null;

      await base44.entities.NewsletterSubscriber.create({
        email: value,
        subscribed_at: new Date().toISOString(),
        source: 'footer',
        user_id: currentUser?.id || null,
        first_name: firstName,
        is_active: true,
      });

      toast.success("You're in! Welcome to The Good News.");
      setEmail('');
    } catch (err) {
      toast.error("Something went wrong. Try again?");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Newsletter */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-100">The Good News</h3>
          <p className="text-sm text-slate-400 mt-0.5">Community wins, new features, and local stories.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNewsletterSubmit(e);
            }}
            className="mt-3 flex flex-col sm:flex-row gap-0 max-w-md"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isSubmitting}
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-t-lg rounded-b-none sm:rounded-r-none sm:rounded-l-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2.5 rounded-b-lg rounded-t-none sm:rounded-l-none sm:rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '…' : 'Subscribe'}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-6" />

        {/* Top Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img
              src="/LocalLaneLogo.png"
              alt="Local Lane"
              className="h-9 w-9 rounded-lg object-cover"
            />
            <span className="text-white font-bold text-xl tracking-tight">Local Lane</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6">
            {footerLinks.map((link) =>
              link.href.startsWith('mailto:') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-slate-400 hover:text-amber-500 transition-colors duration-300 text-sm"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-slate-400 hover:text-amber-500 transition-colors duration-300 text-sm"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-6" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div>
            <p className="text-slate-500">
              © {currentYear} Local Lane. All rights reserved.
            </p>
            <p className="text-slate-500 text-xs mt-1">Built in Eugene, Oregon by Doron Fletcher</p>
          </div>
          <p className="text-slate-500">
            Made for Community
          </p>
        </div>
      </div>
    </footer>
  );
}