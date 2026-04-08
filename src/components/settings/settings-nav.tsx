import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SettingsNavProps {
  activeTab: string;
}

const navItems = [
  {
    id: 'profile',
    label: 'Enterprise Profile',
    href: '/settings?tab=profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'team',
    label: 'Team Members',
    href: '/settings?tab=team',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'subscription',
    label: 'Subscription',
    href: '/settings?tab=subscription',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

export function SettingsNav({ activeTab }: SettingsNavProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#117a72] text-white'
                : 'text-[#3e4947] hover:bg-[#117a72]/8 hover:text-[#141d1c]'
            )}
          >
            <span className={isActive ? 'text-white' : 'text-[#6b7c7a]'}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
