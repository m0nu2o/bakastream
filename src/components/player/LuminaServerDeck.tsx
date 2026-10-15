'use client';

import React from 'react';
import { Check, Radio, Volume2, Mic, Subtitles, Zap } from 'lucide-react';
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
  const isAnime = mediaCategory === 'anime';
  const isHindiSelected = selectedAudioTrack === 'hindi' || selectedAudioTrack === 'dub-hi';
  const isDubSelected = selectedAudioTrack === 'dub' || selectedAudioTrack === 'dub-en';
  const isSubSelected = !isHindiSelected && !isDubSelected;

  const categoryLabel = isAnime
    ? 'Anime Engines'
    : mediaCategory === 'tv'
    ? 'Series Relays'
    : 'Cinema Network';

  return (
    <section className="lumina-deck" aria-label="Streaming Servers">
      {/* ── Top Bar: Server Network Header & Audio Mode ── */}
      <div className="lumina-deck__top">
        <div className="lumina-deck__label-group">
          <div className="lumina-deck__icon-badge">
            <Radio size={14} className="lumina-deck__pulse-icon" />
          </div>
          <span className="lumina-deck__category-title">{categoryLabel}</span>
          <span className="lumina-deck__online-chip">
            <span className="lumina-deck__live-dot" />
            {servers.length} Servers Active
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

      {/* ── Helpful Streaming Sub-notice ── */}
      <div className="lumina-deck__sub-notice">
        <Zap size={12} className="lumina-deck__sub-icon" />
        <span>If playback buffers or fails, switch to an alternate server below:</span>
      </div>

      {/* ── All Servers Grid (Zero Scrollbar, Responsive Wrap) ── */}
      <div className="lumina-deck__grid" role="group" aria-label="Available Streaming Servers">
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          const health = ProviderTelemetry.getHealth(server.id);
          const inCooldown = ProviderTelemetry.isInCooldown(server.id);
          const qualityShort = server.quality.split('/')[0].trim();

          return (
            <button
              key={server.id}
              data-server-id={server.id}
              onClick={() => onSelectServer(server.id)}
              type="button"
              aria-pressed={isActive}
              className={`lumina-server-btn ${isActive ? 'lumina-server-btn--active' : ''}`}
              title={server.description}
            >
              <span className="lumina-server-btn__badge">{server.badge}</span>
              <span className="lumina-server-btn__name">{server.name}</span>
              <span className="lumina-server-btn__quality">{qualityShort}</span>
              {server.supportsHindiDub && (
                <span className="lumina-server-btn__tag lumina-server-btn__tag--hindi">Hindi</span>
              )}
              {isActive ? (
                <span className="lumina-server-btn__active-badge">
                  <Check size={11} strokeWidth={3} /> Active
                </span>
              ) : (
                <span className="lumina-server-btn__latency">
                  <span
                    className={`lumina-server-btn__dot ${
                      inCooldown ? 'lumina-server-btn__dot--cooldown' : ''
                    }`}
                  />
                  {health.avgLatencyMs ? `${health.avgLatencyMs}ms` : 'Fast'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
