"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, LogOut, Mail, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { monoCaps } from "@/lib/mono-caps";

import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Mail },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/leads", label: "Leads", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="me-4 flex shrink-0 items-center border-e border-border pe-4">
              <span className="font-sans text-xl font-medium tracking-tight text-foreground">
                Altruvex
              </span>
              <span className={cn(monoCaps, "ms-3 text-muted-foreground")}>
                Admin
              </span>
            </div>
            <div className="hidden sm:-my-px sm:flex sm:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-soft text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
