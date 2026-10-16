'use client';

import React from 'react';
import {
  Radio,
  Zap,
  Volume2,
  MessageSquare,
  Mic,
  Server,
  Sparkles,
  Info,
} from 'lucide-react';
import type { LuminaServerConfig } from '@/lib/providers/lumina';
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
  const isAnime = mediaCategory === 'anime';
  const isHindiSelected = selectedAudioTrack === 'hindi' || selectedAudioTrack === 'dub-hi';
  const isDubSelected = selectedAudioTrack === 'dub' || selectedAudioTrack === 'dub-en';
  const isSubSelected = !isHindiSelected && !isDubSelected;

  const activeServer = servers.find(s => s.id === activeServerId) ?? servers[0];

  return (
    <div className="lumina-bar" aria-label="Streaming Server and Audio Controls">
      {/* ── Top Bar: Server Selector + Controls ── */}
      <div className="lumina-bar__main">
        {/* Left: Label + Server Pills */}
        <div className="lumina-bar__left">
          <div className="lumina-bar__label">
            <Radio size={13} className="lumina-bar__pulse" />
            <span>SERVER</span>
          </div>

          <div className="lumina-bar__servers" role="tablist" aria-label="Streaming Servers">
            {servers.map(server => {
              const isActive = server.id === activeServerId;
              const isNextGen = server.id.includes('nextgen');

              return (
                <button
                  key={server.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectServer(server.id)}
                  className={`lumina-server-chip ${isActive ? 'lumina-server-chip--active' : ''} ${isNextGen ? 'lumina-server-chip--nextgen' : ''}`}
                  title={`${server.name} — ${server.description}`}
                >
                  {isActive ? (
                    <span className="lumina-server-chip__dot" />
                  ) : (
                    <span className="lumina-server-chip__badge-icon">{server.badge}</span>
                  )}
                  <span className="lumina-server-chip__name">{server.name}</span>
                  <span className="lumina-server-chip__quality">
                    {server.quality.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Auto-Switch + Audio Selector */}
        <div className="lumina-bar__right">
          {onSelectAudioTrack && (
            <div className="lumina-audio-selector" role="group" aria-label="Audio Track">
              {isAnime ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('sub')}
                    className={`lumina-audio-btn ${isSubSelected ? 'lumina-audio-btn--active' : ''}`}
                    title="Japanese Audio with English Subtitles"
                  >
                    <MessageSquare size={11} />
                    <span>SUB</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('dub')}
                    className={`lumina-audio-btn ${isDubSelected ? 'lumina-audio-btn--active' : ''}`}
                    title="English Dubbed Audio"
                  >
                    <Mic size={11} />
                    <span>DUB</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('hindi')}
                    className={`lumina-audio-btn ${isHindiSelected ? 'lumina-audio-btn--active' : ''}`}
                    title="Hindi Dubbed Audio Track"
                  >
                    <span>🇮🇳 Hindi</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('english')}
                    className={`lumina-audio-btn ${!isHindiSelected ? 'lumina-audio-btn--active' : ''}`}
                    title="Original / Multi Audio"
                  >
                    <Volume2 size={11} />
                    <span>Multi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('hindi')}
                    className={`lumina-audio-btn ${isHindiSelected ? 'lumina-audio-btn--active' : ''}`}
                    title="Hindi Audio Track"
                  >
                    <span>🇮🇳 Hindi</span>
                  </button>
                </>
              )}
            </div>
          )}

          {onToggleAutoSwitch && (
            <button
              type="button"
              onClick={onToggleAutoSwitch}
              className={`lumina-action-chip ${autoSwitch ? 'lumina-action-chip--active' : ''}`}
              title={
                autoSwitch
                  ? 'Auto-Switch ON: automatically switches to backup server if playback fails'
                  : 'Auto-Switch OFF'
              }
              aria-pressed={autoSwitch}
            >
              <Zap size={11} className={autoSwitch ? 'lumina-action-chip__zap--on' : ''} />
              <span>Auto-Switch</span>
              <span className="lumina-action-chip__badge">{autoSwitch ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Subtitle / Tip Bar ── */}
      <div className="lumina-bar__footer">
        <div className="lumina-bar__tip">
          <Info size={12} className="lumina-bar__tip-icon" />
          <span>
            Streaming via <strong>{activeServer?.name ?? 'NextGen Engine'}</strong>. If you experience buffering or lag, switch server above.
          </span>
        </div>
      </div>
    </div>
  );
}
