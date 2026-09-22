// Icons ported verbatim (same path data) from Kage.dc.html bottom-nav glyphs.
export function FeedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12h4l3-8 4 16 3-8h6" />
    </svg>
  );
}

export function SmartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 17 9.5 10.5 13.5 14.5 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </svg>
  );
}

export function BookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4.5" width="18" height="15.5" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export function RoomsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.8 19.5a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  );
}

export function StatusBarIcons(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="flex items-center gap-1 text-ink" {...props}>
      <svg width="13" height="10" viewBox="0 0 13 10" fill="currentColor"><path d="M12.4.3a.4.4 0 0 1 .6.4v8.6a.4.4 0 0 1-.4.4H.9a.4.4 0 0 1-.3-.7z" /></svg>
      <svg width="12" height="9" viewBox="0 0 12 9" fill="currentColor"><path d="M6 8.6 4.3 6.8a2.5 2.5 0 0 1 3.4 0zM2.9 5.3 1.9 4.2a5.9 5.9 0 0 1 8.2 0L9.1 5.3a4.4 4.4 0 0 0-6.2 0zM.5 2 -.4.9a9.3 9.3 0 0 1 12.8 0L11.5 2a7.8 7.8 0 0 0-11 0z" /></svg>
      <svg width="19" height="10" viewBox="0 0 19 10" fill="currentColor"><rect x="0" y="0" width="16.5" height="10" rx="2.6" /><path d="M17.8 3.3a1.9 1.9 0 0 1 0 3.4z" /></svg>
    </span>
  );
}
