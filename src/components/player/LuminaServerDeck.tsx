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

        {/* Right: Auto-Switch */}
        <div className="lumina-bar__right">
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

      {/* ── Dedicated Multi-Audio Language Picker Deck ── */}
      {onSelectAudioTrack && (
        <div className="lumina-audio-deck" aria-label="Audio Track and Language Selection">
          <div className="lumina-audio-deck__label">
            <Volume2 size={13} className="lumina-bar__pulse" />
            <span>AUDIO TRACK:</span>
          </div>

          <div className="lumina-audio-deck__buttons" role="group" aria-label="Audio Languages">
            {isAnime ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('sub')}
                  className={`lumina-audio-btn ${isSubSelected ? 'lumina-audio-btn--active' : ''}`}
                  title="Japanese Audio with English Subtitles"
                >
                  <MessageSquare size={11} />
                  <span>🇯🇵 SUB</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('dub')}
                  className={`lumina-audio-btn ${isDubSelected ? 'lumina-audio-btn--active' : ''}`}
                  title="English Dubbed Audio"
                >
                  <Mic size={11} />
                  <span>🇺🇸 DUB</span>
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
                  className={`lumina-audio-btn ${selectedAudioTrack === 'english' || selectedAudioTrack === 'multi' || !selectedAudioTrack ? 'lumina-audio-btn--active' : ''}`}
                  title="Original / Multi Audio"
                >
                  <Volume2 size={11} />
                  <span>🌐 Multi / Eng</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('hindi')}
                  className={`lumina-audio-btn ${selectedAudioTrack === 'hindi' ? 'lumina-audio-btn--active' : ''}`}
                  title="Hindi Dubbed Audio"
                >
                  <span>🇮🇳 Hindi</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('tamil')}
                  className={`lumina-audio-btn ${selectedAudioTrack === 'tamil' ? 'lumina-audio-btn--active' : ''}`}
                  title="Tamil Dubbed Audio"
                >
                  <span>🇮🇳 Tamil</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('telugu')}
                  className={`lumina-audio-btn ${selectedAudioTrack === 'telugu' ? 'lumina-audio-btn--active' : ''}`}
                  title="Telugu Dubbed Audio"
                >
                  <span>🇮🇳 Telugu</span>
                </button>
              </>
            )}

            {/* Additional Languages Dropdown */}
            <div className="lumina-audio-dropdown-wrap">
              <select
                aria-label="More Audio Languages"
                className="lumina-audio-select"
                value={selectedAudioTrack}
                onChange={e => onSelectAudioTrack(e.target.value)}
              >
                <option value="" disabled>
                  More Languages ▾
                </option>
                {isAnime ? (
                  <>
                    <option value="spanish">🇪🇸 Spanish Dub</option>
                    <option value="french">🇫🇷 French Dub</option>
                    <option value="german">🇩🇪 German Dub</option>
                  </>
                ) : (
                  <>
                    <option value="spanish">🇪🇸 Spanish (Español)</option>
                    <option value="french">🇫🇷 French (Français)</option>
                    <option value="german">🇩🇪 German (Deutsch)</option>
                    <option value="korean">🇰🇷 Korean (한국어)</option>
                    <option value="japanese">🇯🇵 Japanese (日本語)</option>
                    <option value="italian">🇮🇹 Italian (Italiano)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="lumina-audio-deck__badge">
            <Sparkles size={11} />
            <span>
              {isAnime
                ? isHindiSelected
                  ? 'Hindi Dub Selected'
                  : isDubSelected
                  ? 'English Dub Selected'
                  : 'Japanese (English Sub)'
                : selectedAudioTrack === 'hindi'
                ? 'Hindi Audio Prioritized'
                : selectedAudioTrack === 'tamil'
                ? 'Tamil Audio Prioritized'
                : selectedAudioTrack === 'telugu'
                ? 'Telugu Audio Prioritized'
                : selectedAudioTrack && selectedAudioTrack !== 'english' && selectedAudioTrack !== 'multi'
                ? `${selectedAudioTrack.toUpperCase()} Audio Prioritized`
                : 'Multi-Audio (English / Original)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
