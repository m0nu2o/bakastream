'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  Radio,
  Volume2,
  Mic,
  Subtitles,
  Zap,
  Play,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  type LuminaServerConfig,
  type ServerCategory,
  SERVER_CATEGORIES,
  ProviderTelemetry,
} from '@/lib/providers/lumina';
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
  const [selectedCategory, setSelectedCategory] = useState<ServerCategory | 'all'>('all');

  const isAnime = mediaCategory === 'anime';
  const isHindiSelected = selectedAudioTrack === 'hindi' || selectedAudioTrack === 'dub-hi';
  const isDubSelected = selectedAudioTrack === 'dub' || selectedAudioTrack === 'dub-en';
  const isSubSelected = !isHindiSelected && !isDubSelected;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: servers.length };
    for (const s of servers) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [servers]);

  // Filtered servers
  const filteredServers = useMemo(() => {
    if (selectedCategory === 'all') return servers;
    return servers.filter((s) => s.category === selectedCategory);
  }, [servers, selectedCategory]);

  return (
    <section className="lumina-deck" aria-label="Streaming Server Selection">
      {/* ── Top Bar: Server Controls & Audio Switcher ── */}
      <div className="lumina-deck__top">
        <div className="lumina-deck__heading">
          <div className="lumina-deck__icon-badge">
            <Radio size={14} className="lumina-deck__pulse-icon" />
          </div>
          <span className="lumina-deck__title">
            {isAnime ? 'Anime Streaming Network' : 'Playback Server Network'}
          </span>
          <span className="lumina-deck__count-chip">
            <span className="lumina-deck__live-dot" />
            {servers.length} Active Servers
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

      {/* ── Category Filter Tabs Bar ── */}
      <div className="lumina-deck__category-tabs" role="tablist" aria-label="Server Categories">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
          className={`lumina-deck__cat-tab ${selectedCategory === 'all' ? 'lumina-deck__cat-tab--active' : ''}`}
        >
          <Layers size={12} />
          <span>All Servers</span>
          <span className="lumina-deck__tab-count">{categoryCounts.all}</span>
        </button>

        {SERVER_CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          if (count === 0) return null;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat.id)}
              className={`lumina-deck__cat-tab ${isSelected ? 'lumina-deck__cat-tab--active' : ''}`}
              title={cat.description}
            >
              <span>{cat.badge}</span>
              <span>{cat.shortLabel}</span>
              <span className="lumina-deck__tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Responsive Server Cards Grid (Zero Scrollbar) ── */}
      <div className="lumina-deck__cards-grid" role="group" aria-label="Available Streaming Servers">
        {filteredServers.map((server) => {
          const isActive = server.id === activeServerId;
          const health = ProviderTelemetry.getHealth(server.id);
          const inCooldown = ProviderTelemetry.isInCooldown(server.id);

          return (
            <button
              key={server.id}
              data-server-id={server.id}
              onClick={() => onSelectServer(server.id)}
              type="button"
              aria-pressed={isActive}
              className={`lumina-server-card ${isActive ? 'lumina-server-card--active' : ''}`}
              title={server.description}
            >
              {/* Card Top Row: Server Number & Live Status */}
              <div className="lumina-server-card__header">
                <div className="lumina-server-card__index-pill">
                  <Play size={9} className="lumina-server-card__play-icon" />
                  <span>Server {server.serverIndex}</span>
                </div>

                {isActive ? (
                  <span className="lumina-server-card__active-tag">
                    <Check size={10} strokeWidth={3} /> Active
                  </span>
                ) : (
                  <span className="lumina-server-card__ping">
                    <span
                      className={`lumina-server-card__dot ${
                        inCooldown ? 'lumina-server-card__dot--cooldown' : ''
                      }`}
                    />
                    {health.avgLatencyMs ? `${health.avgLatencyMs}ms` : 'Fast'}
                  </span>
                )}
              </div>

              {/* Card Middle: Server Name & Quality */}
              <div className="lumina-server-card__body">
                <span className="lumina-server-card__name">{server.name}</span>
                <span className="lumina-server-card__quality">{server.quality}</span>
              </div>

              {/* Card Footer: Feature Badges (Hindi, 0 Ads, etc.) */}
              <div className="lumina-server-card__footer">
                {server.supportsHindiDub && (
                  <span className="lumina-server-card__pill lumina-server-card__pill--hindi">
                    🇮🇳 Hindi Dub
                  </span>
                )}
                {server.features.slice(0, 2).map((feat, idx) => (
                  <span key={idx} className="lumina-server-card__pill">
                    {feat}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Helpful Streaming Sub-notice ── */}
      <div className="lumina-deck__sub-notice">
        <Zap size={11} className="lumina-deck__sub-icon" />
        <span>If current server buffers or fails, pick another server above. All servers are monitored 24/7.</span>
      </div>
    </section>
  );
}
