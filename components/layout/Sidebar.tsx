'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Mail, Building2, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <aside className="w-64 min-h-screen bg-[#0F4C81] text-white flex flex-col">
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-[#00B4A2]" />
          <div>
            <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Instrument Serif, serif' }}>ClaimGuard</h1>
            <p className="text-xs text-blue-300">AI Denial Prevention</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-white/20 text-white'
                : 'text-blue-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-700">
        <p className="text-xs text-blue-400 text-center">ClaimGuard AI v1.0</p>
      </div>
    </aside>
  );
}
