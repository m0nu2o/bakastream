'use client';

import React from 'react';
import { Radio, Zap, Volume2 } from 'lucide-react';
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

  return (
    <div className="lumina-bar" aria-label="Streaming Server and Audio Controls">
      {/* ── Left: Label + Server Pills ── */}
      <div className="lumina-bar__left">
        <div className="lumina-bar__label">
          <Radio size={12} className="lumina-bar__pulse" />
          <span>SERVERS</span>
        </div>

        <div className="lumina-bar__servers" role="tablist" aria-label="Servers">
          {servers.map(server => {
            const isActive = server.id === activeServerId;
            return (
              <button
                key={server.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectServer(server.id)}
                className={`lumina-server-chip ${isActive ? 'lumina-server-chip--active' : ''}`}
                title={`${server.name} — ${server.description}`}
              >
                {isActive && <span className="lumina-server-chip__dot" />}
                <span className="lumina-server-chip__idx">S{server.serverIndex}</span>
                <span className="lumina-server-chip__name">{server.name}</span>
                <span className="lumina-server-chip__quality">{server.quality.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: Auto-Switch + Audio Selector ── */}
      <div className="lumina-bar__right">
        {onToggleAutoSwitch && (
          <button
            type="button"
            onClick={onToggleAutoSwitch}
            className={`lumina-action-chip ${autoSwitch ? 'lumina-action-chip--active' : ''}`}
            title={
              autoSwitch
                ? 'Auto-Switch ON: automatically tries backup server on failure'
                : 'Auto-Switch OFF'
            }
            aria-pressed={autoSwitch}
          >
            <Zap size={11} className={autoSwitch ? 'lumina-action-chip__zap--on' : ''} />
            <span>Auto</span>
            <span className="lumina-action-chip__badge">{autoSwitch ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {onSelectAudioTrack && (
          <div className="lumina-audio-selector" role="group" aria-label="Audio Track">
            {isAnime ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('sub')}
                  className={`lumina-audio-btn ${isSubSelected ? 'lumina-audio-btn--active' : ''}`}
                >
                  SUB
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('dub')}
                  className={`lumina-audio-btn ${isDubSelected ? 'lumina-audio-btn--active' : ''}`}
                >
                  DUB
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('english')}
                  className={`lumina-audio-btn ${!isHindiSelected ? 'lumina-audio-btn--active' : ''}`}
                >
                  <Volume2 size={10} /> Multi
                </button>
                {(hasHindiDub || isHindiSelected) && (
                  <button
                    type="button"
                    onClick={() => onSelectAudioTrack('hindi')}
                    className={`lumina-audio-btn ${isHindiSelected ? 'lumina-audio-btn--active' : ''}`}
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
  );
}
