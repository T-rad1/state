import React, { useState, useEffect } from 'react';
import { Eye, Mail, Phone, MessageSquare, Calendar, User, Building2, CheckCircle, X, Clock } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

interface PurchaseRequest {
  id: string;
  property_id: string;
  user_id: string;
  user_email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  message?: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Property details
  property_title?: string;
  property_price?: number;
  property_location?: string;
}

const PurchaseRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [responseText, setResponseText] = useState<string>('');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch pending requests by default, or all if filter is 'all'
      const { data, error } = statusFilter === 'pending' 
        ? await supabase.rpc('get_pending_purchase_requests')
        : await supabase.rpc('get_purchase_requests_with_property_details');

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      
      const { data, error } = await supabase.rpc('approve_purchase_request', {
        request_id: requestId,
        admin_response_text: responseText.trim() || null
      });

      if (error) throw error;
      
      if (data) {
        // Refresh the list
        await fetchPurchaseRequests();
        
        // Close modal and reset
        setSelectedRequest(null);
        setResponseText('');
        
        alert('Request approved successfully! User will be notified.');
      } else {
        throw new Error('Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      
      const { data, error } = await supabase.rpc('reject_purchase_request', {
        request_id: requestId,
        admin_response_text: responseText.trim() || null
      });

      if (error) throw error;
      
      if (data) {
        // Refresh the list
        await fetchPurchaseRequests();
        
        // Close modal and reset
        setSelectedRequest(null);
        setResponseText('');
        
        alert('Request rejected successfully! User will be notified.');
      } else {
        throw new Error('Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request. Please try again.');
    } finally {
      setProcessingRequest(null);
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
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: X },
      contacted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', icon: Mail },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredRequests = requests.filter(request => 
    statusFilter === 'all' || request.status === statusFilter
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Requests</h2>
        
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="pending">Pending Requests</option>
          <option value="all">All Requests</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="contacted">Contacted</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'approved', 'rejected', 'completed'].map(status => {
          const count = requests.filter(req => req.status === status).length;
          return (
            <div key={status} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {status}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                </div>
                {getStatusBadge(status)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.first_name} {request.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {request.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.property_title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ${request.property_price?.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(request.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {request.status === 'pending' && (
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setResponseText('');
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-xs"
                        >
                          Quick Actions
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Platform Requests
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === 'all' 
                ? 'No platform requests have been submitted yet.'
                : `No ${statusFilter} requests found.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Platform Request Details
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Requester Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Requester Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {selectedRequest.first_name} {selectedRequest.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.user_email}</p>
                    </div>
                    {selectedRequest.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Phone
                        </label>
                        <p className="text-gray-900 dark:text-white">{selectedRequest.phone}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Request Date
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(selectedRequest.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Property Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Property Title
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.property_title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Price
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        ${selectedRequest.property_price?.toLocaleString()}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Location
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.property_location}</p>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {selectedRequest.message && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Message
                    </h4>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedRequest.message}
                    </p>
                  </div>
                )}

                {/* Status Management */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Request Actions
                  </h4>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Current Status:
                    </span>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  
                  {selectedRequest.status === 'pending' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Response Message (Optional)
                        </label>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Optional message to send to the user..."
                        />
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleApproveRequest(selectedRequest.id)}
                          disabled={processingRequest === selectedRequest.id}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {processingRequest === selectedRequest.id ? (
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
                              Approve Request
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleRejectRequest(selectedRequest.id)}
                          disabled={processingRequest === selectedRequest.id}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {processingRequest === selectedRequest.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Reject Request
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {selectedRequest.status !== 'pending' && (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-600 rounded-md">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        This request has already been {selectedRequest.status}.
                      </p>
                    </div>
                  )}
                </div>

                {/* Contact Actions */}
                <div className="flex space-x-3">
                  <a
                    href={`mailto:${selectedRequest.user_email}?subject=Regarding your purchase request for ${selectedRequest.property_title}`}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </a>
                  {selectedRequest.phone && (
                    <a
                      href={`tel:${selectedRequest.phone}`}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequestsManager;