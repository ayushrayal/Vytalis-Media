import React, { useState, useEffect } from 'react';
import { Image, Video, ImageOff } from 'lucide-react';
import { Shimmer } from './LoadingSkeleton';

const CreativeImage = ({
  src,
  alt = 'Creative Image',
  isVideo = false,
  aspectRatio = '16/9',
  style = {},
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
    setFailed(false);
    setRetryCount(0);
    setLoading(true);
  }, [src]);

  const handleError = () => {
    if (retryCount === 0) {
      setRetryCount(1);
      // Append cache-busting timestamp to force reload
      try {
        const url = new URL(src);
        url.searchParams.set('retry', Date.now().toString());
        setImgSrc(url.toString());
      } catch (e) {
        setImgSrc(src + '?retry=1');
      }
    } else {
      setFailed(true);
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  // Render fallback placeholder
  if (failed || !src) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          aspectRatio,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--border-color) 100%)',
          color: 'var(--text-tertiary)',
          borderRadius: 'var(--radius-sm)',
          gap: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
          ...style
        }}
      >
        {isVideo ? <Video size={36} /> : <ImageOff size={36} />}
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        aspectRatio,
        overflow: 'hidden',
        borderRadius: 'inherit',
        backgroundColor: 'var(--bg-tertiary)',
        ...style
      }}
    >
      {loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Shimmer />
        </div>
      )}
      <img
        {...props}
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: failed ? 'none' : 'block',
          opacity: loading ? 0 : 1,
          transition: 'opacity var(--transition-normal)'
        }}
      />
    </div>
  );
};

export default CreativeImage;
