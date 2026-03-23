'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard, FileText, Mail, Settings,
  ClipboardCheck, BookOpen, LibraryBig, PenLine, TrendingDown, Calculator, ShieldCheck, CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VindicaMark } from './VindicaMark';
import type { Role } from '@/lib/auth/roles';

type NavItem = {
  href:  string;
  label: string;
  icon:  React.ElementType;
  roles: Role[]; // empty array = all roles
};

const ALL_ROLES: Role[] = ['ADMIN', 'OFFICE_MANAGER', 'BILLER', 'PROVIDER'];
const NON_PROVIDER: Role[] = ['ADMIN', 'OFFICE_MANAGER', 'BILLER'];

const navItems: NavItem[] = [
  { href: '/dashboard',         label: 'Dashboard',       icon: LayoutDashboard, roles: ALL_ROLES },
  { href: '/claims',            label: 'Claims',           icon: FileText,        roles: ALL_ROLES },
  { href: '/appeals',           label: 'Appeals',          icon: Mail,            roles: NON_PROVIDER },
  { href: '/narrative-builder', label: 'Narrative Builder',icon: PenLine,         roles: NON_PROVIDER },
  { href: '/scrubber',          label: 'Claim Scrubber',   icon: ClipboardCheck,  roles: NON_PROVIDER },
  { href: '/denial-decoder',    label: 'Denial Decoder',   icon: BookOpen,        roles: NON_PROVIDER },
  { href: '/roi-calculator',    label: 'ROI Calculator',   icon: Calculator,      roles: NON_PROVIDER },
  { href: '/credentialing',     label: 'Credentialing',    icon: ShieldCheck,     roles: ['ADMIN', 'OFFICE_MANAGER'] },
  { href: '/month-end',         label: 'Month End Close',  icon: CalendarCheck,   roles: ['ADMIN', 'OFFICE_MANAGER'] },
  { href: '/denial-trends',     label: 'Denial Trends',    icon: TrendingDown,    roles: ['ADMIN', 'OFFICE_MANAGER'] },
  { href: '/payer-center',      label: 'Payer Center',     icon: LibraryBig,      roles: NON_PROVIDER },
  { href: '/settings',          label: 'Settings',         icon: Settings,        roles: ALL_ROLES },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role ?? 'BILLER') as Role;

  const visibleItems = navItems.filter(item =>
    item.roles.length === 0 || item.roles.includes(role)
  );

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#1A1033' }}>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <VindicaMark size={32} variant="dark" />
          <div>
            <h1 className="font-bold text-lg leading-tight text-white"
                style={{ fontFamily: 'Trebuchet MS, Segoe UI, sans-serif' }}>
              Vindi<span style={{ color: '#8B72E8' }}>ca</span>
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Intelligent Claims Recovery
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'text-white' : 'hover:bg-white/8',
              )}
              style={isActive
                ? { backgroundColor: '#5B3FD4', color: '#ffffff' }
                : { color: 'rgba(255,255,255,0.45)' }
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Vindica v1.0
        </p>
      </div>
    </aside>
  );
}
