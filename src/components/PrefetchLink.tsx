import React, { useCallback } from 'react';
import { Link, LinkProps, useLocation } from 'react-router-dom';
import { prefetchRoute } from '../lib/prefetch';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';

interface PrefetchLinkProps extends LinkProps {
  prefetchOn?: 'hover' | 'focus' | 'both';
  showLoader?: boolean;
}

export const PrefetchLink: React.FC<PrefetchLinkProps> = ({ 
  prefetchOn = 'both', 
  to,
  onMouseEnter,
  onFocus,
  onClick,
  showLoader = true,
  ...props 
}) => {
  const path = typeof to === 'string' ? to : to.pathname || '';
  const location = useLocation();
  const { startNavigation } = useNavigationLoading();

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

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const currentPath = location.pathname;
    if (showLoader && path !== currentPath) {
      startNavigation();
    }
    onClick?.(e);
  }, [path, location.pathname, showLoader, startNavigation, onClick]);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onClick={handleClick}
      {...props}
    />
  );
};

export default PrefetchLink;
