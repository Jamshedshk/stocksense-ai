import React from "react";

interface BrandedLoaderProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
  message = "Preparing your inventory...",
  submessage,
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm mx-auto select-none">
      {/* 3-Box Animated Inventory Stacking Motif */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Soft Ambient Radial Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F26B4F]/25 via-[#FF955E]/15 to-[#F2C66D]/10 blur-xl animate-pulse-glow" />

        {/* 3 Stacking Isometric Inventory Boxes Motif */}
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 overflow-visible relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Box 1 (Bottom Left) — Deep Aubergine with Gold Tape Accent */}
          <g className="animate-box-bottom-left">
            {/* Top face */}
            <polygon points="30,52 48,42 30,32 12,42" fill="#3D2C4D" stroke="#24172F" strokeWidth="1.5" />
            {/* Left face */}
            <polygon points="12,42 30,52 30,68 12,58" fill="#24172F" stroke="#24172F" strokeWidth="1.5" />
            {/* Right face */}
            <polygon points="30,52 48,42 48,58 30,68" fill="#33253D" stroke="#24172F" strokeWidth="1.5" />
            {/* Gold tape stripe on top face */}
            <line x1="21" y1="37" x2="39" y2="47" stroke="#F2C66D" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </g>

          {/* Box 2 (Bottom Right) — Charcoal Plum with Tangerine Tape Accent */}
          <g className="animate-box-bottom-right">
            {/* Top face */}
            <polygon points="68,52 86,42 68,32 50,42" fill="#4A365B" stroke="#24172F" strokeWidth="1.5" />
            {/* Left face */}
            <polygon points="50,42 68,52 68,68 50,58" fill="#33253D" stroke="#24172F" strokeWidth="1.5" />
            {/* Right face */}
            <polygon points="68,52 86,42 86,58 68,68" fill="#24172F" stroke="#24172F" strokeWidth="1.5" />
            {/* Tangerine tape stripe */}
            <line x1="59" y1="37" x2="77" y2="47" stroke="#FF955E" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </g>

          {/* Box 3 (Top Center) — Burnt Coral Stacking Box */}
          <g className="animate-box-stack-top">
            {/* Top face */}
            <polygon points="49,32 67,22 49,12 31,22" fill="#FF8266" stroke="#C4482E" strokeWidth="1.5" />
            {/* Left face */}
            <polygon points="31,22 49,32 49,48 31,38" fill="#F26B4F" stroke="#C4482E" strokeWidth="1.5" />
            {/* Right face */}
            <polygon points="49,32 67,22 67,38 49,48" fill="#D85338" stroke="#C4482E" strokeWidth="1.5" />
            {/* Cream tape stripe on top */}
            <line x1="40" y1="17" x2="58" y2="27" stroke="#F6F0E7" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
          </g>
        </svg>
      </div>

      {/* Brand Title and Contextual Message */}
      <div className="space-y-1.5">
        <div className="text-sm font-extrabold tracking-tight text-[#24172F] flex items-center justify-center gap-1">
          StockSense <span className="text-[#F26B4F]">AI</span>
        </div>
        <p className="text-xs font-semibold text-[#55465E] animate-pulse">
          {message}
        </p>
        {submessage && (
          <p className="text-[11px] text-[#8C7A9C] max-w-xs mx-auto">
            {submessage}
          </p>
        )}
      </div>

      {/* Minimal Inventory Beam Indicator */}
      <div className="w-28 h-1 bg-[#24172F]/10 rounded-full overflow-hidden mx-auto mt-2">
        <div className="h-full bg-gradient-to-r from-[#F26B4F] to-[#FF955E] rounded-full animate-beam-sweep" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F6F0E7]/95 backdrop-blur-sm flex items-center justify-center animate-fade-in-up">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-10 flex items-center justify-center animate-fade-in-up">
      {content}
    </div>
  );
};

export default BrandedLoader;
