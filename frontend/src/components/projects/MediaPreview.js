import React, { useState, useEffect } from 'react';
import { Image, Button, Spinner } from 'react-bootstrap';

const MediaPreview = ({ type, preview, onRemove }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState(null);
  
  const getFullUrl = (url) => {
    if (!url) {
      console.debug('Empty URL provided to MediaPreview');
      return '';
    }
    
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Handle data URLs and blob URLs
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
      }
      
      // Handle video embeds
      if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/')) {
        return url;
      }
      
      // If the URL already includes the backend URL, strip it first
      let cleanUrl = url;
      if (url.startsWith(backendUrl)) {
        cleanUrl = url.substring(backendUrl.length);
      }
      
      // Handle uploaded files
      if (cleanUrl.startsWith('/uploads/')) {
        // Ensure we have the API prefix
        if (!cleanUrl.includes('/api/v1/projects')) {
          const fullUrl = `${backendUrl}/api/v1/projects${cleanUrl}`;
          console.debug(`Constructed URL for ${type}:`, fullUrl);
          return fullUrl;
        }
      }
      
      // For external URLs, return as-is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // For relative URLs, ensure they have the full path
      return `${backendUrl}/api/v1/projects${cleanUrl}`;
    } catch (error) {
      console.error('Error constructing URL:', error);
      return '';
    }
  };

  const handleError = (e) => {
    const fullUrl = getFullUrl(preview);
    const errorInfo = {
      type: type,
      originalUrl: preview,
      constructedUrl: fullUrl,
      timestamp: new Date().toISOString(),
      errorEvent: e?.type || 'unknown',
      backendUrl: process.env.REACT_APP_BACKEND_URL
    };
    
    console.group(`Media Preview Error - ${type}`);
    console.error('Error Details:', errorInfo);
    console.error('Original Error Event:', e);
    console.groupEnd();
    
    setErrorDetails(errorInfo);
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    console.debug(`${type} loaded successfully from:`, getFullUrl(preview));
    setLoading(false);
    setError(false);
    setErrorDetails(null);
  };

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  if (!preview) return null;

  const fullUrl = getFullUrl(preview);
  
  const ErrorDisplay = () => (
    <div className="text-danger p-2 border rounded">
      <div className="mb-2">Failed to load {type} preview</div>
      <div className="small text-muted">
        <div>Error occurred at: {errorDetails?.timestamp}</div>
        <div>Path: {errorDetails?.constructedUrl}</div>
        {errorDetails?.errorEvent !== 'unknown' && (
          <div>Error type: {errorDetails?.errorEvent}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-2 position-relative">
      {loading && (
        <div className="text-center p-2">
          <Spinner animation="border" size="sm" />
        </div>
      )}
      
      {type === 'image' ? (
        !error ? (
          <Image 
            src={fullUrl}
            alt="Preview" 
            className="border rounded"
            style={{ 
              maxWidth: '300px', 
              maxHeight: '200px', 
              objectFit: 'contain',
              display: loading ? 'none' : 'block' 
            }}
            onError={handleError}
            onLoad={handleLoad}
          />
        ) : (
          <ErrorDisplay />
        )
      ) : (
        !error ? (
          preview.includes('youtube.com/embed/') || preview.includes('player.vimeo.com/') ? (
            <iframe
              src={fullUrl}
              width="300"
              height="169"
              className="border rounded"
              frameBorder="0"
              allowFullScreen
              title="Video preview"
              onError={handleError}
              onLoad={handleLoad}
            />
          ) : (
            <video 
              key={fullUrl}
              src={fullUrl}
              controls 
              className="border rounded"
              style={{ 
                maxWidth: '300px',
                maxHeight: '200px',
                display: loading ? 'none' : 'block' 
              }}
              onError={handleError}
              onLoadedData={handleLoad}
            />
          )
        ) : (
          <ErrorDisplay />
        )
      )}
      
      {onRemove && !loading && (
        <Button 
          variant="danger" 
          size="sm" 
          className="position-absolute top-0 end-0 m-1"
          onClick={onRemove}
        >
          ×
        </Button>
      )}
    </div>
  );
};

export default MediaPreview;