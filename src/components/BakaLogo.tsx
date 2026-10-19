import React from 'react';

interface BakaLogoProps {
  size?: number;
  className?: string;
}

export default function BakaLogo({ size = 32, className = '' }: BakaLogoProps) {
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
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          {/* World-class cinematic crimson & rose palette gradient */}
          <linearGradient id="bakaCrimsonGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffabab" />
            <stop offset="55%" stopColor="#d14d72" />
            <stop offset="100%" stopColor="#b23a5d" />
          </linearGradient>

          {/* Aerodynamic highlight ribbon */}
          <linearGradient id="bakaHighlight" x1="8" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef2f4" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffabab" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d14d72" stopOpacity="0" />
          </linearGradient>

          {/* Core play prism glow */}
          <filter id="bakaEmblemGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#d14d72" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Ambient background disc with ultra-subtle dark glass ring */}
        <circle
          cx="20"
          cy="20"
          r="19"
          fill="#161720"
          stroke="rgba(255, 255, 255, 0.09)"
          strokeWidth="1.2"
        />

        {/* Dynamic infinity-play ribbon: Outer sculpted velocity curve */}
        <path
          d="M13 10.5 C13 9.4 14.2 8.7 15.2 9.3 L30.5 18.5 C31.5 19.1 31.5 20.6 30.5 21.2 L15.2 30.4 C14.2 31 13 30.3 13 29.2 Z"
          fill="url(#bakaCrimsonGrad)"
          filter="url(#bakaEmblemGlow)"
        />

        {/* Inner negative-space prism carving out the forward motion arrow */}
        <path
          d="M16 14.5 L25.5 20 L16 25.5 Z"
          fill="#161720"
          opacity="0.95"
        />

        {/* Inner specular play core */}
        <path
          d="M17.5 16.5 L23 20 L17.5 23.5 Z"
          fill="url(#bakaCrimsonGrad)"
        />

        {/* Upper aerodynamic specular sheen */}
        <path
          d="M14 11.5 L28 20 C24 18 19 15 15 13 Z"
          fill="url(#bakaHighlight)"
        />
      </svg>
    </div>
  );
}
