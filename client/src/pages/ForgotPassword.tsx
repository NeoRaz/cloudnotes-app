import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { postRequest } from '../api/api';
import { validateEmail } from '../utils/validation';
import toast from 'react-hot-toast';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      await postRequest('/send-reset-password-email', { email });
      setSubmitted(true);
      toast.success('Reset instructions sent to your email');
    } catch (err) {
      // Handled by API error interceptor toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 text-slate-100 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-white font-bold mx-auto mb-4 shadow-lg shadow-accent/25">
            <i className="ti ti-cloud text-3xl" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CloudNotes
          </h2>
        </div>

        {!submitted ? (
          <>
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-white">Forgot Password?</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                Provide your email address and we will dispatch instructions to reset your access password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <i className="ti ti-mail text-lg" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(validateEmail(e.target.value)); }}
                    onBlur={() => setEmailError(validateEmail(email))}
                    className={`w-full pl-11 pr-4 py-3 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${emailError ? 'border-red-500' : 'border-slate-800 focus:border-accent'}`}
                    placeholder="you@domain.com"
                  />
                </div>
                {emailError && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><i className="ti ti-alert-circle text-sm" /> {emailError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
              <i className="ti ti-mail-forward text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Check Your Inbox</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-xs mx-auto">
              If an account is associated with <span className="text-white font-semibold">{email}</span>, a secure password-reset link has been delivered.
            </p>
            <Link
              to="/login"
              className="w-full block py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all text-center shadow-lg shadow-accent/25"
            >
              Return to Login
            </Link>
          </div>
        )}

        <div className="text-center mt-6 pt-6 border-t border-slate-800/60">
          <p className="text-xs text-slate-400">
            Remember your password?{' '}
            <Link to="/login" className="text-accent hover:text-accent/80 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
