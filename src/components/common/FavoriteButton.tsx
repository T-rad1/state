import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../hooks/useFavorites';
import { useNavigate } from 'react-router-dom';

interface FavoriteButtonProps {
  propertyId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  propertyId, 
  className = '',
  size = 'md'
}) => {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      await toggleFavorite(propertyId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = isFavorited(propertyId);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        ${buttonSizeClasses[size]} 
        rounded-full 
        transition-all 
        duration-200 
        ${isActive 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-white/80 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/70 text-gray-600 dark:text-gray-300'
        }
        backdrop-blur-sm 
        shadow-md 
        hover:shadow-lg 
        disabled:opacity-50 
        disabled:cursor-not-allowed
        ${className}
      `}
      title={isActive ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`${sizeClasses[size]} ${isActive ? 'fill-current' : ''} ${isLoading ? 'animate-pulse' : ''}`} 
      />
    </button>
  );
};

export default FavoriteButton;