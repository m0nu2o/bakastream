'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  Search,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import './MobileNavBottom.css';

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/calendar', label: 'Schedule', icon: Calendar },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/anime', label: 'Anime', icon: Sparkles },
  { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
];

export default function MobileNavBottom() {
  const pathname = usePathname();

  // Hide bottom navigation bar on watch/player page for immersive playback
  if (pathname.startsWith('/watch')) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      <div className="mobile-bottom-bar__inner">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={`mobile-bottom-bar__item ${active ? 'mobile-bottom-bar__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <div className="mobile-bottom-bar__icon-wrap">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className="mobile-bottom-bar__icon" />
                {active && <span className="mobile-bottom-bar__dot" />}
              </div>
              <span className="mobile-bottom-bar__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
