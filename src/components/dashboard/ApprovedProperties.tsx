import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Maximize, Calendar, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

interface ApprovedProperty {
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
  assignment_status: 'approved' | 'published';
  assigned_at: string;
  approved_at: string;
}

const ApprovedProperties: React.FC = () => {
  const { user } = useAuth();
  const [approvedProperties, setApprovedProperties] = useState<ApprovedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchApprovedProperties();
    }
  }, [user]);

  const fetchApprovedProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_approved_properties', {
        user_uuid: user?.id
      });

      if (error) throw error;
      setApprovedProperties(data || []);
    } catch (error) {
      console.error('Error fetching approved properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (approvedProperties.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Approved Properties Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Properties you approve will appear here once they're published.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          My Approved Properties
        </h2>
        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm">
          {approvedProperties.length} {approvedProperties.length === 1 ? 'property' : 'properties'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {approvedProperties.map((property) => (
          <div 
            key={property.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200"
          >
            {/* Property Image */}
            <div className="relative h-48">
              <img 
                src={property.images[0] || 'https://via.placeholder.com/400x300'} 
                alt={property.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  ✓ Published
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <Link
                  to={`/apartments/${property.id}`}
                  className="p-2 bg-white/80 dark:bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/90 dark:hover:bg-black/70 transition-colors"
                  title="View on site"
                >
                  <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </Link>
              </div>
            </div>
            
            {/* Property Details */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{property.location}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ${property.price.toLocaleString()}
                  </p>
                  <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 text-sm">
                    <Maximize className="w-3 h-3" />
                    <span>{property.size} sqft</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                {property.description}
              </p>

              {/* Property Stats */}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                <span>{property.bedrooms} beds</span>
                <span>{property.bathrooms} baths</span>
                <span>{property.type}</span>
                <span>Built {property.year_built}</span>
              </div>

              {/* Timeline Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Assigned: {formatDate(property.assigned_at)}</span>
                </div>
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Approved: {formatDate(property.approved_at)}</span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={`/apartments/${property.id}`}
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Property Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovedProperties;