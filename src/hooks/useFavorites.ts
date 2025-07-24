import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface FavoriteProperty {
  favorite_id: string;
  property_id: string;
  title: string;
  location: string;
  price: number;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  size: number;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch user's favorites
  const fetchFavorites = async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_favorites', {
        user_uuid: user.id
      });

      if (error) throw error;

      setFavorites(data || []);
      setFavoriteIds(new Set((data || []).map((fav: FavoriteProperty) => fav.property_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add property to favorites
  const addToFavorites = async (propertyId: string) => {
    if (!user) {
      throw new Error('Must be logged in to add favorites');
    }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          property_id: propertyId
        });

      if (error) throw error;

      // Update local state
      setFavoriteIds(prev => new Set([...prev, propertyId]));
      
      // Refresh favorites list
      await fetchFavorites();
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  };

  // Remove property from favorites
  const removeFromFavorites = async (propertyId: string) => {
    if (!user) {
      throw new Error('Must be logged in to remove favorites');
    }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;

      // Update local state
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });

      // Refresh favorites list
      await fetchFavorites();
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (propertyId: string) => {
    if (favoriteIds.has(propertyId)) {
      await removeFromFavorites(propertyId);
    } else {
      await addToFavorites(propertyId);
    }
  };

  // Check if property is favorited
  const isFavorited = (propertyId: string) => {
    return favoriteIds.has(propertyId);
  };

  // Fetch favorites when user changes
  useEffect(() => {
    fetchFavorites();
  }, [user]);

  return {
    favorites,
    favoriteIds,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorited,
    fetchFavorites
  };
};