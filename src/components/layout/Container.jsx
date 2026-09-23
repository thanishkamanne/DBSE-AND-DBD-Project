import React from 'react';

export function Container({ children, size = 'default', className = '' }) {
  const sizes = {
    sm: 'max-w-xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    default: 'max-w-7xl', // Expands smoothly to fill desktop viewport while remaining fluid on mobile and tablet
    full: 'max-w-full',
  };

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </div>
  );
}
