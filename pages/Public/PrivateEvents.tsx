import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PrivateEvents: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Load Typeform script
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
        if(document.body.contains(script)){
            document.body.removeChild(script);
        }
    }
  }, []);

  return (
    <div className="w-full h-screen bg-background-light dark:bg-background-dark relative flex flex-col">
        {/* Close Button for UX since it acts like a modal page */}
        <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 right-6 z-50 p-2 bg-white/80 dark:bg-black/50 backdrop-blur rounded-full text-primary dark:text-white shadow-sm hover:scale-105 transition-transform"
        >
            <span className="material-symbols-outlined">close</span>
        </button>
        
        {/* Typeform Container */}
        <div data-tf-live="01KC2B5V8D1K5ZKW7BERZ4QDQ1" className="flex-1 w-full h-full"></div>
    </div>
  );
};

export default PrivateEvents;