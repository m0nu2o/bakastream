'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Check, Radio, ChevronLeft, ChevronRight, Volume2, Mic, Subtitles } from 'lucide-react';
import { type LuminaServerConfig, ProviderTelemetry } from '@/lib/providers/lumina';
import './LuminaServerDeck.css';

export interface LuminaServerDeckProps {
  servers: LuminaServerConfig[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  mediaCategory: 'movie' | 'tv' | 'anime';
  selectedAudioTrack?: string;
  onSelectAudioTrack?: (trackId: string) => void;
  hasHindiDub?: boolean;
}

export default function LuminaServerDeck({
  servers,
  activeServerId,
  onSelectServer,
  mediaCategory,
  selectedAudioTrack = 'sub',
  onSelectAudioTrack,
  hasHindiDub = false,
}: LuminaServerDeckProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);

  const isAnime = mediaCategory === 'anime';
  const isHindiSelected = selectedAudioTrack === 'hindi' || selectedAudioTrack === 'dub-hi';
  const isDubSelected = selectedAudioTrack === 'dub' || selectedAudioTrack === 'dub-en';
  const isSubSelected = !isHindiSelected && !isDubSelected;

  const categoryLabel = isAnime
    ? 'Anime Engines'
    : mediaCategory === 'tv'
    ? 'Series Relays'
    : 'Cinema Network';

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [servers, updateScrollState]);

  // Center active server on mount or change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>(`[data-server-id="${activeServerId}"]`);
    if (activeEl) {
      const targetLeft = activeEl.offsetLeft - el.clientWidth / 2 + activeEl.clientWidth / 2;
      el.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
      setTimeout(updateScrollState, 250);
    }
  }, [activeServerId, updateScrollState]);

  const scrollStep = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = 260;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 250);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 12) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
    updateScrollState();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 80);
  };

  return (
    <section className="lumina-deck" aria-label="Watch-Lumina Streaming Servers">
      {/* ── Top Bar: Network Label & Audio Mode Selector ── */}
      <div className="lumina-deck__top">
        <div className="lumina-deck__label-group">
          <div className="lumina-deck__icon-badge">
            <Radio size={14} className="lumina-deck__pulse-icon" />
          </div>
          <span className="lumina-deck__category-title">{categoryLabel}</span>
          <span className="lumina-deck__online-chip">
            <span className="lumina-deck__live-dot" />
            {servers.length} Servers Online
          </span>
        </div>

        {/* Quick Audio Switcher */}
        {onSelectAudioTrack && (
          <div className="lumina-deck__audio-pills" role="group" aria-label="Audio Mode">
            {isAnime ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('sub')}
                  className={`lumina-deck__audio-btn ${isSubSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                >
                  <Subtitles size={12} /> SUB
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('dub')}
                  className={`lumina-deck__audio-btn ${isDubSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                >
                  <Mic size={12} /> DUB
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('english')}
                  className={`lumina-deck__audio-btn ${!isHindiSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                >
                  <Volume2 size={12} /> Multi-Audio
                </button>
                {(hasHindiDub || isHindiSelected) && (
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('hindi')}
                    className={`lumina-deck__audio-btn ${isHindiSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                  >
                    🇮🇳 Hindi Dubbed
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Horizontal Server Carousel ── */}
      <div className="lumina-deck__carousel-wrap">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollStep('left')}
            aria-label="Scroll servers left"
            className="lumina-deck__chevron lumina-deck__chevron--left"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="lumina-deck__track"
        >
          {servers.map((server) => {
            const isActive = server.id === activeServerId;
            const health = ProviderTelemetry.getHealth(server.id);
            const inCooldown = ProviderTelemetry.isInCooldown(server.id);
            const qualityShort = server.quality.split('/')[0].trim();

            return (
              <button
                key={server.id}
                data-server-id={server.id}
                onClick={() => {
                  if (hasMovedRef.current) return;
                  onSelectServer(server.id);
                }}
                type="button"
                aria-pressed={isActive}
                className={`lumina-deck__server-card ${isActive ? 'lumina-deck__server-card--active' : ''}`}
                title={server.description}
              >
                <div className="lumina-deck__card-header">
                  <span className="lumina-deck__badge-emoji">{server.badge}</span>
                  <span className="lumina-deck__server-name">{server.name}</span>
                </div>

                <div className="lumina-deck__card-meta">
                  {isActive ? (
                    <span className="lumina-deck__tag lumina-deck__tag--live">
                      <Check size={11} strokeWidth={3} /> ACTIVE
                    </span>
                  ) : (
                    <span className="lumina-deck__tag">{qualityShort}</span>
                  )}

                  {server.supportsHindiDub && (
                    <span className="lumina-deck__tag lumina-deck__tag--hindi">HI</span>
                  )}
                  {server.supportsEnglishDub && (
                    <span className="lumina-deck__tag lumina-deck__tag--eng">EN</span>
                  )}

                  <span className="lumina-deck__latency">
                    <span
                      className={`lumina-deck__latency-dot ${
                        inCooldown ? 'lumina-deck__latency-dot--cooldown' : ''
                      }`}
                    />
                    {health.avgLatencyMs ? `${health.avgLatencyMs}ms` : 'Fast'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollStep('right')}
            aria-label="Scroll servers right"
            className="lumina-deck__chevron lumina-deck__chevron--right"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
