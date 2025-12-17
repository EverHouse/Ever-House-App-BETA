import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Footer } from './Landing';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useData();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    
    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Membership not found. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC]">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto space-y-8">
            
            <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <img
                    src="/assets/logos/EH-guy-icon.png"
                    alt="Even House"
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">
                    Member's Portal
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                    Enter your email to access your account.
                </p>
            </div>

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-black/5">
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-primary pl-1">
                            Email address
                        </label>
                        <div className="mt-2">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-xl border-0 py-4 px-4 text-primary shadow-sm ring-1 ring-inset ring-black/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary bg-[#F9F9F7] sm:text-sm sm:leading-6 font-medium"
                                placeholder="alex@example.com"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
                            <span className="material-symbols-outlined text-red-600 text-sm mt-0.5">error</span>
                            <span className="text-sm text-red-600 font-medium">{error}</span>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Logging In...
                                </>
                            ) : (
                                "Log In"
                            )}
                        </button>
                    </div>
                </form>
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