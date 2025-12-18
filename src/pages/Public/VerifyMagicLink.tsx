import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';

const VerifyMagicLink: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithMember } = useData();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setError('Invalid link. Please request a new sign-in link.');
        return;
      }
      
      try {
        const res = await fetch('/api/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to verify link');
        }
        
        const { member } = await res.json();
        loginWithMember(member);
        setStatus('success');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to verify link');
      }
    };
    
    verifyToken();
  }, [searchParams, loginWithMember, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 bg-primary text-[#F2F2EC] rounded-full flex items-center justify-center mx-auto text-2xl mb-6 shadow-xl animate-pulse">
                  <span className="material-symbols-outlined text-3xl">lock_open</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-primary">
                  Signing you in...
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                  Just a moment
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl mb-6 shadow-xl">
                  <span className="material-symbols-outlined text-3xl">check</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-primary">
                  Welcome back!
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                  Redirecting to your dashboard...
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl mb-6 shadow-xl">
                  <span className="material-symbols-outlined text-3xl">error</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-primary">
                  Link Invalid
                </h2>
                <p className="mt-2 text-base text-primary/60 font-medium">
                  {error}
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Request New Link
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyMagicLink;
