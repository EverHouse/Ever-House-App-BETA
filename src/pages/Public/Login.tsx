import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleReplitLogin = () => {
    window.location.href = '/api/login';
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
                <button
                    onClick={handleReplitLogin}
                    className="flex w-full justify-center items-center gap-3 rounded-xl bg-primary px-3 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98]"
                >
                    <span className="material-symbols-outlined">login</span>
                    Sign In
                </button>

                <p className="text-center text-xs text-primary/50">
                    Sign in with your Google, Apple, GitHub account or email.
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
