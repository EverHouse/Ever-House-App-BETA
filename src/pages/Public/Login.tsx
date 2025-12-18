import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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
                <div className="w-16 h-16 bg-primary text-[#F2F2EC] rounded-full flex items-center justify-center mx-auto text-2xl font-bold tracking-tighter mb-6 shadow-xl">EH</div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">
                    Member's Portal
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                    Enter your email to receive a sign-in link.
                </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-black/5 space-y-4">
                <form onSubmit={handleRequestMagicLink} className="space-y-4">
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
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">mail</span>
                    {loading ? 'Sending...' : 'Send Sign-In Link'}
                  </button>
                </form>

                <p className="text-center text-xs text-primary/50">
                  We'll email you a secure link to sign in instantly.
                </p>
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
