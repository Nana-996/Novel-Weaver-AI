import React, { useState } from 'react';
import { signUp, signIn, signInWithGoogle } from '../services/authService';
import { SparklesIcon } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, displayName);
        if (result.error) {
          setError(result.error);
        } else {
          setSignupSuccess(true);
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          onAuthenticated();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
    // OAuth redirects, so no need for onAuthenticated here
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setSignupSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md overlay-content-enter">
        <div className="bg-ink rounded-2xl border border-ink-400/15 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-8 pt-8 pb-4 text-center">
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-warm/[0.06] blur-[60px] rounded-full" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-ink-200 border border-ink-400 flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-7 h-7 text-warm" />
              </div>
              <h2 className="text-xl font-display font-semibold text-parchment tracking-tight">
                {signupSuccess ? 'Check your email' : mode === 'signin' ? 'Welcome back' : 'Join Novel Weaver'}
              </h2>
              <p className="text-sm text-parchment-dim/70 mt-1">
                {signupSuccess
                  ? 'We sent you a confirmation link. Click it to activate your account.'
                  : mode === 'signin'
                    ? 'Sign in to continue writing your story'
                    : 'Create your account and start writing'
                }
              </p>
            </div>
          </div>

          {signupSuccess ? (
            <div className="px-8 pb-8">
              <button
                onClick={() => {
                  setMode('signin');
                  setSignupSuccess(false);
                  resetForm();
                }}
                className="w-full py-3 rounded-xl bg-warm hover:bg-warm-light text-ink font-medium transition-all text-sm"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <div className="px-8">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-ink-100 border border-ink-400/20 hover:border-ink-400/40 hover:bg-ink-200/60 text-parchment text-sm font-medium transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-ink-400/15" />
                  <span className="text-[11px] text-parchment-faint/50 uppercase tracking-wider font-medium">or</span>
                  <div className="flex-1 h-px bg-ink-400/15" />
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-parchment-dim mb-1.5">Your name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="How should we call you?"
                      className="w-full bg-ink-100 border border-ink-400/20 rounded-xl px-4 py-2.5 text-sm text-parchment focus:outline-none focus:border-warm/30 transition-colors placeholder:text-parchment-faint/30"
                      autoFocus={mode === 'signup'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-parchment-dim mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-ink-100 border border-ink-400/20 rounded-xl px-4 py-2.5 text-sm text-parchment focus:outline-none focus:border-warm/30 transition-colors placeholder:text-parchment-faint/30"
                    autoFocus={mode === 'signin'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-parchment-dim mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    required
                    minLength={6}
                    className="w-full bg-ink-100 border border-ink-400/20 rounded-xl px-4 py-2.5 text-sm text-parchment focus:outline-none focus:border-warm/30 transition-colors placeholder:text-parchment-faint/30"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-warm hover:bg-warm-light text-ink font-medium transition-all text-sm disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {/* Toggle mode */}
              <div className="px-8 pb-6 text-center">
                <p className="text-xs text-parchment-faint/50">
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                      resetForm();
                    }}
                    className="text-warm hover:text-warm-light font-medium transition-colors"
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
