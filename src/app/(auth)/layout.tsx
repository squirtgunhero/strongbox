import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

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
        <Link href="/" className="inline-flex items-center group">
          <Wordmark height={22} className="text-foreground" />
        </Link>
        <Link
          href="mailto:support@strongbox.com"
          className="text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          Need help?
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-4">
        <div
          className="w-full max-w-[400px] rounded-xl border bg-card px-8 py-10 shadow-sm"
          style={{ "--ring": "oklch(0.55 0.13 245)" } as React.CSSProperties}
        >
          {children}
        </div>
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
