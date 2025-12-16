import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AIConcierge: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null;
};

export default AIConcierge;