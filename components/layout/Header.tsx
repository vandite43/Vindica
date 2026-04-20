'use client';
import { signOut, useSession } from 'next-auth/react';
import { Bell, LogOut, User } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canAccessSettings = role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'SUPER_ADMIN';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {canAccessSettings && (
          <>
            <Link href="/settings" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
              <Bell className="h-5 w-5 text-gray-500" />
            </Link>
            <Link href="/settings?tab=practice" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
              <User className="h-5 w-5 text-gray-500" />
            </Link>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-5 w-5 text-gray-500" />
        </Button>
      </div>
    </header>
  );
}
