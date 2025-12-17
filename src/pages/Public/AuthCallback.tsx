import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!isSupabaseConfigured) {
          setError('Supabase is not configured. Please contact support.');
          return;
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorDescription = hashParams.get('error_description');
        
        if (errorDescription) {
          setError(decodeURIComponent(errorDescription));
          return;
        }
        
        let session = null;
        
        if (accessToken && refreshToken) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (setSessionError) {
            setError(setSessionError.message);
            return;
          }
          
          session = data.session;
          
          if (window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else {
          const { data: { session: existingSession }, error: authError } = await supabase.auth.getSession();
          
          if (authError) {
            setError(authError.message);
            return;
          }
          
          session = existingSession;
        }

        if (session?.user) {
          const user = session.user;
          
          await fetch('/api/auth/supabase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: user.id,
              email: user.email,
              firstName: user.user_metadata?.first_name || user.email?.split('@')[0] || '',
              lastName: user.user_metadata?.last_name || '',
            }),
          });

          navigate('/dashboard', { replace: true });
        } else {
          setError('No session found. Please try signing in again.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during sign in.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F2F2EC] items-center justify-center px-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-black/5 max-w-md w-full text-center">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-primary mb-2">Sign In Error</h2>
          <p className="text-primary/60 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-primary/60 font-medium">Signing you in...</p>
    </div>
  );
};

export default AuthCallback;
