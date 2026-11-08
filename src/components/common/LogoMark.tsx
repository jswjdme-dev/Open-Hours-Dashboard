import React from 'react';

// Open Hours signature logo mark: three vertical bars
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="6" width="3.5" height="12" rx="1.75" fill="currentColor" />
      <rect x="10.25" y="3" width="3.5" height="18" rx="1.75" fill="currentColor" />
      <rect x="16.5" y="8" width="3.5" height="10" rx="1.75" fill="currentColor" />
    </svg>
  );
};
