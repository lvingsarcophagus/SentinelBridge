import React from 'react';

export const Spinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer spinning ring */}
      <div 
        className={`absolute rounded-full border-t-[#00E5FF] border-r-transparent border-b-[#00E5FF] border-l-transparent animate-spin ${sizeClasses[size]}`}
      ></div>
      {/* Inner pulsing dot */}
      <div className={`rounded-full bg-[#00E5FF] animate-pulse ${
        size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
      }`}></div>
    </div>
  );
};
