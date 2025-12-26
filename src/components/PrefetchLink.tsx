import React, { useCallback } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { prefetchRoute } from '../lib/prefetch';

interface PrefetchLinkProps extends LinkProps {
  prefetchOn?: 'hover' | 'focus' | 'both';
}

export const PrefetchLink: React.FC<PrefetchLinkProps> = ({ 
  prefetchOn = 'both', 
  to,
  onMouseEnter,
  onFocus,
  ...props 
}) => {
  const path = typeof to === 'string' ? to : to.pathname || '';

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetchOn === 'hover' || prefetchOn === 'both') {
      prefetchRoute(path);
    }
    onMouseEnter?.(e);
  }, [path, prefetchOn, onMouseEnter]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLAnchorElement>) => {
    if (prefetchOn === 'focus' || prefetchOn === 'both') {
      prefetchRoute(path);
    }
    onFocus?.(e);
  }, [path, prefetchOn, onFocus]);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    />
  );
};

export default PrefetchLink;
