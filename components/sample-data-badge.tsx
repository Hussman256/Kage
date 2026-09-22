export function SampleDataBadge({ label = "SAMPLE DATA · NOT LIVE" }: { label?: string }) {
  return (
    <div
      className="mx-5 mb-3 flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-wide"
      style={{
        borderColor: "rgba(240,140,190,.4)",
        background: "rgba(160,5,93,.12)",
        color: "var(--berryInk)",
      }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--berryInk)" }} />
      {label}
    </div>
  );
}
