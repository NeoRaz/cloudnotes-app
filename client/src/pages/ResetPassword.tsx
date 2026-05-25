import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postRequest } from '../api/api';
import { validatePassword, validatePasswordMatch } from '../utils/validation';
import toast from 'react-hot-toast';

interface FormErrors {
  password?: string;
  passwordConfirmation?: string;
}

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate token on mount
  useEffect(() => {
    if (!email || !token) {
      toast.error('Invalid password reset link');
      navigate('/login');
      return;
    }

    const validateToken = async () => {
      try {
        const isValid = await postRequest('/check-password-token-validity', { email, token });
        if (!isValid) {
          toast.error('The password reset link is invalid or has expired.');
          navigate('/login');
        }
      } catch (err) {
        toast.error('The password reset link is invalid or has expired.');
        navigate('/login');
      } finally {
        setIsValidating(false);
      }
    };
    validateToken();
  }, [email, token, navigate]);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    const passErr = validatePassword(password);
    if (passErr) errs.password = passErr;
    
    const matchErr = validatePasswordMatch(password, passwordConfirmation);
    if (matchErr) errs.passwordConfirmation = matchErr;
    
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, passwordConfirmation: true });
    
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please resolve the errors on the form');
      return;
    }

    setLoading(true);
    try {
      await postRequest('/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (err) {
      // Handled by API error interceptor
    } finally {
      setLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 text-slate-100">
        <div className="text-center">
          <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block mb-3" />
          <p className="text-slate-400 text-sm">Validating secure credentials token...</p>
        </div>
      </div>
    );
  }

  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[!@#$%^&*,.()\-+_={}[\]{};'\\:"|\\/<>?~`]/.test(password),
    match: password === passwordConfirmation && passwordConfirmation !== '',
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
          <p className="text-slate-400 text-xs mt-1.5">
            Enter your new repository password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password || touched.passwordConfirmation) {
                    setErrors(prev => ({
                      ...prev,
                      password: validatePassword(e.target.value) || undefined,
                      passwordConfirmation: validatePasswordMatch(e.target.value, passwordConfirmation) || undefined
                    }));
                  }
                }}
                onBlur={() => handleBlur('password')}
                className={`w-full pl-4 pr-11 py-2.5 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  touched.password && errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-accent'
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

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showRePassword ? 'text' : 'password'}
                value={passwordConfirmation}
                onChange={(e) => {
                  setPasswordConfirmation(e.target.value);
                  if (touched.passwordConfirmation) {
                    setErrors(prev => ({
                      ...prev,
                      passwordConfirmation: validatePasswordMatch(password, e.target.value) || undefined
                    }));
                  }
                }}
                onBlur={() => handleBlur('passwordConfirmation')}
                className={`w-full pl-4 pr-11 py-2.5 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  touched.passwordConfirmation && errors.passwordConfirmation ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-accent'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowRePassword(!showRePassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                <i className={`ti ${showRePassword ? 'ti-eye-off' : 'ti-eye'} text-lg`} />
              </button>
            </div>
            {touched.passwordConfirmation && errors.passwordConfirmation && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <i className="ti ti-alert-circle text-sm" /> {errors.passwordConfirmation}
              </p>
            )}
          </div>

          {/* Password Checklist */}
          {password && (
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <i className={`ti ${requirements.length ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                At least 8 characters long
              </div>
              <div className="flex items-center gap-2">
                <i className={`ti ${requirements.uppercase ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                At least one uppercase letter (A-Z)
              </div>
              <div className="flex items-center gap-2">
                <i className={`ti ${requirements.digit ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                At least one numeric digit (0-9)
              </div>
              <div className="flex items-center gap-2">
                <i className={`ti ${requirements.special ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                At least one special character (!@#$%^&*)
              </div>
              <div className="flex items-center gap-2">
                <i className={`ti ${requirements.match ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                Passwords match
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Changing Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-slate-800/60">
          <p className="text-xs text-slate-400">
            Remembered it?{' '}
            <Link to="/login" className="text-accent hover:text-accent/80 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
