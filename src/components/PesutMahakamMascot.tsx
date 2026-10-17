import React from 'react';

interface Props {
  className?: string;
  isProcessing?: boolean;
}

export const PesutMahakamMascot: React.FC<Props> = ({ className = 'w-32 h-32', isProcessing = false }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background soft ambient halo */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-200/40 via-teal-100/30 to-amber-100/40 blur-xl ${
          isProcessing ? 'animate-pulse' : ''
        }`}
      />

      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-md transition-transform duration-500 ${
          isProcessing ? 'animate-bounce' : 'hover:scale-105'
        }`}
        aria-label="Maskot Pesut Mahakam Awang Long"
      >
        {/* Soft water ripples below */}
        <ellipse cx="100" cy="145" rx="55" ry="8" fill="#CFFAFE" />
        <ellipse cx="100" cy="145" rx="35" ry="4" fill="#99F6E4" />

        {/* Tail Fluke */}
        <path
          d="M32 90 C22 75, 12 70, 5 72 C12 85, 20 92, 35 94 C20 98, 12 108, 6 120 C14 118, 24 112, 34 98 Z"
          fill="#94A3B8"
          stroke="#475569"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Body of Pesut Mahakam (Round, blunt head characteristic of Orcaella) */}
        <path
          d="M35 95 C55 100, 95 108, 130 98 C160 88, 185 68, 180 48 C176 34, 158 28, 135 32 C105 38, 70 65, 35 95 Z"
          fill="url(#pesutBodyGrad)"
          stroke="#475569"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Belly soft shading */}
        <path
          d="M60 92 C90 102, 125 96, 155 82 C168 76, 175 66, 176 56 C165 65, 145 74, 120 78 C90 82, 68 85, 60 92 Z"
          fill="#F1F5F9"
          opacity="0.85"
        />

        {/* Small rounded dorsal fin (typical of Pesut / Irrawaddy dolphin) */}
        <path
          d="M95 48 C102 38, 110 38, 114 44 C112 48, 106 50, 95 48 Z"
          fill="#64748B"
          stroke="#475569"
          strokeWidth="2.5"
        />

        {/* Pectoral Flipper (rounded paddle shape) */}
        <path
          d="M118 78 C128 88, 138 102, 135 110 C130 114, 120 108, 112 92 Z"
          fill="#64748B"
          stroke="#475569"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Cute eye */}
        <circle cx="162" cy="46" r="4.5" fill="#1E293B" />
        <circle cx="164" cy="44.5" r="1.5" fill="#FFFFFF" />

        {/* Sweet smile curve */}
        <path
          d="M172 58 C166 63, 156 64, 150 63"
          stroke="#334155"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Cute blushing cheek */}
        <ellipse cx="152" cy="56" rx="6" ry="3.5" fill="#F43F5E" opacity="0.4" />

        {/* Sparkles */}
        <g className={isProcessing ? 'animate-spin' : ''} style={{ transformOrigin: '175px 25px' }}>
          <path d="M175 18 L177 23 L182 25 L177 27 L175 32 L173 27 L168 25 L173 23 Z" fill="#F59E0B" />
          <circle cx="185" cy="36" r="2" fill="#38BDF8" />
          <circle cx="165" cy="15" r="1.5" fill="#10B981" />
        </g>

        {/* Color Gradients */}
        <defs>
          <linearGradient id="pesutBodyGrad" x1="20" y1="30" x2="180" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#CBD5E1" />
            <stop offset="0.5" stopColor="#94A3B8" />
            <stop offset="1" stopColor="#64748B" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
