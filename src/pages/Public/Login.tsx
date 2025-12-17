import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { signInWithMagicLink, isSupabaseConfigured } from '../../services/supabase';
import { triggerHaptic } from '../../utils/haptics';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showMagicLink, setShowMagicLink] = useState(false);

  const handleReplitLogin = () => {
    window.location.href = '/api/login';
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setMessage('');
    triggerHaptic('medium');

    const { error } = await signInWithMagicLink(email);

    if (error) {
      setMessage(`Error: ${error.message}`);
      triggerHaptic('error');
    } else {
      setMessage('Check your email for the magic link!');
      triggerHaptic('success');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC]">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto space-y-8">
            
            <div className="text-center">
                <div className="w-16 h-16 bg-primary text-[#F2F2EC] rounded-full flex items-center justify-center mx-auto text-2xl font-bold tracking-tighter mb-6 shadow-xl">EH</div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">
                    Member's Portal
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                    Sign in to access your account.
                </p>
            </div>

            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-black/5 space-y-4">
                {!showMagicLink ? (
                  <>
                    {isSupabaseConfigured ? (
                      <>
                        <button
                            onClick={() => setShowMagicLink(true)}
                            className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">mail</span>
                            Continue with Email
                        </button>
                        
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-black/10"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white px-4 text-primary/40 font-medium">or</span>
                            </div>
                        </div>

                        <button
                            onClick={handleReplitLogin}
                            className="flex w-full justify-center items-center gap-3 rounded-xl bg-white border-2 border-primary px-3 py-4 text-sm font-bold leading-6 text-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">login</span>
                            Sign In with Replit
                        </button>
                      </>
                    ) : (
                      <button
                          onClick={handleReplitLogin}
                          className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98]"
                      >
                          <span className="material-symbols-outlined">login</span>
                          Sign In with Replit
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <form onSubmit={handleMagicLink} className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-primary/70 mb-2">
                          Email address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary"
                          required
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">
                          {loading ? 'hourglass_empty' : 'send'}
                        </span>
                        {loading ? 'Sending...' : 'Send Magic Link'}
                      </button>
                    </form>

                    {message && (
                      <div className={`p-4 rounded-xl text-sm font-medium ${
                        message.includes('Error') 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {message}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowMagicLink(false);
                        setMessage('');
                      }}
                      className="flex w-full justify-center items-center gap-2 text-sm text-primary/60 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Back to sign in options
                    </button>
                  </>
                )}

                {!showMagicLink && (
                  <p className="text-center text-xs text-primary/50">
                    Sign in with your Google, Apple, GitHub account or email.
                  </p>
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
