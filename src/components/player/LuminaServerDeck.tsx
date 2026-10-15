'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  Radio,
  Mic,
  Subtitles,
  Zap,
  Play,
  Layers,
  Volume2,
  ToggleLeft,
  ToggleRight,
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
  autoSwitch?: boolean;
  onToggleAutoSwitch?: () => void;
}

export default function LuminaServerDeck({
  servers,
  activeServerId,
  onSelectServer,
  mediaCategory,
  selectedAudioTrack = 'sub',
  onSelectAudioTrack,
  hasHindiDub = false,
  autoSwitch = true,
  onToggleAutoSwitch,
}: LuminaServerDeckProps) {
  const [selectedCategory, setSelectedCategory] = useState<ServerCategory | 'all'>('all');

  const isAnime = mediaCategory === 'anime';
  const isHindiSelected = selectedAudioTrack === 'hindi' || selectedAudioTrack === 'dub-hi';
  const isDubSelected = selectedAudioTrack === 'dub' || selectedAudioTrack === 'dub-en';
  const isSubSelected = !isHindiSelected && !isDubSelected;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: servers.length };
    for (const s of servers) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [servers]);

  const filteredServers = useMemo(() => {
    if (selectedCategory === 'all') return servers;
    return servers.filter((s) => s.category === selectedCategory);
  }, [servers, selectedCategory]);

  return (
    <section className="lumina-deck" aria-label="Streaming Server Selection">

      {/* ── Row 1: Header + Audio Switcher ── */}
      <div className="lumina-deck__top">
        <div className="lumina-deck__heading">
          <div className="lumina-deck__icon-badge">
            <Radio size={14} className="lumina-deck__pulse-icon" />
          </div>
          <span className="lumina-deck__title">
            {isAnime ? 'Anime Server Network' : 'Stream Server Network'}
          </span>
          <span className="lumina-deck__count-chip">
            <span className="lumina-deck__live-dot" />
            {servers.length} Live
          </span>
        </div>

        <div className="lumina-deck__controls-right">
          {/* Auto-Switch toggle (mini inline) */}
          {onToggleAutoSwitch && (
            <button
              type="button"
              onClick={onToggleAutoSwitch}
              className={`lumina-deck__autoswitch ${autoSwitch ? 'lumina-deck__autoswitch--on' : 'lumina-deck__autoswitch--off'}`}
              title={autoSwitch
                ? 'Auto-Switch ON: will auto-try next server on failure'
                : 'Auto-Switch OFF: manual server selection only'}
              aria-pressed={autoSwitch}
            >
              {autoSwitch
                ? <ToggleRight size={15} />
                : <ToggleLeft size={15} />}
              <span>Auto</span>
            </button>
          )}

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
                    <Subtitles size={11} /> SUB
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('dub')}
                    className={`lumina-deck__audio-btn ${isDubSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                  >
                    <Mic size={11} /> DUB
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('english')}
                    className={`lumina-deck__audio-btn ${!isHindiSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                  >
                    <Volume2 size={11} /> Multi
                  </button>
                  {(hasHindiDub || isHindiSelected) && (
                    <button
                      type="button"
                      onClick={() => onSelectAudioTrack('hindi')}
                      className={`lumina-deck__audio-btn ${isHindiSelected ? 'lumina-deck__audio-btn--active' : ''}`}
                    >
                      🇮🇳 Hindi
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Category Filter Tabs ── */}
      <div className="lumina-deck__category-tabs" role="tablist" aria-label="Server Categories">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
          className={`lumina-deck__cat-tab ${selectedCategory === 'all' ? 'lumina-deck__cat-tab--active' : ''}`}
        >
          <Layers size={11} />
          <span>All</span>
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

      {/* ── Row 3: Server Cards Grid (Zero Scroll) ── */}
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
              className={`lumina-server-card ${isActive ? 'lumina-server-card--active' : ''} ${inCooldown ? 'lumina-server-card--cooldown' : ''}`}
              title={server.description}
            >
              {/* Header: Server Index + Status */}
              <div className="lumina-server-card__header">
                <div className="lumina-server-card__index-pill">
                  <Play size={8} className="lumina-server-card__play-icon" />
                  <span>S{server.serverIndex}</span>
                </div>
                {isActive ? (
                  <span className="lumina-server-card__active-tag">
                    <Check size={9} strokeWidth={3} /> Active
                  </span>
                ) : (
                  <span className="lumina-server-card__ping">
                    <span className={`lumina-server-card__dot ${inCooldown ? 'lumina-server-card__dot--cooldown' : ''}`} />
                    {inCooldown ? 'Retry' : health.avgLatencyMs ? `${health.avgLatencyMs}ms` : 'Fast'}
                  </span>
                )}
              </div>

              {/* Body: Name & Quality */}
              <div className="lumina-server-card__body">
                <span className="lumina-server-card__badge">{server.badge}</span>
                <div className="lumina-server-card__text">
                  <span className="lumina-server-card__name">{server.name}</span>
                  <span className="lumina-server-card__quality">{server.quality}</span>
                </div>
              </div>

              {/* Footer: Feature Pills */}
              <div className="lumina-server-card__footer">
                {server.supportsHindiDub && (
                  <span className="lumina-server-card__pill lumina-server-card__pill--hindi">🇮🇳 Hindi</span>
                )}
                {server.features.slice(0, 2).map((feat, idx) => (
                  <span key={idx} className="lumina-server-card__pill">{feat}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Row 4: Auto-switch status footer ── */}
      <div className="lumina-deck__sub-notice">
        <Zap size={10} className="lumina-deck__sub-icon" />
        <span>
          {autoSwitch
            ? 'Auto-Switch is ON — server will auto-change if playback fails.'
            : 'Auto-Switch is OFF — select a server manually if current fails.'}
        </span>
      </div>
    </section>
  );
}
