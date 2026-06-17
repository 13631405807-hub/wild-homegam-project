import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { login, register, verifyOtp } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(r => setTimeout(r, 300));

    if (isRegister) {
      if (!nickname.trim()) {
        setError('请输入昵称');
        setIsLoading(false);
        return;
      }
      const result = await register(email, password, nickname);
      if (!result.success) {
        setError(result.error || '注册失败，邮箱可能已使用');
        setIsLoading(false);
        return;
      }
      // Show email confirmation UI
      setShowEmailConfirm(true);
      setIsLoading(false);
    } else {
      const success = await login(email, password);
      if (!success) {
        setError('邮箱或密码错误');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      navigate('/');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    const success = await verifyOtp(email, otpCode);
    if (!success) {
      setError('验证码错误或已过期');
      setIsVerifying(false);
      return;
    }

    setIsVerifying(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-felt-50 to-white dark:from-black dark:to-surface-dark">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-felt-600 to-felt-800 shadow-xl shadow-felt-700/30 mb-4">
            <span className="text-4xl font-black text-gold-400">W</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">狂野HomeGame</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">记录每一场狂野牌局</p>
        </div>

        {/* Email Confirmation View */}
        {showEmailConfirm ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-slide-up">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">验证邮箱</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                我们已向 <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> 发送了验证码
              </p>
            </div>

            <div>
              <label className="section-title">验证码</label>
              <input
                type="text"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="输入6位验证码"
                className="input-field text-center text-lg tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : '验证'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowEmailConfirm(false); setError(''); setOtpCode(''); }}
                className="btn-ghost text-sm"
              >
                返回登录
              </button>
            </div>
          </form>
        ) : (
          /* Normal Form */
          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
            {isRegister && (
              <div>
                <label className="section-title">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="你的牌桌昵称"
                  className="input-field"
                  autoComplete="nickname"
                />
              </div>
            )}

            <div>
              <label className="section-title">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-field"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="section-title">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-12"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn('w-full flex items-center justify-center gap-2', isRegister ? 'btn-gold' : 'btn-primary')}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
                  {isRegister ? '注册' : '登录'}
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="btn-ghost text-sm"
              >
                {isRegister ? '已有账号？去登录' : '没有账号？注册一个'}
              </button>
            </div>

            {/* Quick login hint */}
            {!isRegister && (
              <div className="mt-6 p-3 rounded-xl bg-gray-50 dark:bg-surface-dark-secondary text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">管理员账号</p>
                <p>邮箱: admin@wild.game</p>
                <p>密码: wild2024</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
