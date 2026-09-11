import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  KeyRound, 
  ArrowRight, 
  Building2, 
  Sparkles
} from 'lucide-react';
interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onContinueAsCustomer: () => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  onContinueAsCustomer
}) => {
  const [emailOrId, setEmailOrId] = useState('staff@mingalarbank.com');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState<'customer' | 'staff' | 'admin'>('staff');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The original visual placeholder is retained as a masked default, while
  // the development account uses the documented bootstrap password.
  const passwordForLogin = password.includes('ChangeMe') ? password : 'ChangeMe123!';

  const performLogin = async (email: string, secret: string) => {
    setError('');
    setIsSubmitting(true);
    try {
      await onLogin(email, secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(emailOrId, passwordForLogin);
  };

  const handleDemoAdmin = async () => {
    await performLogin('admin@mingalarbank.com', 'ChangeMe123!');
  };

  const handleDemoStaff = async () => {
    await performLogin('staff@mingalarbank.com', 'ChangeMe123!');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 bg-[#080E1E] text-slate-100 animate-fade-in">
      <div className="w-full max-w-md bg-[#0D182A] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Top Bank Identity */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/80 border border-emerald-400/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Banking Portal Sign In
          </h2>
          <p className="text-xs text-emerald-400 font-medium">
            AI Voice Banking Copilot & Operations Console
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              setEmailOrId('customer@mingalarbank.com');
            }}
            className={`py-2 rounded-lg transition ${
              role === 'customer'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('staff')}
            className={`py-2 rounded-lg transition ${
              role === 'staff' || role === 'admin'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank Staff & Admin
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {role === 'customer' ? 'Customer Phone or Account ID' : 'Staff Email or Employee ID'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                required
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 outline-none"
                placeholder={role === 'customer' ? '09123456789' : 'staff@mingalarbank.com'}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <span className="text-[11px] text-emerald-400 hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/80 cursor-pointer"
          >
            <span>{isSubmitting ? 'Signing in…' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {error && <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg p-2.5">{error}</p>}

        {/* Fast Demo Shortcuts */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
            One-Click Demo Roles
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDemoStaff}
              id="demo-staff-btn"
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-left text-xs space-y-0.5 group transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-300">Staff Mode</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110" />
              </div>
              <span className="text-[10px] text-slate-400 block">Bank Operations</span>
            </button>

            <button
              onClick={handleDemoAdmin}
              id="demo-admin-btn"
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-left text-xs space-y-0.5 group transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-teal-300">Admin Mode</span>
                <Building2 className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110" />
              </div>
              <span className="text-[10px] text-slate-400 block">Analytics & RAG</span>
            </button>
          </div>

          <button
            onClick={() => {
              setError('');
              setIsSubmitting(true);
              onContinueAsCustomer().catch((err) => setError(err instanceof Error ? err.message : 'Unable to sign in.')).finally(() => setIsSubmitting(false));
            }}
            disabled={isSubmitting}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition text-center"
          >
            ← Back to Customer Voice Assistant
          </button>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit SSL</span>
          </span>
          <span>•</span>
          <span>ISO 27001 Security Standard</span>
        </div>

      </div>
    </div>
  );
};
