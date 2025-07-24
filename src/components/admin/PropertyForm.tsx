import React, { useState, useRef } from 'react';
import { X, Upload, Plus, User, Mail } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface PropertyFormProps {
  onSubmit: (property: any) => void;
  onCancel: () => void;
  initialData?: any;
  isEditing?: boolean;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    location: initialData?.location || '',
    bedrooms: initialData?.bedrooms || 1,
    bathrooms: initialData?.bathrooms || 1,
    size: initialData?.size || '',
    type: initialData?.type || 'apartment',
    year_built: initialData?.year_built || new Date().getFullYear(),
    amenities: initialData?.amenities || [],
    show_on_homepage: initialData?.show_on_homepage || false,
    // Assignment fields
    assigned_to_email: initialData?.assigned_to_email || '',
    assigned_to_username: initialData?.assigned_to_username || '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || []);
  const [newAmenity, setNewAmenity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of selectedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `properties/${fileName}`;

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    return uploadedUrls;
  };
  
  const findUserByEmailOrUsername = async (email: string, username: string) => {
    if (!email && !username) return null;

    try {
      const { data, error } = await supabase.rpc('find_user_by_email_or_username', {
        search_email: email || null,
        search_username: username || null
      });

      if (error) {
        console.error('Error finding user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload new images
      const newImageUrls = selectedFiles.length > 0 ? await uploadImages() : [];
      // Combine existing and new images
      const allImages = [...existingImages, ...newImageUrls];

      // Determine assignment status and user ID
      let assignmentStatus = 'published';
      let assignedToUserId = null;
      let assignedAt = null;

      // Check if property is being assigned to a specific user
      if (formData.assigned_to_email || formData.assigned_to_username) {
        assignedToUserId = await findUserByEmailOrUsername(
          formData.assigned_to_email, 
          formData.assigned_to_username
        );
        
        if (assignedToUserId) {
          assignmentStatus = 'pending';
          assignedAt = new Date().toISOString();
        } else {
          // If user not found, show warning but continue with normal publication
          alert('Warning: User not found. Property will be published normally instead of being assigned privately.');
        }
      }

      const propertyData = {
        id: initialData?.id || uuidv4(),
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price.toString()),
        location: formData.location,
        images: allImages,
        bedrooms: parseInt(formData.bedrooms.toString()),
        bathrooms: parseFloat(formData.bathrooms.toString()),
        size: parseFloat(formData.size.toString()),
        amenities: formData.amenities,
        type: formData.type,
        year_built: parseInt(formData.year_built.toString()),
        show_on_homepage: formData.show_on_homepage,
        // Assignment fields
        assigned_to_user_id: assignedToUserId,
        assigned_to_email: formData.assigned_to_email || null,
        assigned_to_username: formData.assigned_to_username || null,
        assignment_status: assignmentStatus,
        assigned_at: assignedAt,
      };

      await onSubmit(propertyData);
    } catch (error) {
      console.error('Error submitting property:', error);
      alert('Error submitting property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Property' : 'Add New Property'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Beautiful Downtown Apartment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="250000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="123 Main St, Downtown, City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the property features, location benefits, and unique selling points..."
              />
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size (sqft)
                </label>
                <input
                  type="number"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="studio">Studio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year Built
                </label>
                <input
                  type="number"
                  name="year_built"
                  value={formData.year_built}
                  onChange={handleInputChange}
                  min="1800"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Private Assignment Section */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Assign this property to a specific user (optional)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                If you assign this property to a user, it will be sent privately to them for approval before being published publicly.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    User Email (optional)
                  </label>
                  <input
                    type="email"
                    name="assigned_to_email"
                    value={formData.assigned_to_email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Username (optional)
                  </label>
                  <input
                    type="text"
                    name="assigned_to_username"
                    value={formData.assigned_to_username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="John Doe or john_doe"
                  />
                </div>
              </div>

              {(formData.assigned_to_email || formData.assigned_to_username) && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> This property will be sent privately to the specified user and will not appear publicly until they approve it.
                  </p>
                </div>
              )}
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property Images
              </label>
              
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Current Images:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Property ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">New Images to Upload:</h4>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </button>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amenities
              </label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add an amenity"
                />
                <button
                  type="button"
                  onClick={addAmenity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(index)}
                      className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Homepage Display */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="show_on_homepage"
                id="show_on_homepage"
                checked={formData.show_on_homepage}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_on_homepage" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Show on Homepage (Featured Properties)
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Property' : 'Create Property'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PropertyForm;