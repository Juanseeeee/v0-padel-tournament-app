export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-6 flex gap-4">
          <div className="h-10 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
