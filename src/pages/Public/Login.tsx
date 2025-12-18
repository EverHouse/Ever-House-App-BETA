import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { useData } from '../../contexts/DataContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useData();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to verify membership');
    } finally {
      setLoading(false);
    }
  };

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
                    Enter your membership email to continue.
                </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-black/5 space-y-4">
                <form onSubmit={handleVerifyEmail} className="space-y-4">
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
                    <span className="material-symbols-outlined">badge</span>
                    {loading ? 'Verifying...' : 'Continue'}
                  </button>
                </form>

                <p className="text-center text-xs text-primary/50">
                  Enter the email address associated with your membership to access your account.
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
