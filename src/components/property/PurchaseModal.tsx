import React, { useState, useEffect } from 'react';
import { X, Download, CreditCard, User, Mail, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    title: string;
    price: number;
  };
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, property }) => {
  const { user } = useAuth();
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Global PDF state
  const [globalPdfUrl, setGlobalPdfUrl] = useState<string | null>(null);
  const [globalPdfFilename, setGlobalPdfFilename] = useState<string | null>(null);
  const [loadingGlobalPdf, setLoadingGlobalPdf] = useState(true);

  // Load global PDF URL on component mount
  useEffect(() => {
    const loadGlobalPdf = async () => {
      try {
        setLoadingGlobalPdf(true);
        
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'global_user_manual')
          .single();

        if (error) {
          console.warn('Could not load global user manual setting:', error);
          return;
        }

        if (data?.value?.pdf_url) {
          setGlobalPdfUrl(data.value.pdf_url);
          setGlobalPdfFilename(data.value.filename || 'User_Manual.pdf');
        }
      } catch (error) {
        console.warn('Error loading global PDF:', error);
      } finally {
        setLoadingGlobalPdf(false);
      }
    };

    if (isOpen) {
      loadGlobalPdf();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserManualDownload = () => {
    // Use global manual
    const pdfUrl = globalPdfUrl;
    const filename = globalPdfFilename || 'User_Manual.pdf';
    
    if (pdfUrl) {
      console.log('Downloading user manual from:', pdfUrl);
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download initiated for:', filename);
    } else {
      console.error('No PDF URL available for download');
      setError('User manual is not available. Please contact support.');
    }
  };

  const handlePlatformFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to submit a purchase request.');
      }

      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('First name and last name are required.');
      }

      const { error: insertError } = await supabase
        .from('purchase_requests')
        .insert({
          property_id: property.id,
          user_id: user.id,
          user_email: user.email,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          message: formData.message.trim() || null,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: '',
        message: ''
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowPlatformForm(false);
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting purchase request:', err);
      setError(err.message || 'Failed to submit purchase request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setShowPlatformForm(false);
    setSubmitSuccess(false);
    setError('');
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: '',
      message: ''
    });
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase Options
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Property Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {property.title}
            </h3>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              ${property.price.toLocaleString()}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {submitSuccess && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md">
              Purchase request submitted successfully! We'll contact you soon.
            </div>
          )}

          {!showPlatformForm ? (
            /* Purchase Options */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Choose your purchase method:
              </h3>

              {/* Platform Option */}
              <button
                onClick={() => setShowPlatformForm(true)}
                className="w-full p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                    <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Platform Purchase</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Submit a purchase request through our platform
                    </p>
                  </div>
                </div>
              </button>

              {/* User Manual Option */}
              <button
                onClick={handleUserManualDownload}
                disabled={!globalPdfUrl}
                className={`w-full p-4 border-2 rounded-lg transition-colors group ${
                  globalPdfUrl
                    ? 'border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full transition-colors ${
                    globalPdfUrl
                      ? 'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/50'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <Download className={`w-6 h-6 ${
                      globalPdfUrl
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">User Manual</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {loadingGlobalPdf ? (
                        'Loading...'
                      ) : globalPdfUrl ? (
                        'Download the user manual (PDF)'
                      ) : (
                        'User manual not available'
                      )}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            /* Platform Purchase Form */
            <div>
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setShowPlatformForm(false)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Purchase Request Form
                </h3>
              </div>

              <form onSubmit={handlePlatformFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="First Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This is your account email and cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Phone Number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={3}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Any additional information or questions..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPlatformForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseModal;