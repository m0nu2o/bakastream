import React from 'react';

interface BakaLogoProps {
  size?: number;
  className?: string;
}

export default function BakaLogo({ size = 36, className = '' }: BakaLogoProps) {
  return (
    <div
      className={`bakastream-logo-icon ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          {/* Intense anime crimson-red neon gradient */}
          <linearGradient id="bakaNeonRed" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff2e54" />
            <stop offset="45%" stopColor="#f43b4c" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          {/* Electric blade highlight */}
          <linearGradient id="bakaBlade" x1="12" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#ff8597" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f43b4c" stopOpacity="0.4" />
          </linearGradient>

          {/* Katana energy aura */}
          <filter id="bakaGlowAura" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#f43b4c" floodOpacity="0.65" />
          </filter>

          <filter id="bakaSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Futuristic faceted badge background */}
        <rect
          x="2.5"
          y="2.5"
          width="39"
          height="39"
          rx="11"
          fill="#10101b"
          stroke="url(#bakaNeonRed)"
          strokeWidth="1.5"
          strokeOpacity="0.75"
        />

        {/* 2. Cyber-anime geometric shield grid lines */}
        <path
          d="M3 13 L12 3"
          stroke="rgba(255, 46, 84, 0.35)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M41 31 L32 41"
          stroke="rgba(255, 46, 84, 0.35)"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* 3. Stylized "B" Katana & Play Emblem (Brand Core) */}
        {/* Left vertical katana spine */}
        <path
          d="M11.5 10.5 C11.5 9.7 12.2 9 13 9 H15.5 C16.3 9 17 9.7 17 10.5 V33.5 C17 34.3 16.3 35 15.5 35 H13 C12.2 35 11.5 34.3 11.5 33.5 Z"
          fill="url(#bakaNeonRed)"
          filter="url(#bakaGlowAura)"
        />

        {/* Top Wing / Loop of "B" */}
        <path
          d="M17 10 H24.5 C28 10 30.5 12.2 30.5 15.2 C30.5 18 28.2 20 25 20.5 H17 Z"
          fill="url(#bakaNeonRed)"
          filter="url(#bakaGlowAura)"
        />

        {/* Bottom Wing / Loop of "B" with extended cinema sweep */}
        <path
          d="M17 21 H26.5 C30.5 21 33.5 23.4 33.5 27 C33.5 30.8 30 33.5 25.5 33.5 H17 Z"
          fill="url(#bakaNeonRed)"
          filter="url(#bakaGlowAura)"
        />

        {/* Dynamic Forward Cinema PLAY SHARD carved into the center */}
        <path
          d="M18.5 14.5 L28 21.5 L18.5 28.5 Z"
          fill="url(#bakaBlade)"
          filter="url(#bakaSoftGlow)"
        />

        {/* Anime Lightning Spark / Shuriken Accent on top-right */}
        <polygon
          points="35.5,7 38.5,12 34,11 37,16 31,10 35.5,10"
          fill="#ff4d5e"
        />
      </svg>
    </div>
  );
}
