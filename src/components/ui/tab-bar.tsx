"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type TabItem = { href: string; label: string; icon: ReactNode };

/** Port of the TabView from HomeView: floating pill at the bottom, active tab in the accent color. */
export function TabBar({ items, label }: { items: TabItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-safe-min"
    >
      <ul className="flex rounded-full bg-tab-bg p-1.5 shadow-lg backdrop-blur">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-touch min-w-tab flex-col items-center justify-center gap-0.5 rounded-full px-5 text-xs font-semibold ${active ? "bg-fg/10 text-accent" : "text-fg"}`}
              >
                <span className="h-7 w-7">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
