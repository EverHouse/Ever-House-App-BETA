import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { triggerHaptic } from '../utils/haptics';


const getHubspotCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'hubspotutk') {
      return value;
    }
  }
  return null;
};

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

interface HubSpotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'tour-request' | 'membership' | 'private-hire' | 'guest-checkin';
  title: string;
  subtitle?: string;
  fields: FormField[];
  submitButtonText?: string;
  onSuccess?: () => void;
  additionalFields?: Record<string, string>;
}

const HubSpotFormModal: React.FC<HubSpotFormModalProps> = ({
  isOpen,
  onClose,
  formType,
  title,
  subtitle,
  fields,
  submitButtonText = 'Submit',
  onSuccess,
  additionalFields = {}
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    triggerHaptic('medium');

    try {
      const allFormData = { ...formData, ...additionalFields };
      const fieldArray = Object.entries(allFormData).map(([name, value]) => ({
        name,
        value
      }));

      const hutk = getHubspotCookie();
      const context: Record<string, any> = {
        pageUri: window.location.href,
        pageName: document.title
      };
      if (hutk) {
        context.hutk = hutk;
      }

      const response = await fetch(`/api/hubspot/forms/${formType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fieldArray,
          context
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Submission failed');
      }

      triggerHaptic('success');
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    triggerHaptic('light');
    setFormData({});
    setSuccess(false);
    setError('');
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-none" onClick={handleClose} />
      
      <div className="relative glass-modal w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <button
          onClick={handleClose}
          className="flex-shrink-0 self-end m-4 w-10 h-10 flex items-center justify-center rounded-full glass-button z-10 bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-lg"
        >
          <span className="material-symbols-outlined text-xl text-primary dark:text-white">close</span>
        </button>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">check_circle</span>
              </div>
              <h3 className="text-xl font-bold text-primary dark:text-white mb-2">Thank You!</h3>
              <p className="text-primary/60 dark:text-white/60 mb-6">We've received your submission and will be in touch soon.</p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-primary dark:bg-accent text-white dark:text-brand-green rounded-[2rem] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-[400ms] ease-in-out"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-primary dark:text-white mb-1">{title}</h2>
              {subtitle && <p className="text-primary/60 dark:text-white/60 text-sm mb-6">{subtitle}</p>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold text-primary dark:text-white mb-1.5 pl-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 glass-input text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        name={field.name}
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-4 py-3 glass-input text-primary dark:text-white"
                      >
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-4 py-3 glass-input text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    )}
                  </div>
                ))}

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-700 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm mt-0.5">error</span>
                    <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary dark:bg-accent text-white dark:text-brand-green rounded-[2rem] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-[400ms] ease-in-out disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Submitting...
                    </>
                  ) : (
                    submitButtonText
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HubSpotFormModal;
