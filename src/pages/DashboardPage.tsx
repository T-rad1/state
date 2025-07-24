import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Heart, LogOut, MapPin, Maximize, ArrowLeft, Gift, CheckCircle, Settings, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import PrivateOffers from '../components/dashboard/PrivateOffers';
import ApprovedProperties from '../components/dashboard/ApprovedProperties';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import UserPurchaseRequests from '../components/dashboard/UserPurchaseRequests';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { favorites, loading, fetchFavorites } = useFavorites();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('overview');

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return null; // This should be handled by ProtectedRoute
  }

  const getProfilePicture = () => {
    return user?.profilePictureUrl || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'private-offers':
        return <PrivateOffers />;
      case 'approved':
        return <ApprovedProperties />;
      case 'purchase-requests':
        return <UserPurchaseRequests />;
      case 'favorites':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Favorite Properties
              </h2>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm">
                {favorites.length}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => (
                  <div 
                    key={favorite.favorite_id}
                    className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <Link to={`/apartments/${favorite.property_id}`}>
                      <div className="relative h-48">
                        <img 
                          src={favorite.images[0] || 'https://via.placeholder.com/400x300'} 
                          alt={favorite.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <Heart className="w-5 h-5 text-red-500 fill-current" />
                        </div>
                      </div>
                    </Link>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ${favorite.price.toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 text-sm">
                          <Maximize className="w-4 h-4" />
                          <span>{favorite.size} sqft</span>
                        </div>
                      </div>
                      
                      <Link to={`/apartments/${favorite.property_id}`}>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {favorite.title}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{favorite.location}</span>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <span>{favorite.bedrooms} beds</span>
                        <span>{favorite.bathrooms} baths</span>
                      </div>
                      
                      <div className="mt-3">
                        <Link
                          to={`/apartments/${favorite.property_id}`}
                          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No favorites yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start exploring properties and add them to your favorites by clicking the heart icon.
                </p>
                <Link
                  to="/explore"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Explore Properties
                </Link>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            {/* Private Offers Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-colors duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Gift className="w-6 h-6 text-purple-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Private Offers
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Properties privately shared with you by our team
                </p>
              </div>
              <div className="p-6">
                <PrivateOffers />
              </div>
            </div>

            {/* My Approved Properties Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-colors duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    My Approved Properties
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Properties you've approved and are now live on the platform
                </p>
              </div>
              <div className="p-6">
                <ApprovedProperties />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
        <Link 
          to="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to home
        </Link>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors duration-200">
              {/* User Profile Section */}
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <img
                  src={getProfilePicture()}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    {user.firstName || 'User'}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <User className="w-5 h-5 mr-3" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Profile Settings
                </button>
                <button
                  onClick={() => setActiveTab('private-offers')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'private-offers'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Gift className="w-5 h-5 mr-3" />
                  Private Offers
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'approved'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <CheckCircle className="w-5 h-5 mr-3" />
                  My Properties
                </button>
                <button
                  onClick={() => setActiveTab('purchase-requests')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'purchase-requests'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 mr-3" />
                  Purchase Requests
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === 'favorites'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Heart className="w-5 h-5 mr-3" />
                  Favorites
                  <span className="ml-auto bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                    {favorites.length}
                  </span>
                </button>
              </nav>

              {/* Logout Button */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors duration-200">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;