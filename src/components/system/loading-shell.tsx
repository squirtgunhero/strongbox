export function LoadingShell({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
        {label}
      </div>
    </div>
  );
}
