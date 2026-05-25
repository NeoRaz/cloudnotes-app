import React, { useState, useEffect } from 'react';
import { getRequest, postRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { validatePassword, validatePasswordMatch, validateRequired } from '../utils/validation';
import toast from 'react-hot-toast';

interface DetailErrors {
  firstName?: string;
  lastName?: string;
}

interface PasswordErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export const Profile: React.FC = () => {
  const { refreshUser } = useAuth();

  // Personal Info Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Validation States
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [detailTouched, setDetailTouched] = useState<Record<string, boolean>>({});
  
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getRequest('/user/details');
        const userObj = response.user || response;
        setFirstName(userObj.first_name || '');
        setLastName(userObj.last_name || '');
        setEmail(userObj.email || '');
      } catch (err) {
        toast.error('Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const validateDetails = (): DetailErrors => {
    const errs: DetailErrors = {};
    const firstErr = validateRequired(firstName, 'First name');
    if (firstErr) errs.firstName = firstErr;
    const lastErr = validateRequired(lastName, 'Last name');
    if (lastErr) errs.lastName = lastErr;
    return errs;
  };

  const handleDetailBlur = (field: string) => {
    setDetailTouched(prev => ({ ...prev, [field]: true }));
    setDetailErrors(validateDetails());
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailTouched({ firstName: true, lastName: true });
    const errs = validateDetails();
    setDetailErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the profile detail errors');
      return;
    }

    setSavingDetails(true);
    try {
      await postRequest('/user/edit-details', {
        first_name: firstName,
        last_name: lastName,
      });
      await refreshUser();
      toast.success('Details updated successfully!');
    } catch (err) {
      toast.error('Failed to update details');
    } finally {
      setSavingDetails(false);
    }
  };

  const validatePasswordForm = (): PasswordErrors => {
    const errs: PasswordErrors = {};
    const passErr = validatePassword(newPassword);
    if (passErr) errs.newPassword = passErr;
    
    const matchErr = validatePasswordMatch(newPassword, confirmPassword);
    if (matchErr) errs.confirmPassword = matchErr;
    return errs;
  };

  const handlePasswordBlur = (field: string) => {
    setPasswordTouched(prev => ({ ...prev, [field]: true }));
    setPasswordErrors(validatePasswordForm());
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched({ newPassword: true, confirmPassword: true });
    const errs = validatePasswordForm();
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please resolve password requirements');
      return;
    }

    setSavingPassword(true);
    try {
      await postRequest('/user/reset-password', {
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTouched({});
      setPasswordErrors({});
      toast.success('Password updated successfully!');
    } catch (err) {
      toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block mb-2" />
          <p className="text-text-secondary text-sm">Retrieving profile...</p>
        </div>
      </div>
    );
  }

  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    digit: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*,.()\-+_={}[\]{};'\\:"|\\/<>?~`]/.test(newPassword),
    match: newPassword === confirmPassword && confirmPassword !== '',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Account Settings</h2>
        <p className="text-text-secondary text-sm">Manage your repository profile information and passwords.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-light-card dark:shadow-none transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <i className="ti ti-user text-accent text-xl" />
              Personal Details
            </h3>
            
            <form onSubmit={handleUpdateDetails} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (detailTouched.firstName) {
                      setDetailErrors(prev => ({ ...prev, firstName: validateRequired(e.target.value, 'First name') || undefined }));
                    }
                  }}
                  onBlur={() => handleDetailBlur('firstName')}
                  className={`w-full px-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none transition-all ${
                    detailTouched.firstName && detailErrors.firstName ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
                  }`}
                  placeholder="First Name"
                />
                {detailTouched.firstName && detailErrors.firstName && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <i className="ti ti-alert-circle text-sm" /> {detailErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (detailTouched.lastName) {
                      setDetailErrors(prev => ({ ...prev, lastName: validateRequired(e.target.value, 'Last name') || undefined }));
                    }
                  }}
                  onBlur={() => handleDetailBlur('lastName')}
                  className={`w-full px-4 py-2.5 bg-background border rounded-xl text-sm focus:outline-none transition-all ${
                    detailTouched.lastName && detailErrors.lastName ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
                  }`}
                  placeholder="Last Name"
                />
                {detailTouched.lastName && detailErrors.lastName && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <i className="ti ti-alert-circle text-sm" /> {detailErrors.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm text-text-secondary cursor-not-allowed focus:outline-none"
                  disabled
                />
              </div>

              <button
                type="submit"
                disabled={savingDetails}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-md shadow-accent/15 flex items-center gap-2 mt-4"
              >
                {savingDetails ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Details'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-light-card dark:shadow-none transition-all">
          <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <i className="ti ti-lock text-accent text-xl" />
            Security Credentials
          </h3>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordTouched.newPassword || passwordTouched.confirmPassword) {
                      setPasswordErrors(prev => ({
                        ...prev,
                        newPassword: validatePassword(e.target.value) || undefined,
                        confirmPassword: validatePasswordMatch(e.target.value, confirmPassword) || undefined
                      }));
                    }
                  }}
                  onBlur={() => handlePasswordBlur('newPassword')}
                  className={`w-full pl-4 pr-11 py-2.5 bg-background border rounded-xl text-sm focus:outline-none transition-all ${
                    passwordTouched.newPassword && passwordErrors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-secondary hover:text-text-primary transition-colors"
                >
                  <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'} text-lg`} />
                </button>
              </div>
              {passwordTouched.newPassword && passwordErrors.newPassword && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <i className="ti ti-alert-circle text-sm" /> {passwordErrors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordTouched.confirmPassword) {
                      setPasswordErrors(prev => ({
                        ...prev,
                        confirmPassword: validatePasswordMatch(newPassword, e.target.value) || undefined
                      }));
                    }
                  }}
                  onBlur={() => handlePasswordBlur('confirmPassword')}
                  className={`w-full pl-4 pr-11 py-2.5 bg-background border rounded-xl text-sm focus:outline-none transition-all ${
                    passwordTouched.confirmPassword && passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-secondary hover:text-text-primary transition-colors"
                >
                  <i className={`ti ${showConfirmPassword ? 'ti-eye-off' : 'ti-eye'} text-lg`} />
                </button>
              </div>
              {passwordTouched.confirmPassword && passwordErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <i className="ti ti-alert-circle text-sm" /> {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Password Checklist */}
            {newPassword && (
              <div className="p-3 bg-background border border-border rounded-xl space-y-1.5 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <i className={`ti ${passwordRequirements.length ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                  At least 8 characters long
                </div>
                <div className="flex items-center gap-2">
                  <i className={`ti ${passwordRequirements.uppercase ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                  At least one uppercase letter (A-Z)
                </div>
                <div className="flex items-center gap-2">
                  <i className={`ti ${passwordRequirements.digit ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                  At least one numeric digit (0-9)
                </div>
                <div className="flex items-center gap-2">
                  <i className={`ti ${passwordRequirements.special ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                  At least one special character (!@#$%^&*)
                </div>
                <div className="flex items-center gap-2">
                  <i className={`ti ${passwordRequirements.match ? 'ti-check text-emerald-500' : 'ti-x text-red-500'}`} />
                  Passwords match
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-md shadow-accent/15 flex items-center gap-2"
            >
              {savingPassword ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
