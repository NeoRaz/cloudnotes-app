import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postLoginRequest } from '../api/api';
import { validateEmail } from '../utils/validation';
import toast from 'react-hot-toast';

interface FormErrors {
  email?: string;
  password?: string;
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = 'Password is required';
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const response = await postLoginRequest('/login', {
        grant_type: 'password',
        client_id: import.meta.env.REACT_APP_CLIENT_ID,
        client_secret: import.meta.env.REACT_APP_CLIENT_SECRET,
        username: email,
        password: password,
      });

      const { access_token, refresh_token, token_type } = response;
      await login(access_token, refresh_token, token_type);
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      // Errors handled by postLoginRequest toast interceptor
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FormErrors) =>
    `w-full pl-11 pr-4 py-3 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${
      touched[field] && errors[field]
        ? 'border-red-500 focus:border-red-500'
        : 'border-slate-800 focus:border-accent'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 text-slate-100 overflow-hidden relative">
      {/* Decorative Orbs */}
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
          <p className="text-slate-400 text-sm mt-1.5">
            Please sign in to access your secure cloud repository
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
                onChange={(e) => { setEmail(e.target.value); if (touched.email) setErrors(validate()); }}
                onBlur={() => handleBlur('email')}
                className={inputClass('email')}
                placeholder="you@domain.com"
              />
            </div>
            {touched.email && errors.email && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <i className="ti ti-alert-circle text-sm" /> {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <i className="ti ti-lock text-lg" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (touched.password) setErrors(validate()); }}
                onBlur={() => handleBlur('password')}
                className={`w-full pl-11 pr-11 py-3 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  touched.password && errors.password
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-800 focus:border-accent'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'} text-lg`} />
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <i className="ti ti-alert-circle text-sm" /> {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-slate-800/60">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:text-accent/80 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

