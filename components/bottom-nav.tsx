"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, FeedIcon, RoomsIcon, SmartIcon } from "./icons";

const TABS = [
  { href: "/feed", label: "FEED", Icon: FeedIcon },
  { href: "/smart", label: "SMART", Icon: SmartIcon },
  { href: "/book", label: "BOOK", Icon: BookIcon },
  { href: "/rooms", label: "ROOMS", Icon: RoomsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-[var(--a08)] bg-navbg px-4 pt-3.5 backdrop-blur-md"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 font-mono text-[10px]"
            style={{ color: active ? "var(--purp)" : "var(--ink6)" }}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
