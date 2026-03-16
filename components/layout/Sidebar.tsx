'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Mail, Building2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VindicaMark } from './VindicaMark';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/claims', label: 'Claims', icon: FileText },
  { href: '/appeals', label: 'Appeals', icon: Mail },
  { href: '/payers', label: 'Payer Intelligence', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white'
                  : 'hover:bg-white/8'
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
