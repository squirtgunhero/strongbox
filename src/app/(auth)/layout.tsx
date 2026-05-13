import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Auth shell — provides the visual frame for every auth page.
 * Centered card on the warm app background, small wordmark + footer.
 * Uses NO heavy hero, NO product description (this is a private B2B
 * platform — users coming here already know what StrongBox is).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background text-[13px] font-semibold leading-none tracking-[-0.02em]"
          >
            S
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">
            StrongBox
          </span>
        </Link>
        <Link
          href="mailto:support@strongbox.com"
          className="text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          Need help?
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-4">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>

      <footer className="border-t px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-[11.5px] text-muted-foreground">
          <span>© {new Date().getFullYear()} StrongBox · Hard money OS</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <span className="mono text-[11px]">SOC 2 Type II</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
