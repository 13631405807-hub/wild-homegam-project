import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: '亮色' },
    { value: 'auto' as const, icon: Clock, label: '自动' },
    { value: 'dark' as const, icon: Moon, label: '暗色' },
  ];

  return (
    <div className="flex items-center bg-gray-100 dark:bg-surface-dark-secondary rounded-xl p-1 gap-0.5">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            theme === option.value
              ? 'bg-white dark:bg-surface-dark shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          <option.icon size={14} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
