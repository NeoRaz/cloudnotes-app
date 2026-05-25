import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postRequest } from '../api/api';
import { validateEmail, validateRequired } from '../utils/validation';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step states: 'setup' | 'verify' | 'success'
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup');
  
  // Registration data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // Registration metadata
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  
  // Status flags
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fieldErrors = {
    first_name: touched.first_name ? validateRequired(firstName, 'First name') : null,
    last_name: touched.last_name ? validateRequired(lastName, 'Last name') : null,
    email: touched.email ? validateEmail(email) : null,
  };

  // Password requirements checklist check
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[!@#$%^&*,.()\-+_={}[\]{};'\\:"|\\/<>?~`]/.test(password),
    match: password === passwordConfirmation && passwordConfirmation !== '',
  };

  const isPasswordValid = Object.values(requirements).every(Boolean);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ first_name: true, last_name: true, email: true });

    const hasNameErrors = !firstName.trim() || !lastName.trim();
    const emailErr = validateEmail(email);
    if (hasNameErrors || emailErr) {
      toast.error('Please fix the highlighted errors');
      return;
    }

    if (!password || !passwordConfirmation) {
      toast.error('Please enter password and confirmation');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please fulfill all password requirements');
      return;
    }

    setLoading(true);
    try {
      const response = await postRequest('v1/register/account-setup', {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      // Save metadata returned from server
      const returnedId = response.id;
      setRegistrationId(returnedId);
      localStorage.setItem('registration_id', returnedId);
      localStorage.setItem('email', email);

      toast.success('Registration code sent to your email!');
      setStep('verify');
    } catch (err) {
      // Handled by API error toaster
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const idToSubmit = registrationId || localStorage.getItem('registration_id');
      await postRequest('v1/register/verify-registration', {
        code: otpCode,
        registration_id: idToSubmit,
      });

      toast.success('Email verified successfully!');
      setStep('success');
    } catch (err) {
      // Handled by API error toaster
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

        {step === 'setup' && (
          <>
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-white">Create Account</h3>
              <p className="text-slate-400 text-xs mt-1">Please fill in your details to set up your repository</p>
            </div>

            <form onSubmit={handleSetupSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={() => handleBlur('first_name')}
                    className={`w-full px-4 py-2.5 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${fieldErrors.first_name ? 'border-red-500' : 'border-slate-800 focus:border-accent'}`}
                    placeholder="John"
                  />
                  {fieldErrors.first_name && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><i className="ti ti-alert-circle text-sm" /> {fieldErrors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => handleBlur('last_name')}
                    className={`w-full px-4 py-2.5 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${fieldErrors.last_name ? 'border-red-500' : 'border-slate-800 focus:border-accent'}`}
                    placeholder="Doe"
                  />
                  {fieldErrors.last_name && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><i className="ti ti-alert-circle text-sm" /> {fieldErrors.last_name}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-full px-4 py-2.5 bg-slate-950/40 border rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all ${fieldErrors.email ? 'border-red-500' : 'border-slate-800 focus:border-accent'}`}
                  placeholder="john.doe@example.com"
                />
                {fieldErrors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><i className="ti ti-alert-circle text-sm" /> {fieldErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-accent rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'} text-lg`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showRePassword ? 'text' : 'password'}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-950/40 border border-slate-800 focus:border-accent rounded-xl text-sm placeholder-slate-500 focus:outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRePassword(!showRePassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <i className={`ti ${showRePassword ? 'ti-eye-off' : 'ti-eye'} text-lg`} />
                  </button>
                </div>
              </div>

              {/* Requirements Checklist */}
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
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </form>

            <div className="text-center mt-6 pt-6 border-t border-slate-800/60">
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-accent hover:text-accent/80 font-semibold transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="mb-6 text-center animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white">Verify Your Email</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                A 6-digit verification code has been dispatched to <strong className="text-accent">{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full tracking-[1.5em] text-center font-bold text-xl py-3 bg-slate-950/40 border border-slate-800 focus:border-accent rounded-xl focus:outline-none transition-all placeholder:text-slate-600"
                  placeholder="000000"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <i className="ti ti-circle-check text-5xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Account Verified!</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
              Your CloudNotes account has been verified. You can now log in.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
