import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Maximize, CheckCircle, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

interface AssignedProperty {
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
  assignment_status: 'pending' | 'approved' | 'published';
  assigned_at: string;
  approved_at?: string;
}

const PrivateOffers: React.FC = () => {
  const { user } = useAuth();
  const [assignedProperties, setAssignedProperties] = useState<AssignedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAssignedProperties();
    }
  }, [user]);

  const fetchAssignedProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_assigned_properties', {
        user_uuid: user?.id
      });

      if (error) throw error;
      setAssignedProperties(data || []);
    } catch (error) {
      console.error('Error fetching assigned properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveAndPublish = async (propertyId: string) => {
    try {
      setApprovingId(propertyId);
      
      const { data, error } = await supabase.rpc('approve_and_publish_property', {
        property_id: propertyId
      });

      if (error) throw error;

      if (data) {
        // Refresh the list
        await fetchAssignedProperties();
        
        // Show success message
        alert('Property approved and published successfully!');
      } else {
        throw new Error('Failed to approve property');
      }
    } catch (error) {
      console.error('Error approving property:', error);
      alert('Error approving property. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (assignedProperties.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Private Offers
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have any properties privately shared with you at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Properties Shared With You
        </h2>
        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
          {assignedProperties.length} {assignedProperties.length === 1 ? 'property' : 'properties'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assignedProperties.map((property) => (
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  property.assignment_status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                }`}>
                  {property.assignment_status === 'pending' ? 'Awaiting Your Approval' : 'Approved'}
                </span>
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

              {/* Assignment Info */}
              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Shared on {formatDate(property.assigned_at)}</span>
                </div>
                {property.approved_at && (
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span>Approved on {formatDate(property.approved_at)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Link
                  to={`/apartments/${property.id}`}
                  className="flex-1 text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View Details
                </Link>
                
                {property.assignment_status === 'pending' && (
                  <button
                    onClick={() => approveAndPublish(property.id)}
                    disabled={approvingId === property.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {approvingId === property.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve & Publish
                      </>
                    )}
                  </button>
                )}

                {property.assignment_status === 'approved' && (
                  <div className="flex-1 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md text-center">
                    ✓ Published
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivateOffers;