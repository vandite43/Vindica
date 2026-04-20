'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SettingsSubNavProps {
  isAdmin:      boolean;
  isSuperAdmin: boolean;
}

export default function SettingsSubNav({ isAdmin, isSuperAdmin }: SettingsSubNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: '/settings',                    label: 'General',      show: true        },
    { href: '/settings/audit-log',          label: 'Audit Log',    show: isAdmin     },
    { href: '/settings/audit-log/system',   label: 'System Audit', show: isSuperAdmin },
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-6">
      <nav className="-mb-px flex gap-0">
        {tabs.filter(t => t.show).map(tab => {
          const isActive =
            tab.href === '/settings'
              ? pathname === '/settings'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-[#5B3FD4] text-[#5B3FD4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab.label}
              {tab.href === '/settings/audit-log/system' && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border border-[#5B3FD4]/40 text-[#5B3FD4] tracking-wide">
                  SYSTEM
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
