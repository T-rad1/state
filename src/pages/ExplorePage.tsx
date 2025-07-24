import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, X, SlidersHorizontal, MapPin, Grid, List } from 'lucide-react';
import ApartmentListItem from '../components/explore/ApartmentListItem';
import { supabase } from '../utils/supabaseClient';

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
  created_at: string;
  updated_at: string;
}

const ExplorePage: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  
  // Filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [bathCount, setBathCount] = useState<number | null>(null);
  const [minSize, setMinSize] = useState<number | null>(null);
  
  // Data state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Parse URL query params on initial load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    const queryParam = params.get('q');
    if (queryParam) {
      setSearchInput(queryParam);
      setActiveSearchTerm(queryParam);
      setIsSearchActive(true);
    }
    
    const priceParam = params.get('price');
    if (priceParam) {
      const [min, max] = priceParam.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        setPriceRange([min, max]);
      }
    }
    
    const roomsParam = params.get('rooms');
    if (roomsParam && !isNaN(Number(roomsParam))) {
      setRoomCount(Number(roomsParam));
    }
  }, [location.search]);
  
  // Fetch all properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        
        // Get all published properties
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .in('assignment_status', ['published', 'approved']) // Include both published and approved
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching properties:', error);
          throw error;
        }
        
        console.log('✅ Fetched properties for explore page:', data?.length || 0);
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);

  // Perform search when activeSearchTerm changes
  useEffect(() => {
    if (isSearchActive && activeSearchTerm.trim()) {
      performSearch();
    } else if (!activeSearchTerm.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
    }
  }, [activeSearchTerm, properties]);

  const performSearch = async () => {
    if (!activeSearchTerm.trim()) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('assignment_status', ['published', 'approved'])
        .or(`title.ilike.%${activeSearchTerm}%,location.ilike.%${activeSearchTerm}%,description.ilike.%${activeSearchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let results = data || [];

      // Apply filters
      results = results.filter((property) => {
        const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
        const matchesRooms = roomCount === null || property.bedrooms === roomCount;
        const matchesBaths = bathCount === null || property.bathrooms === bathCount;
        const matchesSize = minSize === null || property.size >= minSize;
        
        return matchesPrice && matchesRooms && matchesBaths && matchesSize;
      });

      setSearchResults(results);
      setIsSearchActive(true);
    } catch (error) {
      console.error('Error searching properties:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get filtered properties
  const getDisplayProperties = () => {
    if (isSearchActive) {
      return searchResults;
    }

    return properties.filter((property) => {
      const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
      const matchesRooms = roomCount === null || property.bedrooms === roomCount;
      const matchesBaths = bathCount === null || property.bathrooms === bathCount;
      const matchesSize = minSize === null || property.size >= minSize;
      
      return matchesPrice && matchesRooms && matchesBaths && matchesSize;
    });
  };

  const displayProperties = getDisplayProperties();
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput.trim());
    
    if (searchInput.trim()) {
      setIsSearchActive(true);
      const params = new URLSearchParams(location.search);
      params.set('q', searchInput.trim());
      navigate(`/explore?${params.toString()}`, { replace: true });
    } else {
      setIsSearchActive(false);
      setSearchResults([]);
      const params = new URLSearchParams(location.search);
      params.delete('q');
      navigate(`/explore?${params.toString()}`, { replace: true });
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearchTerm('');
    setIsSearchActive(false);
    setSearchResults([]);
    const params = new URLSearchParams(location.search);
    params.delete('q');
    navigate(`/explore?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearchInput('');
    setActiveSearchTerm('');
    setPriceRange([0, 2000000]);
    setRoomCount(null);
    setBathCount(null);
    setMinSize(null);
    setIsSearchActive(false);
    setSearchResults([]);
    navigate('/explore');
    setShowFilters(false);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 md:pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-16 md:pt-20">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 py-4 border-b dark:border-gray-700 sticky top-16 md:top-20 z-20 transition-colors duration-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-2xl w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by property name, location, or description..."
                className="pl-10 pr-10 py-2 w-full rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              />
              {searchInput && (
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={handleClearSearch}
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
            </form>
            
            {/* Filter Button & View Toggle */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Filters
              </button>
              
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 transition-colors ${
                    viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 animate-fade-in transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price Range
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                      placeholder="Min"
                    />
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                      placeholder="Max"
                    />
                  </div>
                </div>
                
                {/* Bedrooms Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bedrooms
                  </label>
                  <select
                    value={roomCount === null ? '' : roomCount}
                    onChange={(e) => setRoomCount(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  >
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4">4+ Bedrooms</option>
                  </select>
                </div>
                
                {/* Bathrooms Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bathrooms
                  </label>
                  <select
                    value={bathCount === null ? '' : bathCount}
                    onChange={(e) => setBathCount(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  >
                    <option value="">Any</option>
                    <option value="1">1 Bathroom</option>
                    <option value="2">2 Bathrooms</option>
                    <option value="3">3 Bathrooms</option>
                    <option value="4">4+ Bathrooms</option>
                  </select>
                </div>
                
                {/* Min Size Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Size (sqft)
                  </label>
                  <input
                    type="number"
                    value={minSize === null ? '' : minSize}
                    onChange={(e) => setMinSize(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                    placeholder="Min Size"
                  />
                </div>
              </div>
              
              {/* Filter Actions */}
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
          
          {/* Active Filters */}
          {(activeSearchTerm || priceRange[0] > 0 || priceRange[1] < 2000000 || roomCount !== null || bathCount !== null || minSize !== null) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeSearchTerm && (
                <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm">
                  <span>Search: "{activeSearchTerm}"</span>
                  <button 
                    onClick={handleClearSearch}
                    className="ml-1 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {(priceRange[0] > 0 || priceRange[1] < 2000000) && (
                <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm">
                  <span>Price: ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}</span>
                  <button 
                    onClick={() => setPriceRange([0, 2000000])}
                    className="ml-1 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {roomCount !== null && (
                <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm">
                  <span>Bedrooms: {roomCount === 0 ? 'Studio' : `${roomCount} Bed${roomCount > 1 ? 's' : ''}`}</span>
                  <button 
                    onClick={() => setRoomCount(null)}
                    className="ml-1 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Results Count */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-700 dark:text-gray-300">
            {isSearchActive ? (
              <>
                Showing <span className="font-semibold">{displayProperties.length}</span> results for "{activeSearchTerm}"
              </>
            ) : (
              <>
                Showing <span className="font-semibold">{displayProperties.length}</span> apartments
              </>
            )}
          </p>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 mr-2">Sort by:</span>
            <select className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors">
              <option>Newest</option>
              <option>Price (Low to High)</option>
              <option>Price (High to Low)</option>
              <option>Size (Largest)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {displayProperties.length > 0 ? (
          <>
            {viewMode === 'list' && (
              <div className="space-y-4">
                {displayProperties.map((property) => (
                  <ApartmentListItem key={property.id} apartment={property} />
                ))}
              </div>
            )}
            
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayProperties.map((property) => (
                  <div key={property.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="relative h-48">
                      <img 
                        src={property.images[0] || 'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg'} 
                        alt={property.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg';
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between mb-2">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${property.price.toLocaleString()}</p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{property.size} sqft</span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">{property.title}</h3>
                      <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{property.location}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>{property.bedrooms} beds</span>
                        <span>{property.bathrooms} baths</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {viewMode === 'map' && (
              <div className="flex items-center justify-center h-[calc(100vh-240px)] min-h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">Map view is currently unavailable</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            {isSearchActive ? (
              <>
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">No properties found for "{activeSearchTerm}"</p>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search terms or filters</p>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">No apartments found matching your criteria</p>
            )}
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              {isSearchActive ? 'Clear Search' : 'Reset Filters'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;