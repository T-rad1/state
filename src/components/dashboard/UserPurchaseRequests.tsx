import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, CheckCircle, Mail, X, Building2, Bell, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

interface UserPurchaseRequest {
  id: string;
  property_id: string;
  user_email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  message?: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  property_title: string;
  property_price: number;
  property_location: string;
}

const UserPurchaseRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UserPurchaseRequest[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserPurchaseRequests();
      fetchNotifications();
    }
  }, [user]);

  const fetchUserPurchaseRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_purchase_requests_with_property_details');

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching user purchase requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_notifications');
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        request_id: requestId
      });
      
      if (error) throw error;
      
      // Remove from notifications and refresh requests
      setNotifications(prev => prev.filter(n => n.id !== requestId));
      await fetchUserPurchaseRequests();
    } catch (error) {
      console.error('Error marking notification as read:', error);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', icon: Clock, text: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: X, text: 'Rejected' },
      contacted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', icon: Mail, text: 'Contacted' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle, text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: X, text: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your purchase request is being reviewed by our team.';
      case 'approved':
        return 'Your request has been approved! Our team will contact you soon.';
      case 'rejected':
        return 'Your request has been rejected. Please contact us for more information.';
      case 'contacted':
        return 'Our team has reached out to you regarding this request.';
      case 'completed':
        return 'This purchase request has been successfully completed.';
      case 'cancelled':
        return 'This purchase request has been cancelled.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Platform Requests
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You haven't submitted any platform requests yet.
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Browse Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications Section */}
      {notifications.length > 0 && showNotifications && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                New Notifications
              </h3>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {notification.status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-semibold ${
                        notification.status === 'approved' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        Request {notification.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      {notification.property_title}
                    </p>
                    
                    {notification.admin_response && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                        <strong>Admin Response:</strong> {notification.admin_response}
                      </p>
                    )}
                    
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(notification.admin_responded_at)}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Mark as Read
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          My Platform Requests
        </h2>
        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </span>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div 
            key={request.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Request Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link 
                      to={`/apartments/${request.property_id}`}
                      className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {request.property_title}
                    </Link>
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm mt-1">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>{request.property_location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ${request.property_price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Submitted {formatDate(request.created_at)}</span>
                  </div>
                  {request.updated_at !== request.created_at && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Updated {formatDate(request.updated_at)}</span>
                    </div>
                  )}
                </div>

                {request.message && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                      <strong>Your message:</strong> {request.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="lg:text-right">
                <div className="mb-2">
                  {getStatusBadge(request.status)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                  {getStatusDescription(request.status)}
                </p>
                <div className="mt-3">
                  <Link
                    to={`/apartments/${request.property_id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    View Property →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserPurchaseRequests;