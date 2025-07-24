import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('📝 Starting signup process for:', formData.email);
      
      // Validation
      if (!formData.firstName.trim()) {
        throw new Error('First name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!formData.password.trim()) {
        throw new Error('Password is required');
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Sign up the user first
      console.log('🔐 Creating user account...');
      const signupResult = await signup(
        formData.email.trim(),
        formData.password,
        formData.firstName.trim(),
        formData.lastName.trim() || undefined
      );

      console.log('✅ User account created successfully');

      // If signup was successful and we have a user, upload profile picture
      if (signupResult.user && profilePicture) {
        console.log('📸 Uploading profile picture...');
        
        try {
          const fileExt = profilePicture.name.split('.').pop();
          const fileName = `avatar.${fileExt}`;
          const filePath = `${signupResult.user.id}/${fileName}`;

          // Upload profile picture
          const { data, error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, profilePicture, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('❌ Profile picture upload failed:', uploadError);
            throw uploadError;
          }

          console.log('✅ Profile picture uploaded successfully');

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

          // Update user profile with picture URL
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              profile_picture_url: publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', signupResult.user.id);

          if (updateError) {
            console.error('❌ Failed to update profile picture URL:', updateError);
            // Don't fail signup if this fails
          }

          // Update auth user metadata
          try {
            await supabase.auth.updateUser({
              data: {
                profile_picture_url: publicUrl
              }
            });
          } catch (metadataError) {
            console.error('❌ Failed to update auth metadata:', metadataError);
            // Don't fail signup if this fails
          }

          console.log('✅ Profile picture URL updated successfully');
        } catch (uploadError) {
          console.error('⚠️ Profile picture upload failed, but continuing with signup:', uploadError);
          // Don't fail signup if profile picture upload fails
        }
      }

      console.log('🎉 Signup process completed, redirecting to dashboard...');
      
      // Redirect to dashboard immediately after successful signup
      navigate('/dashboard');
    } catch (err: any) {
      console.error('💥 Signup failed:', err);
      
      if (err?.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please try logging in instead.');
      } else if (err?.message?.includes('Password should be at least 6 characters')) {
        setError('Password must be at least 6 characters long.');
      } else if (err?.message?.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (err?.message?.includes('Email not confirmed')) {
        setError('There was an issue with account creation. Please try again or contact support.');
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('An error occurred during registration. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setProfilePicture(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(''); // Clear any previous errors
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Profile Picture Upload */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mx-auto">
                {profilePicturePreview ? (
                  <img
                    src={profilePicturePreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              
              {profilePicturePreview && (
                <button
                  type="button"
                  onClick={removeProfilePicture}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Profile picture (optional)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
          </div>

          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="sr-only">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                    placeholder="First Name *"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="sr-only">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                    placeholder="Last Name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Email address *"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Password (min. 6 characters) *"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Confirm Password *"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;