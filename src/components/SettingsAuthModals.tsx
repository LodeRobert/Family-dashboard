import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { setupSettingsPassword, verifySettingsPassword } from '../services/storage';

interface FirstTimePasswordModalProps {
  onSuccess: () => void;
}

export const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError('Kies een wachtwoord van minimaal 4 tekens.');
      return;
    }
    if (password !== confirmPassword) {
      setError('De twee wachtwoorden komen niet overeen.');
      return;
    }

    try {
      setIsSubmitting(true);
      await setupSettingsPassword(password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Kon wachtwoord niet opslaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Welkom bij HomeBoard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stel eenmalig een wachtwoord in voor de Instellingen
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          Met dit wachtwoord voorkom je dat kinderen zelf het gezin, taken of het sterrensaldo aanpassen in <strong>Instellingen</strong>. Je kunt het wachtwoord later altijd wijzigen.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nieuw wachtwoord (min. 4 tekens)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Bijv. een pincode of wachtwoord"
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Toon wachtwoord"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bevestig wachtwoord
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Herhaal wachtwoord"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm"
          >
            {isSubmitting ? 'Opslaan...' : 'Wachtwoord instellen & doorgaan'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface SettingsLockScreenProps {
  onUnlocked: () => void;
}

export const SettingsLockScreen: React.FC<SettingsLockScreenProps> = ({ onUnlocked }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    try {
      setIsVerifying(true);
      setError('');
      const ok = await verifySettingsPassword(password);
      if (ok) {
        setPassword('');
        onUnlocked();
      } else {
        setError('Onjuist wachtwoord. Probeer opnieuw.');
      }
    } catch (err: any) {
      setError(err.message || 'Kon wachtwoord niet controleren.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-14">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Instellingen zijn vergrendeld
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vul het ouderwachtwoord in om instellingen, gezinsleden en sterren te beheren.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-3 text-left">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Wachtwoord..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Toon wachtwoord"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isVerifying || !password}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors text-sm"
          >
            {isVerifying ? 'Controleren...' : 'Ontgrendelen'}
          </button>
        </form>
      </div>
    </div>
  );
};
