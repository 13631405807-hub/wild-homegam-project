import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Home, Trophy, PlusCircle, User, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useApp();

  // Hide on login and game lobby pages
  if (location.pathname === '/login' || location.pathname.startsWith('/game/')) return null;

  const tabs = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/leaderboard', icon: Trophy, label: '排行' },
    { path: '/new-game', icon: PlusCircle, label: '开局' },
    ...(isAdmin ? [{ path: '/admin', icon: Settings2, label: '管理' }] : []),
    { path: '/profile', icon: User, label: '我的' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-gray-200/50 dark:border-white/10 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200',
                isActive ? 'text-felt-700 dark:text-felt-400' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <tab.icon
                size={tab.path === '/new-game' ? 28 : 24}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={cn(
                  'transition-all duration-200',
                  tab.path === '/new-game' && 'text-felt-600 dark:text-felt-400'
                )}
              />
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-semibold'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
