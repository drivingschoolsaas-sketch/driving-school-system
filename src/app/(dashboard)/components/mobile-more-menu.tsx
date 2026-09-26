'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MoreMenuItem {
  label: string;
  href: string;
  icon: string;
}

export function MobileMoreMenu({ items, primaryColor }: { items: MoreMenuItem[]; primaryColor?: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isMoreActive = items.some((item) => pathname.startsWith(item.href));

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      {/* More button in bottom nav */}
      <button
        type="button"
        onClick={toggle}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
          isMoreActive
            ? 'font-semibold'
            : 'text-gray-600 dark:text-gray-400'
        }`}
        style={isMoreActive ? { color: primaryColor } : undefined}
        aria-expanded={open}
        aria-label="More navigation"
      >
        <span className="text-lg">☰</span>
        <span className="text-[10px]">More</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Slide-up panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-y-auto">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Grid of menu items */}
          <div className="grid grid-cols-4 gap-1 px-4 pb-6">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[11px] font-medium text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
