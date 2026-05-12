"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import { AdminSidebar } from "@/components/admin-sidebar";

interface AdminShellProps {
  profile: { full_name: string; role: string; email: string };
  children: React.ReactNode;
}

export function AdminShell({ profile, children }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="no-serif flex min-h-screen w-full bg-background">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <AdminSidebar
        profile={profile}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          profile={profile}
          onMenuToggle={() => setIsSidebarOpen((current) => !current)}
        />
        <main className="flex-1 px-5 pb-20 pt-7 sm:px-8 xl:px-12">
          <div className="mx-auto w-full max-w-[1640px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
