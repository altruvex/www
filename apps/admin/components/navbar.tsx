"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Calendar, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <nav className="border-b bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center pr-4 border-r border-zinc-200 dark:border-zinc-800 mr-4">
              <span className="text-xl font-bold text-black dark:text-white">
                Altruvex
              </span>
            </div>
            <div className="hidden sm:-my-px sm:flex sm:space-x-8 rtl:space-x-reverse">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "border-black dark:border-white text-black dark:text-white"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700",
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
