export function SectionSkeleton() {
  return (
    <div className="min-h-[50vh] w-full animate-pulse">
      <div className="mx-auto max-w-7xl px-6 py-32">
        <div className="mb-8 h-3 w-24 rounded-ctl-xs bg-s-border" />
        <div className="mb-6 h-12 w-2/3 rounded-ctl-xs bg-s-border" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-ctl-xs bg-s-surface" />
          <div className="h-4 w-5/6 rounded-ctl-xs bg-s-surface" />
        </div>
      </div>
    </div>
  );
}
