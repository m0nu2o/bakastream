'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Radio,
  Zap,
  Volume2,
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { LuminaServerConfig } from '@/lib/providers/lumina';
import './LuminaServerDeck.css';

export interface AudioLanguageOption {
  /** Canonical key e.g. 'hindi', 'english', 'tamil', 'malayalam', 'sub', 'dub', 'original' */
  key: string;
  /** Primary display name */
  label: string;
  /** Native script label */
  nativeLabel?: string;
  /** Flag emoji */
  flag: string;
  /** Short descriptor of where it plays (e.g. "2 HD Mirrors" or "VidLink Anime") */
  sourceNote: string;
  /** Server ID that carries this playable language */
  targetServerId?: string;
  /** Whether a live stream probe confirmed playback */
  isDirectVerified?: boolean;
}

export interface LuminaServerDeckProps {
  servers: LuminaServerConfig[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  audioOptions: AudioLanguageOption[];
  selectedAudioKey: string;
  onSelectAudioOption: (option: AudioLanguageOption) => void;
  discoveringAudio?: boolean;
  autoSwitch?: boolean;
  onToggleAutoSwitch?: () => void;
  switchBanner?: string | null;
}

export default function LuminaServerDeck({
  servers,
  activeServerId,
  onSelectServer,
  audioOptions,
  selectedAudioKey,
  onSelectAudioOption,
  discoveringAudio = false,
  autoSwitch = true,
  onToggleAutoSwitch,
  switchBanner,
}: LuminaServerDeckProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    if (!menuOpen && pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      setAlignLeft(rect.left < 280 || rect.left < window.innerWidth * 0.45);
    }
    setMenuOpen(o => !o);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const activeOption =
    audioOptions.find(o => o.key === selectedAudioKey) ??
    audioOptions[0] ?? {
      key: 'original',
      label: 'Original Audio',
      flag: '🌐',
      sourceNote: 'Player Default',
    };

  const serverNameById = new Map(servers.map(s => [s.id, s.name]));

  return (
    <div className="lumina-bar" aria-label="Streaming Server and Audio Controls">
      {switchBanner && (
        <div className="lumina-smart-toast" role="status">
          <Sparkles size={13} />
          <span>{switchBanner}</span>
        </div>
      )}

      {/* ── Main Control Row: Server Chips + Unified Dubbed Language Button + Auto-Switch ── */}
      <div className="lumina-bar__main">
        {/* Left: Server Pills */}
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

        {/* Right: Single Unified Dubbed Language Picklist Button + Auto-Switch */}
        <div className="lumina-bar__right">
          <div className="lumina-lang-picker" ref={pickerRef}>
            <button
              type="button"
              className={`lumina-lang-trigger ${menuOpen ? 'lumina-lang-trigger--open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-label="Select Dubbed Audio Language"
              onClick={toggleMenu}
            >
              <Volume2 size={14} className="lumina-lang-trigger__icon" />
              <span className="lumina-lang-trigger__flag" aria-hidden="true">
                {activeOption.flag}
              </span>
              <span className="lumina-lang-trigger__text">{activeOption.label}</span>
              {discoveringAudio ? (
                <span className="lumina-lang-trigger__meta">
                  <Loader2 size={11} className="lumina-spin" />
                </span>
              ) : (
                <span className="lumina-lang-trigger__meta">
                  {audioOptions.length > 1
                    ? audioOptions.some(o => o.key === 'hindi') && activeOption.key !== 'hindi'
                      ? `Hindi +${audioOptions.length - 1} Dubs`
                      : `${audioOptions.length} Dubs`
                    : activeOption.sourceNote}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`lumina-lang-trigger__chev ${menuOpen ? 'is-open' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                className={`lumina-lang-menu ${alignLeft ? 'lumina-lang-menu--left' : ''}`}
                role="listbox"
                aria-label="Available Playable Audio Languages"
              >
                <div className="lumina-lang-menu__head">
                  <span>Available Playable Audio</span>
                  <span className="lumina-lang-menu__count">
                    {discoveringAudio
                      ? 'Checking…'
                      : `${audioOptions.length} ${audioOptions.length === 1 ? 'track' : 'tracks'}`}
                  </span>
                </div>

                <div className="lumina-lang-menu__list">
                  {audioOptions.map(option => {
                    const isSelected = option.key === activeOption.key;
                    const willSwitchServer =
                      option.targetServerId && option.targetServerId !== activeServerId;
                    const targetName = option.targetServerId
                      ? serverNameById.get(option.targetServerId)
                      : undefined;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`lumina-lang-option ${isSelected ? 'lumina-lang-option--active' : ''}`}
                        onClick={() => {
                          setMenuOpen(false);
                          onSelectAudioOption(option);
                        }}
                      >
                        <div className="lumina-lang-option__left">
                          <span className="lumina-lang-option__flag" aria-hidden="true">
                            {option.flag}
                          </span>
                          <div className="lumina-lang-option__names">
                            <span className="lumina-lang-option__label">{option.label}</span>
                            {option.nativeLabel && option.nativeLabel !== option.label && (
                              <span className="lumina-lang-option__native">
                                {option.nativeLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="lumina-lang-option__right">
                          <span
                            className={`lumina-lang-option__tag ${willSwitchServer ? 'is-switch' : ''}`}
                          >
                            {willSwitchServer && targetName
                              ? `Auto -> ${targetName}`
                              : option.sourceNote}
                          </span>
                          {isSelected && (
                            <Check size={14} className="lumina-lang-option__check" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {onToggleAutoSwitch && (
            <button
              type="button"
              onClick={onToggleAutoSwitch}
              className={`lumina-action-chip ${autoSwitch ? 'lumina-action-chip--active' : ''}`}
              title={
                autoSwitch
                  ? 'Auto-Switch ON: automatically switches server when a language or stream needs a backup mirror'
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
    </div>
  );
}
