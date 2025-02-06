import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const access_token = searchParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Authentication failed. Please try again.');
      navigate('/signin');
      return;
    }

    if (!access_token || !refresh_token) {
      toast.error('Invalid authentication response');
      navigate('/signin');
      return;
    }

    // Clear any existing tokens
    localStorage.clear();
    
    // Set new tokens
    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('refreshToken', refresh_token);

    // Clear the URL parameters
    window.history.replaceState({}, document.title, '/dashboard');
    
    toast.success('Successfully logged in!');
    navigate('/dashboard');
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2>Authenticating...</h2>
        <p>Please wait while we complete your sign in.</p>
      </div>
    </div>
  );
}

export default AuthCallback;