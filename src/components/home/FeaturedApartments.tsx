import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Maximize, Plus } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import FavoriteButton from '../common/FavoriteButton';

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
  created_at?: string;
  updated_at?: string;
}

const FeaturedApartments: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      console.log('🏠 Fetching properties...');
      setLoading(true);
      setError(null);
      
      // Simple query to get all properties
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('❌ Error fetching properties:', fetchError);
        throw fetchError;
      }

      console.log('✅ Properties fetched:', data?.length || 0);
      console.log('📋 Raw data:', data);
      
      if (!data || data.length === 0) {
        console.log('📋 No properties found, using fallback data');
        // Use hardcoded fallback data to ensure something shows
        const fallbackProperties: Property[] = [
          {
            id: 'fallback-1',
            title: 'Modern Downtown Apartment',
            description: 'Beautiful modern apartment in the heart of downtown with stunning city views.',
            price: 450000,
            location: 'Downtown District, Metropolitan City',
            images: [
              'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800'
            ],
            bedrooms: 2,
            bathrooms: 2,
            size: 1200,
            amenities: ['Air Conditioning', 'Balcony', 'Gym Access', 'Parking'],
            type: 'apartment',
            year_built: 2021,
            show_on_homepage: true,
            assignment_status: 'published'
          },
          {
            id: 'fallback-2',
            title: 'Luxury Waterfront Condo',
            description: 'Spectacular waterfront condominium with panoramic ocean views.',
            price: 750000,
            location: 'Waterfront District, Coastal City',
            images: [
              'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800'
            ],
            bedrooms: 3,
            bathrooms: 2.5,
            size: 1800,
            amenities: ['Ocean View', 'Concierge', 'Spa', 'Marina Access'],
            type: 'condo',
            year_built: 2020,
            show_on_homepage: true,
            assignment_status: 'published'
          },
          {
            id: 'fallback-3',
            title: 'Charming Garden Townhouse',
            description: 'Elegant townhouse with private garden, perfect for families.',
            price: 320000,
            location: 'Garden District, Suburban Area',
            images: [
              'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800',
              'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg?auto=compress&cs=tinysrgb&w=800'
            ],
            bedrooms: 3,
            bathrooms: 2,
            size: 1500,
            amenities: ['Private Garden', 'Fireplace', 'Garage', 'Pet Friendly'],
            type: 'townhouse',
            year_built: 2019,
            show_on_homepage: true,
            assignment_status: 'published'
          }
        ];
        setProperties(fallbackProperties);
        return;
      }

      // Filter for published properties
      const publishedProperties = data.filter(p => 
        p.assignment_status === 'published' || p.assignment_status === 'approved'
      );
      
      console.log('✅ Published properties:', publishedProperties.length);

      if (publishedProperties.length === 0) {
        console.log('⚠️ No published properties, showing all');
        setProperties(data.slice(0, 8));
      } else {
        // Prefer homepage featured properties
        const featuredProperties = publishedProperties.filter(p => p.show_on_homepage);
        
        if (featuredProperties.length > 0) {
          console.log('✅ Using featured properties:', featuredProperties.length);
          setProperties(featuredProperties.slice(0, 8));
        } else {
          console.log('📋 Using all published properties');
          setProperties(publishedProperties.slice(0, 8));
        }
      }
      
    } catch (err) {
      console.error('💥 Error in fetchProperties:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load properties';
      setError(errorMessage);
      
      // Even on error, show fallback data so the page isn't empty
      const fallbackProperties: Property[] = [
        {
          id: 'error-fallback-1',
          title: 'Beautiful Modern Apartment',
          description: 'Stunning apartment with modern amenities and great location.',
          price: 425000,
          location: 'City Center, Downtown',
          images: [
            'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg?auto=compress&cs=tinysrgb&w=800'
          ],
          bedrooms: 2,
          bathrooms: 2,
          size: 1100,
          amenities: ['Air Conditioning', 'Balcony', 'Parking'],
          type: 'apartment',
          year_built: 2020,
          show_on_homepage: true,
          assignment_status: 'published'
        }
      ];
      setProperties(fallbackProperties);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600 dark:text-gray-300">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {properties.map((property) => {
        // Ensure we have a valid image URL
        const imageUrl = property.images?.[0] || 'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg?auto=compress&cs=tinysrgb&w=800';
        
        return (
          <div 
            key={property.id} 
            className="bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50"
          >
            <div className="relative">
              <img 
                src={imageUrl}
                alt={property.title} 
                className="w-full h-52 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error('❌ Image failed to load:', target.src);
                  // Use a different fallback image
                  target.src = 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800';
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully for:', property.title);
                }}
              />
              <div className="absolute top-3 right-3">
                <FavoriteButton propertyId={property.id} />
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between mb-2">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ${typeof property.price === 'number' ? property.price.toLocaleString() : '0'}
                </p>
                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                  <Maximize className="w-4 h-4" />
                  <span className="text-gray-900 dark:text-gray-200">
                    {property.size || 0} sqft
                  </span>
                </div>
              </div>
              
              <Link to={`/apartments/${property.id}`}>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                  {property.title}
                </h3>
              </Link>
              
              <div className="flex items-center mb-3 text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <p className="text-sm truncate text-gray-900 dark:text-gray-200">
                  {property.location}
                </p>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="text-gray-900 dark:text-gray-200">
                  Bedrooms: {property.bedrooms || 0}
                </div>
                <div className="text-gray-900 dark:text-gray-200">
                  Bathrooms: {property.bathrooms || 0}
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50/80 dark:bg-black/30 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-600/50 flex justify-between">
              <Link 
                to={`/apartments/${property.id}`}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
              >
                View Details
              </Link>
              <button className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex items-center text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Compare
              </button>
            </div>
          </div>
        );
      })}
      
      {error && (
        <div className="col-span-full text-center py-4">
          <div className="text-red-600 dark:text-red-400 text-sm">
            Database connection issue: {error}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            Showing fallback data. Check console for details.
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedApartments;