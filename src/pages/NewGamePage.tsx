import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { MapPin, Calendar, Settings2, Users, ArrowLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewGamePage() {
  const { currentUser, users, createGame } = useApp();
  const navigate = useNavigate();

  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [chipsPerHand, setChipsPerHand] = useState(1000);
  const [goldPerHand, setGoldPerHand] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

  const handleCreate = () => {
    if (!currentUser) return;
    const gameId = createGame(location || '未设置地点', date, chipsPerHand, goldPerHand);
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  const presets = [
    { label: '老王棋牌室', icon: '🏠' },
    { label: '小李家', icon: '🏡' },
    { label: '咖啡德扑俱乐部', icon: '☕' },
    { label: '线上', icon: '💻' },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-gray-200/50 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="btn-ghost p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-bold text-lg text-gray-900 dark:text-white">开启新牌局</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Date */}
        <div className="animate-slide-up">
          <label className="section-title flex items-center gap-1.5">
            <Calendar size={14} /> 日期
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Location */}
        <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <label className="section-title flex items-center gap-1.5">
            <MapPin size={14} /> 地点
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="输入地点或从下方选择"
            className="input-field mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
              <button
                key={preset.label}
                onClick={() => setLocation(preset.label)}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95',
                  location === preset.label
                    ? 'bg-felt-100 dark:bg-felt-900/40 text-felt-700 dark:text-felt-400 border border-felt-300 dark:border-felt-700'
                    : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300'
                )}
              >
                {preset.icon} {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Game Settings */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 w-full btn-ghost justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 size={14} />
              <span className="section-title mb-0">筹码设置</span>
            </span>
            <span className="text-xs text-gray-400">
              {showSettings ? '收起' : '展开'}
            </span>
          </button>

          {showSettings && (
            <div className="glass-card-solid p-4 mt-2 space-y-4 animate-slide-down">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 mb-2 block">
                  每手筹码数
                </label>
                <div className="flex gap-2">
                  {[500, 1000, 2000].map(val => (
                    <button
                      key={val}
                      onClick={() => setChipsPerHand(val)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                        chipsPerHand === val
                          ? 'bg-felt-700 text-white'
                          : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 mb-2 block">
                  每手 = 多少金币
                </label>
                <div className="flex gap-2">
                  {[25, 50, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => setGoldPerHand(val)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                        goldPerHand === val
                          ? 'bg-gold-500 text-black'
                          : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-felt-50 dark:bg-felt-900/20 rounded-xl p-3 text-sm text-felt-700 dark:text-felt-400">
                <span className="font-semibold">换算：</span>
                {chipsPerHand} 筹码 = {goldPerHand} 金币
              </div>
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <button
            onClick={handleCreate}
            className="w-full btn-gold text-lg py-4 flex items-center justify-center gap-2"
          >
            <Plus size={22} />
            开启牌局
          </button>
        </div>
      </div>
    </div>
  );
}
