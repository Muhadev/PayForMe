// hooks/useMediaPreview.js
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export const useMediaPreview = () => {
  const [mediaState, setMediaState] = useState({
    imagePreview: null,
    videoPreview: null,
    imageType: null,
    videoType: null,
    isLoading: false
  });

  // Helper function to validate file size and type
  const validateFile = (file, type) => {
    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      video: 100 * 1024 * 1024 // 100MB
    };

    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif'],
      video: ['video/mp4', 'video/webm', 'video/ogg']
    };

    if (file.size > maxSizes[type]) {
      throw new Error(`${type === 'image' ? 'Image' : 'Video'} must be less than ${maxSizes[type] / (1024 * 1024)}MB`);
    }

    if (!allowedTypes[type].includes(file.type)) {
      throw new Error(`Invalid ${type} format. Allowed formats: ${allowedTypes[type].join(', ')}`);
    }

    return true;
  };

  // Function to handle external URLs (including YouTube and Vimeo)
  const processVideoUrl = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtube.com') 
        ? url.split('v=')[1]?.split('&')[0]
        : url.split('youtu.be/')[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return url;
  };

  const handleMediaUrl = (url, type) => {
    if (!url) return null;
    
    // Handle uploaded files URLs
    if (url.startsWith('/uploads/')) {
      return `${process.env.REACT_APP_BACKEND_URL}${url}`;
    }
    
    // Process video URLs for embeds
    if (type === 'video') {
      return processVideoUrl(url);
    }
    
    return url;
  };

  // Main function to update preview
  const updatePreview = async (source, type) => {
    setMediaState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Handle URL strings
      if (typeof source === 'string') {
        const processedUrl = handleMediaUrl(source, type);
        if (!processedUrl) {
          throw new Error(`Invalid ${type} URL`);
        }
        
        setMediaState(prev => ({
          ...prev,
          [`${type}Preview`]: processedUrl,
          [`${type}Type`]: 'url',
          isLoading: false
        }));
        return processedUrl;
      }
      
      // Handle File objects
      if (source instanceof File) {
        validateFile(source, type);
        const objectUrl = URL.createObjectURL(source);
        
        setMediaState(prev => ({
          ...prev,
          [`${type}Preview`]: objectUrl,
          [`${type}Type`]: 'file',
          isLoading: false
        }));
        return objectUrl;
      }
      
      throw new Error('Invalid source type');
    } catch (error) {
      console.error(`Error updating ${type} preview:`, error);
      toast.error(error.message || `Failed to process ${type}`);
      setMediaState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  };

  // Function to clear preview
  const clearPreview = (type) => {
    const currentPreview = mediaState[`${type}Preview`];
    if (currentPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(currentPreview);
    }
    setMediaState(prev => ({
      ...prev,
      [`${type}Preview`]: null,
      [`${type}Type`]: null
    }));
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      Object.entries(mediaState).forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('blob:')) {
          URL.revokeObjectURL(value);
        }
      });
    };
  }, [mediaState]);

  return {
    ...mediaState,
    updatePreview,
    clearPreview
  };
};