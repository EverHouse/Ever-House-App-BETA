import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { useData } from '../../contexts/DataContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithMember } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isStaffOrAdmin, setIsStaffOrAdmin] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const isDev = import.meta.env.DEV;

  const checkStaffAdmin = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/auth/check-staff-admin?email=${encodeURIComponent(emailToCheck)}`);
      if (res.ok) {
        const data = await res.json();
        setIsStaffOrAdmin(data.isStaffOrAdmin);
        setHasPassword(data.hasPassword);
        if (data.isStaffOrAdmin) {
          setShowPasswordField(true);
        }
      }
    } catch (err) {
      console.error('Failed to check staff/admin status');
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (email.includes('@')) {
        checkStaffAdmin(email);
      } else {
        setIsStaffOrAdmin(false);
        setHasPassword(false);
        setShowPasswordField(false);
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [email, checkStaffAdmin]);

  const handleDevLogin = async () => {
    setDevLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Dev login failed');
      }
      
      const { member } = await res.json();
      loginWithMember(member);
      navigate('/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Dev login failed');
    } finally {
      setDevLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      loginWithMember(data.member);
      navigate('/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send magic link');
      }
      
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
        <div className="flex-1 flex flex-col justify-center px-6 py-12">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-[#F2F2EC] rounded-full flex items-center justify-center mx-auto text-2xl mb-6 shadow-xl">
                <span className="material-symbols-outlined text-3xl">mail</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-primary">
                Check Your Email
              </h2>
              <p className="mt-4 text-base text-primary/60 font-medium leading-relaxed">
                We've sent a sign-in link to<br />
                <span className="font-bold text-primary">{email}</span>
              </p>
            </div>

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-black/5 space-y-4">
              <div className="flex items-start gap-3 text-left">
                <span className="material-symbols-outlined text-primary/60 mt-0.5">schedule</span>
                <p className="text-sm text-primary/70">
                  The link expires in <span className="font-bold">15 minutes</span>
                </p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <span className="material-symbols-outlined text-primary/60 mt-0.5">inbox</span>
                <p className="text-sm text-primary/70">
                  Check your spam folder if you don't see it
                </p>
              </div>
              
              <hr className="border-black/5" />
              
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full text-center text-sm text-primary/60 hover:text-primary transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto space-y-8">
            
            <div className="text-center">
                <img src="/assets/logos/EH-guy-icon.png" alt="Even House" className="w-16 h-16 mx-auto mb-6 rounded-xl" />
                <h2 className="text-3xl font-bold tracking-tight text-primary">
                    Member's Portal
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                    {isStaffOrAdmin ? 'Sign in with your password or magic link.' : 'Enter your email to receive a sign-in link.'}
                </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-black/5 space-y-4">
                <form onSubmit={showPasswordField && hasPassword ? handlePasswordLogin : handleRequestMagicLink} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="Membership Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-primary placeholder:text-primary/40"
                      required
                      autoFocus
                    />
                    {checkingEmail && (
                      <p className="text-xs text-primary/40 mt-1 pl-1">Checking...</p>
                    )}
                  </div>
                  
                  {showPasswordField && (
                    <div className="animate-pop-in">
                      <input
                        type="password"
                        placeholder={hasPassword ? "Password" : "Set a new password (min 8 chars)"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-primary placeholder:text-primary/40"
                        required={hasPassword}
                        minLength={hasPassword ? undefined : 8}
                      />
                      {!hasPassword && (
                        <p className="text-xs text-primary/50 mt-1 pl-1">
                          No password set yet. Enter one to create it, or use magic link below.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {showPasswordField && hasPassword ? (
                    <button
                      type="submit"
                      disabled={loading || !password}
                      className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">login</span>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  ) : showPasswordField && !hasPassword && password.length >= 8 ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        setError('');
                        try {
                          const res = await fetch('/api/auth/set-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          setHasPassword(true);
                          const loginRes = await fetch('/api/auth/password-login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password }),
                            credentials: 'include'
                          });
                          const loginData = await loginRes.json();
                          if (!loginRes.ok) throw new Error(loginData.error);
                          loginWithMember(loginData.member);
                          navigate('/member/dashboard');
                        } catch (err: any) {
                          setError(err.message || 'Failed to set password');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">key</span>
                      {loading ? 'Setting up...' : 'Set Password & Sign In'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">mail</span>
                      {loading ? 'Sending...' : 'Send Sign-In Link'}
                    </button>
                  )}
                </form>

                {showPasswordField && (
                  <div className="animate-pop-in">
                    <hr className="border-black/10" />
                    <button
                      type="button"
                      onClick={handleRequestMagicLink}
                      disabled={loading}
                      className="flex w-full justify-center items-center gap-2 rounded-xl bg-gray-100 px-3 py-3 text-sm font-bold leading-6 text-primary hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                    >
                      <span className="material-symbols-outlined text-lg">mail</span>
                      Use Magic Link Instead
                    </button>
                  </div>
                )}

                {!showPasswordField && (
                  <p className="text-center text-xs text-primary/50">
                    We'll email you a secure link to sign in instantly.
                  </p>
                )}
                
                {isDev && (
                  <>
                    <hr className="border-black/10" />
                    <button
                      type="button"
                      onClick={handleDevLogin}
                      disabled={devLoading}
                      className="flex w-full justify-center items-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-bold leading-6 text-white hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">developer_mode</span>
                      {devLoading ? 'Logging in...' : 'Dev Login (Test Admin)'}
                    </button>
                    <p className="text-center text-xs text-amber-600">
                      Development only - logs in as testuser@evenhouse.club
                    </p>
                  </>
                )}
            </div>

            <p className="text-center text-sm text-primary/60 font-medium">
                Not a member?{' '}
                <button onClick={() => navigate('/membership')} className="font-bold text-primary hover:underline">
                    Apply today
                </button>
            </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
