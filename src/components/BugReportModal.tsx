import React, { useState, useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';
import WalkingGolferSpinner from './WalkingGolferSpinner';
import { useTheme } from '../contexts/ThemeContext';
import ModalShell from './ModalShell';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { effectiveTheme } = useTheme();
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setScreenshot(file);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe the issue you encountered');
      return;
    }

    setLoading(true);
    setError('');
    triggerHaptic('medium');

    try {
      let screenshotUrl = null;

      if (screenshot) {
        const formData = new FormData();
        formData.append('file', screenshot);
        formData.append('folder', 'bug-reports');

        const uploadRes = await fetch('/api/object-storage/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          screenshotUrl = uploadData.url;
        }
      }

      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          screenshotUrl,
          pageUrl: window.location.pathname
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit bug report');
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
    setDescription('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setSuccess(false);
    setError('');
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} title="Report a Bug" size="md">
      <div className="px-6 -mt-2 mb-4">
        <p className="text-sm text-primary/60 dark:text-white/60">
          Help us improve by reporting issues
        </p>
      </div>
      
      <div className="p-6 pt-0">
        {success ? (
          <div className="py-8 flex flex-col items-center text-center animate-pop-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
              <span className="material-symbols-outlined text-3xl">check</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-primary dark:text-white">
              Report Submitted
            </h3>
            <p className="text-primary/60 dark:text-white/60">
              Thank you for helping us improve. Our team will review your report.
            </p>
            <button
              onClick={handleClose}
              className="mt-6 px-6 py-3 rounded-xl font-bold text-sm bg-primary dark:bg-white text-white dark:text-black"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-primary/80 dark:text-white/80">
                What went wrong? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you were trying to do and what happened instead..."
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none transition-colors bg-[#F9F9F7] dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white placeholder:text-primary/40 dark:placeholder:text-white/40 focus:border-primary dark:focus:border-accent focus:ring-1 focus:ring-primary dark:focus:ring-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-primary/80 dark:text-white/80">
                Screenshot (optional)
              </label>
              
              {screenshotPreview ? (
                <div className="relative">
                  <img 
                    src={screenshotPreview} 
                    alt="Screenshot preview" 
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center gap-2 border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40 text-primary/60 dark:text-white/60"
                >
                  <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                  <span className="text-sm">Tap to add screenshot</span>
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary dark:bg-accent text-white dark:text-primary hover:bg-primary/90 dark:hover:opacity-90"
            >
              {loading ? (
                <WalkingGolferSpinner size="sm" variant={effectiveTheme === 'dark' ? 'dark' : 'light'} />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  Submit Report
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </ModalShell>
  );
};

export default BugReportModal;
