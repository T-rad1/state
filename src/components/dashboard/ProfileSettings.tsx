import React, { useState, useRef } from 'react';
import { User, Mail, Lock, Camera, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const uploadProfilePicture = async (): Promise<string | null> => {
    if (!profilePicture || !user) return null;

    try {
      console.log('Starting profile picture upload...');
      
      const fileExt = profilePicture.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading profile picture to:', filePath);

      // Delete existing profile picture if it exists (but don't fail if this doesn't work)
      try {
        const { data: existingFiles } = await supabase.storage
          .from('profile-pictures')
          .list(user.id);

        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(file => `${user.id}/${file.name}`);
          console.log('Deleting existing files:', filesToDelete);
          
          await supabase.storage
            .from('profile-pictures')
            .remove(filesToDelete);
        }
      } catch (deleteError) {
        console.warn('Warning: Could not delete existing files:', deleteError);
        // Continue with upload even if deletion fails
      }

      // Upload new profile picture
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, profilePicture, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);

      // Add cache busting parameter to ensure image refreshes
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      
      return cacheBustedUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (!user) throw new Error('User not found');

      console.log('Starting profile update process...');

      let profilePictureUrl = null;

      // Step 1: Upload profile picture if selected
      if (profilePicture) {
        console.log('Starting profile picture upload...');
        try {
          profilePictureUrl = await uploadProfilePicture();
          console.log('Profile picture uploaded, URL:', profilePictureUrl);
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError);
          // Don't fail the entire update if just the picture upload fails
          setError('Profile updated but image upload failed. Please try uploading the image again.');
        }
      }

      // Step 2: Update password first (if provided) to avoid session issues
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }

        if (formData.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        console.log('Updating password...');
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (passwordError) {
          console.error('Error updating password:', passwordError);
          throw new Error(`Failed to update password: ${passwordError.message}`);
        }

        console.log('Password updated successfully');
      }

      // Step 3: Update email if changed (do this before other updates to avoid conflicts)
      if (formData.email !== user.email) {
        console.log('Updating email from', user.email, 'to', formData.email);
        
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) {
          console.error('Error updating email:', emailError);
          throw new Error(`Failed to update email: ${emailError.message}`);
        }

        console.log('Email updated successfully');
      }

      // Step 4: Update user profile in users table (but don't fail if this doesn't work)
      try {
        // First check if user exists in users table
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        const updateData: any = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          updated_at: new Date().toISOString()
        };

        if (profilePictureUrl) {
          updateData.profile_picture_url = profilePictureUrl;
        }

        if (checkError && checkError.code === 'PGRST116') {
          // User doesn't exist, create them
          console.log('User not found in users table, creating...');
          
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              username: formData.firstName || 'user',
              profile_picture_url: profilePictureUrl || user.profilePictureUrl || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error creating user in users table:', insertError);
            // Don't fail - the auth update was successful
            console.warn('Profile updated in auth but not in users table');
          } else {
            console.log('User created successfully in users table');
          }
        } else if (checkError) {
          console.error('Error checking user existence:', checkError);
          // Don't fail - the auth update was successful
          console.warn('Could not update users table');
        } else {
          // User exists, update them
          console.log('User exists, updating...');
          
          const { error: profileError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id);

          if (profileError) {
            console.error('Error updating users table:', profileError);
            // Don't fail - the auth update was successful
            console.warn('Profile updated in auth but not in users table');
          } else {
            console.log('Users table updated successfully');
          }
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        // Don't fail - the auth update was successful
        console.warn('Profile updated in auth but database sync failed');
      }

      // Step 5: Update auth user metadata (be very careful here)
      try {
        const authUpdateData: any = {
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
          }
        };

        if (profilePictureUrl) {
          authUpdateData.data.profile_picture_url = profilePictureUrl;
        }

        console.log('Updating auth user metadata with:', authUpdateData);

        const { error: metadataError } = await supabase.auth.updateUser(authUpdateData);

        if (metadataError) {
          console.error('Error updating auth metadata:', metadataError);
          // Don't throw here - profile was already updated
          console.warn('Auth metadata update failed, but profile was saved');
        } else {
          console.log('Auth metadata updated successfully');
        }
      } catch (metadataError) {
        console.error('Auth metadata update failed:', metadataError);
        // Don't throw - the important data is already saved
      }

      setSuccess('Profile updated successfully!');
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // Clear profile picture selection
      setProfilePicture(null);
      setProfilePicturePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh the page after a short delay to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCurrentProfilePicture = () => {
    if (profilePicturePreview) return profilePicturePreview;
    
    // Get current user's profile picture or use default
    return user?.profilePictureUrl || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Profile Settings
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-colors">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Picture</h3>
          
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img
                src={getCurrentProfilePicture()}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-600 shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1';
                }}
              />
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
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Change Picture
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
              {profilePicture && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  New image selected: {profilePicture.name}
                </p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePictureChange}
            className="hidden"
          />
        </div>

        {/* Personal Information */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-colors">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name
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
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  placeholder="First Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name
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
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  placeholder="Last Name"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                placeholder="Email Address"
              />
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-colors">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Leave blank if you don't want to change your password
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  placeholder="New Password (min. 6 characters)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  placeholder="Confirm New Password"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;