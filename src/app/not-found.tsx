import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        StrongBox · 404
      </div>
      <h1 className="text-[22px] font-semibold tracking-[-0.018em]">
        Page not found
      </h1>
      <p className="mt-1 max-w-[380px] text-[13px] text-muted-foreground">
        The URL you opened doesn&apos;t match any view in StrongBox. It may
        have moved, or the link is stale.
      </p>
      <Link
        href="/admin"
        className="mt-5 inline-flex h-9 items-center rounded-md bg-foreground px-3.5 text-[12.5px] font-medium text-background hover:opacity-90"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
