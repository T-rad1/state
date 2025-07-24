import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Settings, 
  Home, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Upload,
  Save,
  X,
  Building2,
  Users,
  BarChart3,
  FileText,
  ShoppingCart,
  Download
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { dbClient } from '../../utils/db';
import { testStorageSetup, runStorageDiagnostics } from '../../utils/storageTest';
import PropertyForm from './PropertyForm';
import PurchaseRequestsManager from './PurchaseRequestsManager';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  size: number;
  amenities: string[];
  type: string;
  year_built: number;
  show_on_homepage: boolean;
  assignment_status: string;
  assigned_to_email?: string;
  assigned_to_username?: string;
  assigned_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

interface Settings {
  site_info: {
    title: string;
    description: string;
  };
  contact_info: {
    admin_email: string;
  };
  homepage_background: {
    image_url: string;
  };
}

const AdminPanel: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [settings, setSettings] = useState<Settings>({
    site_info: { title: '', description: '' },
    contact_info: { admin_email: '' },
    homepage_background: { image_url: '' }
  });
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [globalUserManualFile, setGlobalUserManualFile] = useState<File | null>(null);
  const [uploadingUserManual, setUploadingUserManual] = useState(false);
  const [globalUserManualUrl, setGlobalUserManualUrl] = useState<string>('');

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path && ['properties', 'settings', 'analytics', 'purchases'].includes(path)) {
      setActiveTab(path);
    }
  }, [location]);

  useEffect(() => {
    fetchProperties();
    fetchSettings();
  }, []);

  const fetchProperties = async () => {
    try {
      const data = await dbClient.getAllProperties();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      const settingsObj: any = {
        site_info: { title: 'HomeVista', description: 'Find your dream home' },
        contact_info: { admin_email: '' },
        homepage_background: { image_url: 'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg' },
        global_user_manual: { pdf_url: '', filename: '' }
      };

      data?.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      setSettings(settingsObj);
      setGlobalUserManualUrl(settingsObj.global_user_manual?.pdf_url || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleCreateProperty = async (propertyData: any) => {
    try {
      await dbClient.insertProperty(propertyData);
      await fetchProperties();
      setShowPropertyForm(false);
      alert('Property created successfully!');
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Error creating property. Please try again.');
    }
  };

  const handleUpdateProperty = async (propertyData: any) => {
    try {
      await dbClient.updateProperty(propertyData);
      await fetchProperties();
      setEditingProperty(null);
      alert('Property updated successfully!');
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Error updating property. Please try again.');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      await dbClient.deleteProperty(id);
      await fetchProperties();
      alert('Property deleted successfully!');
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error deleting property. Please try again.');
    }
  };

  const toggleHomepageVisibility = async (property: Property) => {
    try {
      const updatedProperty = {
        ...property,
        show_on_homepage: !property.show_on_homepage
      };
      await dbClient.updateProperty(updatedProperty);
      await fetchProperties();
    } catch (error) {
      console.error('Error updating property visibility:', error);
      alert('Error updating property visibility. Please try again.');
    }
  };

  const handleSettingsUpdate = async (key: string, value: any) => {
    try {
      console.log('🔄 Updating setting:', key, 'with value:', value);
      
      // Use upsert to ensure we completely replace the old value
      const { data, error } = await supabase
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() }, 
          { 
            onConflict: 'key',
            ignoreDuplicates: false // Ensure we update existing records
          }
        )
        .select();

      if (error) throw error;
      
      console.log('✅ Setting updated successfully:', data);

      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Dispatch custom event for real-time updates
      if (key === 'site_info') {
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: value }));
      }
      
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Error updating settings. Please try again.');
    }
  };

  const handleBackgroundImageUpload = async () => {
    if (!backgroundImageFile) return;

    try {
      setUploadingBackground(true);
      
      const fileExt = backgroundImageFile.name.split('.').pop();
      const fileName = `homepage-background-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(filePath, backgroundImageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      await handleSettingsUpdate('homepage_background', { image_url: publicUrl });
      
      // Dispatch specific event for background updates
      window.dispatchEvent(new CustomEvent('backgroundUpdated', { detail: { image_url: publicUrl } }));
      
      setBackgroundImageFile(null);
    } catch (error) {
      console.error('Error uploading background image:', error);
      alert('Error uploading background image. Please try again.');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleGlobalUserManualUpload = async () => {
    if (!globalUserManualFile) return;

    try {
      setUploadingUserManual(true);
      
      console.log('🔄 Starting user manual upload process...');
      console.log('📄 File details:', {
        name: globalUserManualFile.name,
        size: globalUserManualFile.size,
        type: globalUserManualFile.type
      });
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (globalUserManualFile.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      // Validate file type
      if (globalUserManualFile.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      const fileExt = globalUserManualFile.name.split('.').pop();
      const fileName = `global-user-manual-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      console.log('📁 Upload path:', filePath);
      
      // Delete existing global user manual if it exists
      if (globalUserManualUrl) {
        try {
          // Extract the file path from the URL
          const urlParts = globalUserManualUrl.split('/');
          // Look for the storage path after the bucket name
          const storageIndex = urlParts.findIndex(part => part === 'storage');
          if (storageIndex !== -1) {
            // Find the path after /v1/object/public/property-images/
            const pathStartIndex = urlParts.findIndex(part => part === 'property-images');
            if (pathStartIndex !== -1 && pathStartIndex < urlParts.length - 1) {
              const existingPath = urlParts.slice(pathStartIndex + 1).join('/');
              console.log('🗑️ Deleting existing file:', existingPath);
              
              const { error: deleteError } = await supabase.storage
                .from('property-images')
                .remove([existingPath]);
                
              if (deleteError) {
                console.warn('⚠️ Could not delete existing file:', deleteError);
              } else {
                console.log('✅ Existing file deleted successfully');
              }
            }
          }
        } catch (deleteError) {
          console.warn('⚠️ Could not delete existing user manual:', deleteError);
        }
      }

      console.log('📤 Starting file upload...');
      
      // Upload new file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, globalUserManualFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      console.log('🔗 Generated public URL:', publicUrl);

      // Test if the file is accessible
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (!testResponse.ok) {
          console.warn('⚠️ File may not be accessible:', testResponse.status);
        } else {
          console.log('✅ File is accessible via public URL');
        }
      } catch (testError) {
        console.warn('⚠️ Could not test file accessibility:', testError);
      }

      // Update settings
      console.log('💾 Updating settings...');
      
      const settingValue = { 
        pdf_url: publicUrl,
        filename: globalUserManualFile.name,
        uploaded_at: new Date().toISOString()
      };
      
      const { data: settingData, error: settingError } = await supabase
        .from('settings')
        .upsert(
          { 
            key: 'global_user_manual', 
            value: settingValue,
            updated_at: new Date().toISOString() 
          }, 
          { 
            onConflict: 'key',
            ignoreDuplicates: false
          }
        )
        .select();

      if (settingError) {
        console.error('❌ Settings update error:', settingError);
        throw new Error(`Settings update failed: ${settingError.message}`);
      }

      console.log('✅ Settings updated successfully:', settingData);
      
      // Update local state
      setSettings(prev => ({ 
        ...prev, 
        global_user_manual: settingValue
      }));
      
      setGlobalUserManualFile(null);
      setGlobalUserManualUrl(publicUrl);
      
      console.log('🎉 User manual upload completed successfully');
      alert('User manual uploaded successfully!');
      
    } catch (error) {
      console.error('💥 Error uploading global user manual:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error uploading user manual: ${errorMessage}`);
    } finally {
      setUploadingUserManual(false);
    }
  };

  const handleGlobalUserManualUploadOld = async () => {
    if (!globalUserManualFile) return;

    try {
      setUploadingUserManual(true);
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (globalUserManualFile.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      // Validate file type
      if (globalUserManualFile.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      const fileExt = globalUserManualFile.name.split('.').pop();
      const fileName = `global-user-manual-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Delete existing global user manual if it exists
      if (globalUserManualUrl) {
        try {
          // Extract the file path from the URL
          const urlParts = globalUserManualUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'property-images');
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            const existingPath = urlParts.slice(bucketIndex + 1).join('/');
            console.log('Attempting to delete existing file:', existingPath);
            
            await supabase.storage
              .from('property-images')
              .remove([existingPath]);
          }
        } catch (deleteError) {
          console.warn('Could not delete existing user manual:', deleteError);
        }
      }

      console.log('Uploading file to path:', filePath);
      console.log('File details:', {
        name: globalUserManualFile.name,
        size: globalUserManualFile.size,
        type: globalUserManualFile.type
      });

      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(filePath, globalUserManualFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      console.log('Upload successful:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);

      await handleSettingsUpdate('global_user_manual', { 
        pdf_url: publicUrl,
        filename: globalUserManualFile.name
      });
      
      setGlobalUserManualFile(null);
      setGlobalUserManualUrl(publicUrl);
      
      console.log('Global user manual upload completed successfully');
    } catch (error) {
      console.error('Error uploading global user manual:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error uploading user manual: ${errorMessage}`);
    } finally {
      setUploadingUserManual(false);
    }
  };

  const getStatusBadge = (property: Property) => {
    if (property.assignment_status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
          Pending Approval
        </span>
      );
    } else if (property.assignment_status === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
          Approved
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          Published
        </span>
      );
    }
  };

  const renderPropertiesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Properties Management</h2>
        <button
          onClick={() => setShowPropertyForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Property
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Homepage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={property.images[0] || 'https://via.placeholder.com/48'}
                            alt={property.title}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {property.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {property.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${property.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {property.bedrooms} bed, {property.bathrooms} bath
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(property)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {property.assigned_to_email || property.assigned_to_username ? (
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white">
                            {property.assigned_to_email || property.assigned_to_username}
                          </div>
                          {property.assigned_at && (
                            <div className="text-gray-500 dark:text-gray-400">
                              {new Date(property.assigned_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleHomepageVisibility(property)}
                        className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          property.show_on_homepage
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {property.show_on_homepage ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingProperty(property)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(property.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Property Form Modal */}
      {(showPropertyForm || editingProperty) && (
        <PropertyForm
          onSubmit={editingProperty ? handleUpdateProperty : handleCreateProperty}
          onCancel={() => {
            setShowPropertyForm(false);
            setEditingProperty(null);
          }}
          initialData={editingProperty}
          isEditing={!!editingProperty}
        />
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Site Settings</h2>

      {/* Site Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Site Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Title
            </label>
            <input
              type="text"
              value={settings.site_info.title}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                site_info: { ...prev.site_info, title: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Description
            </label>
            <textarea
              value={settings.site_info.description}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                site_info: { ...prev.site_info, description: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => handleSettingsUpdate('site_info', settings.site_info)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Site Information
          </button>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={settings.contact_info.admin_email}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                contact_info: { ...prev.contact_info, admin_email: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => handleSettingsUpdate('contact_info', settings.contact_info)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Contact Information
          </button>
        </div>
      </div>

      {/* Homepage Background */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Homepage Background</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Background Image
            </label>
            {settings.homepage_background.image_url && (
              <div className="mb-4">
                <img
                  src={settings.homepage_background.image_url}
                  alt="Current background"
                  className="w-full h-32 object-cover rounded-md border"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload New Background Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBackgroundImageFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          {backgroundImageFile && (
            <button
              onClick={handleBackgroundImageUpload}
              disabled={uploadingBackground}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingBackground ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Background Image
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Global User Manual */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Global User Manual</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload a single user manual that will be available for all properties when users click "User Manual" in the purchase modal.
        </p>
        
        <div className="space-y-4">
          {/* Current Global User Manual */}
          {settings.global_user_manual?.pdf_url && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Global User Manual
              </label>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md border">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {settings.global_user_manual.filename || 'Global User Manual'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <a
                    href={settings.global_user_manual.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Upload New Global User Manual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload New Global User Manual
            </label>
            <div className="mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported: PDF files only, max 10MB
              </p>
              <button
                type="button"
                onClick={runStorageDiagnostics}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline mt-1"
              >
                Run Storage Diagnostics
              </button>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setGlobalUserManualFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {globalUserManualFile && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Selected: {globalUserManualFile.name} ({(globalUserManualFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>
          
          {globalUserManualFile && (
            <button
              onClick={handleGlobalUserManualUpload}
              disabled={uploadingUserManual}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingUserManual ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Global User Manual
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{properties.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Featured Properties</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {properties.filter(p => p.show_on_homepage).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Properties</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {properties.filter(p => p.assigned_to_email || p.assigned_to_username).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Status Distribution</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Published</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {properties.filter(p => p.assignment_status === 'published').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Pending Approval</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {properties.filter(p => p.assignment_status === 'pending').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Approved</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {properties.filter(p => p.assignment_status === 'approved').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Admin Panel</h1>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'properties'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Building2 className="w-5 h-5 mr-3" />
                  Properties
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'purchases'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 mr-3" />
                  Purchase Requests
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'properties' && renderPropertiesTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
            {activeTab === 'purchases' && <PurchaseRequestsManager />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;