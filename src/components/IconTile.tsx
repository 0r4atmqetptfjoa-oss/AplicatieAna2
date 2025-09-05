import React, { useRef } from "react";

type Props = {
  title?: string;          // preferred
  label?: string;          // legacy support
  subtitle?: string;
  icon: React.ReactNode;
  gradient?: string;       // e.g. "from-white/10 to-black/10"
  onClick?: () => void;
  quickAction?: React.ReactNode; // DO NOT pass <button/> here to avoid nested button warning
  style?: React.CSSProperties;
  className?: string;
};

/**
 * IconTile (web/PWA-safe)
 * - No haptics dependency (prevents 'haptics is not a function')
 * - Ripple implemented safely
 * - Text colors forced to visible (white)
 */
export default function IconTile({
  title,
  label,
  subtitle,
  icon,
  gradient = "from-white/10 to-black/10",
  onClick,
  quickAction,
  style,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const caption = title ?? label ?? "";

  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "absolute rounded-full pointer-events-none animate-[ripple_600ms_ease-out_forwards]";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.style.background = "rgba(255,255,255,0.25)";
    el.appendChild(ripple);
    setTimeout(() => { try { el.removeChild(ripple); } catch {} }, 650);
  };

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onPointerDown={onDown}
      onClick={onClick}
      className={[
        "relative w-full h-24 rounded-2xl overflow-hidden",
        "bg-[rgba(20,20,20,0.6)] backdrop-blur-sm border border-white/10 shadow-lg",
        "active:scale-[0.99] transition",
        "focus:outline-none",
        "touch-manipulation",
        className
      ].join(" ")}
      style={style}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
      {quickAction && <div className="absolute top-2 right-2 z-20">{quickAction}</div>}

      <div className="relative z-10 h-full flex items-center gap-4 px-4">
        <div className="rounded-2xl bg-black/20 p-4">{icon}</div>
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{caption}</div>
          {subtitle && <div className="text-xs text-white/70 line-clamp-2">{subtitle}</div>}
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0%   { transform: scale(0); opacity: 0.7; }
          80%  { transform: scale(2.8); opacity: 0.25; }
          100% { transform: scale(3.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
