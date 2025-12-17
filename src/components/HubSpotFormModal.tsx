import React, { useState } from 'react';
import { triggerHaptic } from '../utils/haptics';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

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
}

const HubSpotFormModal: React.FC<HubSpotFormModalProps> = ({
  isOpen,
  onClose,
  formType,
  title,
  subtitle,
  fields,
  submitButtonText = 'Submit'
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
      const fieldArray = Object.entries(formData).map(([name, value]) => ({
        name,
        value
      }));

      const response = await fetch(`${API_BASE}/api/hubspot/forms/${formType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fieldArray,
          context: {
            pageUri: window.location.href,
            pageName: document.title
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Submission failed');
      }

      triggerHaptic('success');
      setSuccess(true);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-[#F2F2EC] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
        >
          <span className="material-symbols-outlined text-xl text-primary">close</span>
        </button>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">Thank You!</h3>
              <p className="text-primary/60 mb-6">We've received your submission and will be in touch soon.</p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-primary mb-1">{title}</h2>
              {subtitle && <p className="text-primary/60 text-sm mb-6">{subtitle}</p>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold text-primary mb-1.5 pl-1">
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
                        className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-inset ring-black/10 bg-white focus:ring-2 focus:ring-primary text-primary placeholder:text-gray-400 resize-none"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        name={field.name}
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-inset ring-black/10 bg-white focus:ring-2 focus:ring-primary text-primary"
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
                        className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-inset ring-black/10 bg-white focus:ring-2 focus:ring-primary text-primary placeholder:text-gray-400"
                      />
                    )}
                  </div>
                ))}

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-600 text-sm mt-0.5">error</span>
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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
};

export default HubSpotFormModal;
