
import React, { useState, useEffect, useContext, ErrorInfo, useMemo, useRef, lazy, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SmoothScrollProvider } from './components/motion/SmoothScroll';
import DirectionalPageTransition, { TransitionContext } from './components/motion/DirectionalPageTransition';
import Logo from './components/Logo';
import MenuOverlay from './components/MenuOverlay';
import ViewAsBanner from './components/ViewAsBanner';
import Avatar from './components/Avatar';
import { ToastProvider } from './components/Toast';
import OfflineBanner from './components/OfflineBanner';
import { NotificationContext } from './contexts/NotificationContext';
import { SafeAreaBottomOverlay } from './components/layout/SafeAreaBottomOverlay';
import { BottomNavProvider } from './contexts/BottomNavContext';
import { AnnouncementBadgeProvider } from './contexts/AnnouncementBadgeContext';
import { BottomSentinel } from './components/layout/BottomSentinel';
import MemberBottomNav from './components/MemberBottomNav';
import { NavigationLoadingProvider, useNavigationLoading } from './contexts/NavigationLoadingContext';
import WalkingGolferLoader from './components/WalkingGolferLoader';
import NavigationLoader from './components/NavigationLoader';

const InitialLoadingScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDataReady } = useData();
  const [showLoader, setShowLoader] = React.useState(true);
  const [hasHiddenLoader, setHasHiddenLoader] = React.useState(false);

  React.useEffect(() => {
    if (isDataReady && !hasHiddenLoader) {
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isDataReady, hasHiddenLoader]);

  const handleFadeComplete = () => {
    setHasHiddenLoader(true);
  };

  return (
    <>
      {!hasHiddenLoader && (
        <WalkingGolferLoader 
          isVisible={showLoader} 
          onFadeComplete={handleFadeComplete} 
        />
      )}
      {children}
    </>
  );
};

const PageSkeleton: React.FC = () => (
  <div className="px-6 pt-4 animate-pulse">
    <div className="h-8 w-48 bg-white/10 rounded-lg mb-2" />
    <div className="h-4 w-32 bg-white/5 rounded mb-6" />
    <div className="space-y-4">
      <div className="h-24 bg-white/5 rounded-xl" />
      <div className="h-24 bg-white/5 rounded-xl" />
      <div className="h-24 bg-white/5 rounded-xl" />
    </div>
  </div>
);

const lazyWithPrefetch = (importFn: () => Promise<{ default: React.ComponentType<any> }>) => {
  const Component = lazy(importFn);
  (Component as any).prefetch = importFn;
  return Component;
};

const Dashboard = lazy(() => import('./pages/Member/Dashboard'));
const BookGolf = lazyWithPrefetch(() => import('./pages/Member/BookGolf'));
const MemberEvents = lazyWithPrefetch(() => import('./pages/Member/Events'));
const MemberWellness = lazyWithPrefetch(() => import('./pages/Member/Wellness'));
const Profile = lazyWithPrefetch(() => import('./pages/Member/Profile'));
const MemberAnnouncements = lazyWithPrefetch(() => import('./pages/Member/Announcements'));
const MemberUpdates = lazyWithPrefetch(() => import('./pages/Member/Updates'));
const Landing = lazy(() => import('./pages/Public/Landing'));
const Membership = lazy(() => import('./pages/Public/Membership'));
const Contact = lazy(() => import('./pages/Public/Contact'));
const Gallery = lazy(() => import('./pages/Public/Gallery'));
const WhatsOn = lazy(() => import('./pages/Public/WhatsOn'));
const PrivateHire = lazy(() => import('./pages/Public/PrivateHire'));
const PublicCafe = lazy(() => import('./pages/Public/Cafe'));
const FAQ = lazy(() => import('./pages/Public/FAQ'));
const Login = lazy(() => import('./pages/Public/Login'));
const AuthCallback = lazy(() => import('./pages/Public/AuthCallback'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));

import { prefetchRoute, prefetchAdjacentRoutes, prefetchOnIdle } from './lib/prefetch';

const useDebugLayout = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugMode = params.get('debugLayout') === '1';
    
    if (debugMode) {
      document.documentElement.classList.add('debug-layout');
      
      const checkOverflow = () => {
        const existing = document.querySelector('.debug-overflow-warning');
        if (document.documentElement.scrollWidth > window.innerWidth) {
          if (!existing) {
            const warning = document.createElement('div');
            warning.className = 'debug-overflow-warning';
            warning.textContent = `Overflow! ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`;
            document.body.appendChild(warning);
          }
        } else if (existing) {
          existing.remove();
        }
      };
      
      checkOverflow();
      window.addEventListener('resize', checkOverflow);
      
      return () => {
        window.removeEventListener('resize', checkOverflow);
        document.documentElement.classList.remove('debug-layout');
        const warning = document.querySelector('.debug-overflow-warning');
        if (warning) warning.remove();
      };
    }
    
    return undefined;
  }, []);
};

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#0f120a] text-white p-6">
          <div className="glass-card rounded-2xl p-8 max-w-md text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-white/70 mb-6">We're sorry for the inconvenience.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-accent rounded-xl font-semibold hover:opacity-90 transition-opacity text-brand-green"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [pathname]);
  
  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useData();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Members Portal route guard - redirects staff/admin to Staff Portal (unless viewing as member or on profile page)
const MemberPortalRoute: React.FC<{ children: React.ReactNode; allowStaffAccess?: boolean }> = ({ children, allowStaffAccess }) => {
  const { user, actualUser, isViewingAs } = useData();
  if (!user) return <Navigate to="/login" replace />;
  
  // If staff/admin is NOT viewing as a member, redirect to Staff Portal
  // Exception: allow staff access to profile page for sign out
  const isStaffOrAdmin = actualUser?.role === 'admin' || actualUser?.role === 'staff';
  if (isStaffOrAdmin && !isViewingAs && !allowStaffAccess) {
    return <Navigate to="/admin" replace />;
  }
  
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { actualUser } = useData();
  if (!actualUser) return <Navigate to="/login" replace />;
  if (actualUser.role !== 'admin' && actualUser.role !== 'staff') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const ROUTE_INDICES: Record<string, number> = {
  '/dashboard': 0,
  '/book': 1,
  '/member-wellness': 2,
  '/member-events': 3,
  '/updates': 4,
  '/profile': 5,
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  
  useEffect(() => {
    prefetchOnIdle();
  }, []);
  
  const transitionState = useMemo(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;
    
    const prevIndex = ROUTE_INDICES[prevPath] ?? -1;
    const currentIndex = ROUTE_INDICES[currentPath] ?? -1;
    
    if (prevIndex >= 0 && currentIndex >= 0 && prevPath !== currentPath) {
      const direction = currentIndex > prevIndex ? 1 : -1;
      const distance = Math.abs(currentIndex - prevIndex);
      return { direction, distance: Math.max(0.1, distance) };
    }
    return { direction: 1, distance: 1 };
  }, [location.pathname]);
  
  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <TransitionContext.Provider value={transitionState}>
      <Suspense fallback={<PageSkeleton />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<DirectionalPageTransition><Landing /></DirectionalPageTransition>} />
            <Route path="/membership/*" element={<DirectionalPageTransition><Membership /></DirectionalPageTransition>} />
            <Route path="/contact" element={<DirectionalPageTransition><Contact /></DirectionalPageTransition>} />
            <Route path="/gallery" element={<DirectionalPageTransition><Gallery /></DirectionalPageTransition>} />
            <Route path="/whats-on" element={<DirectionalPageTransition><WhatsOn /></DirectionalPageTransition>} />
            <Route path="/private-hire" element={<DirectionalPageTransition><PrivateHire /></DirectionalPageTransition>} />
            <Route path="/menu" element={<DirectionalPageTransition><PublicCafe /></DirectionalPageTransition>} />
            <Route path="/faq" element={<DirectionalPageTransition><FAQ /></DirectionalPageTransition>} />
            <Route path="/login" element={<DirectionalPageTransition><Login /></DirectionalPageTransition>} />
            <Route path="/auth/callback" element={<DirectionalPageTransition><AuthCallback /></DirectionalPageTransition>} />
            <Route path="/reset-password" element={<DirectionalPageTransition><Login /></DirectionalPageTransition>} />

            <Route path="/admin" element={
              <AdminProtectedRoute>
                <DirectionalPageTransition><AdminDashboard /></DirectionalPageTransition>
              </AdminProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><Dashboard /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/book" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><BookGolf /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/member-events" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberEvents /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/member-wellness" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberWellness /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/profile" element={
              <MemberPortalRoute allowStaffAccess>
                <DirectionalPageTransition><Profile /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/announcements" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberAnnouncements /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/updates" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberUpdates /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </Suspense>
    </TransitionContext.Provider>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { announcements, user, actualUser, isViewingAs } = useData();
  const { effectiveTheme } = useTheme();
  const { endNavigation } = useNavigationLoading();
  
  // End navigation loading when route changes
  useEffect(() => {
    endNavigation();
  }, [location.pathname, location.search, endNavigation]);
  
  // Check if actual user is staff/admin (for header logic)
  const isStaffOrAdmin = actualUser?.role === 'admin' || actualUser?.role === 'staff';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);

  useEffect(() => {
    if (user?.email) {
      const fetchUnreadCount = async () => {
        try {
          const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(user.email)}&unread=true`);
          if (res.ok) {
            const data = await res.json();
            setUnreadCount(data.length);
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);
  
  useDebugLayout();

  useEffect(() => {
    const metaThemeColor = document.getElementById('theme-color-meta');
    const isMember = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/announcements'].some(path => location.pathname.startsWith(path));
    const isAdmin = location.pathname.startsWith('/admin');
    
    const updateThemeColor = (scrolledPastHero: boolean) => {
      if (!metaThemeColor) return;
      
      let themeColor: string;
      if (location.pathname === '/' && !scrolledPastHero) {
        themeColor = '#1a1610';
      } else if (isAdmin || isMember) {
        themeColor = '#0f120a';
      } else {
        themeColor = '#293515';
      }
      metaThemeColor.setAttribute('content', themeColor);
    };
    
    if (location.pathname !== '/') {
      setHasScrolledPastHero(false);
      updateThemeColor(false);
      return;
    }
    
    const handleScroll = () => {
      const heroThreshold = window.innerHeight * 0.6;
      const scrolledPast = window.scrollY > heroThreshold;
      setHasScrolledPastHero(scrolledPast);
      updateThemeColor(scrolledPast);
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);
  
  const isMemberRoute = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/announcements', '/updates'].some(path => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLandingPage = location.pathname === '/';
  const isDarkTheme = isAdminRoute || (isMemberRoute && effectiveTheme === 'dark');
  const showHeader = !isAdminRoute;

  const handleTopLeftClick = () => {
    setIsMenuOpen(true);
  };

  const isProfilePage = location.pathname === '/profile';
  
  const handleTopRightClick = () => {
    if (user) {
        // On profile page, do nothing - already on settings
        if (isProfilePage) {
            return;
        }
        // For staff/admin (not viewing as member), go to Staff Portal
        if (isStaffOrAdmin && !isViewingAs) {
            navigate('/admin');
        } else if (isMemberRoute) {
            navigate('/profile');
        } else {
            // On public pages, staff/admin go to Staff Portal, members go to dashboard
            if (isStaffOrAdmin) {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    } else {
        navigate('/login');
    }
  };

  const getTopRightIcon = () => {
      if (!user) return 'login';
      // On profile page, show gear icon (already on settings)
      if (isProfilePage) return 'settings';
      // For staff/admin not viewing as member, show admin icon
      if (isStaffOrAdmin && !isViewingAs) return 'admin_panel_settings';
      // Gear icon for member portal (including profile page)
      if (isMemberRoute) return 'settings';
      return 'account_circle';
  };

  const getPageTitle = () => {
      if (!isMemberRoute) return null;
      const path = location.pathname;
      if (path === '/dashboard') return 'Dashboard';
      if (path === '/profile') return 'Profile';
      if (path.startsWith('/book')) return 'Book Golf';
      if (path.startsWith('/member-wellness')) return 'Wellness';
      if (path.startsWith('/announcements')) return 'News';
      if (path.startsWith('/updates')) return 'Updates';
      if (path.startsWith('/member-events')) return 'Events';
      return 'Dashboard';
  };

  const openNotifications = (tab?: 'updates' | 'announcements') => {
    navigate(`/updates?tab=${tab || 'activity'}`);
  };
  
  const headerClasses = isMemberRoute 
    ? (isDarkTheme 
        ? "bg-[#0f120a] text-[#F2F2EC] shadow-md border-b border-white/5"
        : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20 border-b border-[#1e2810]")
    : isLandingPage
      ? (hasScrolledPastHero 
          ? "bg-[#293515] text-white shadow-lg shadow-black/20 border-b border-white/10"
          : "bg-transparent text-white")
      : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20";
  const headerBtnClasses = "text-white hover:opacity-70 active:scale-95 transition-all";

  const headerContent = showHeader ? (
    <header className={`fixed top-0 left-0 right-0 flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4 z-[9998] pointer-events-auto transition-all duration-300 ${headerClasses}`} role="banner">
      {isMemberRoute ? (
        <button 
          onClick={() => navigate('/')}
          className={`flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg py-1`}
          aria-label="Go to home"
        >
          <img 
            src="/assets/logos/mascot-white.webp" 
            alt="Even House" 
            className="h-10 w-auto object-contain"
          />
        </button>
      ) : (
        <button 
          onClick={handleTopLeftClick}
          className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg`}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      )}
      
      {isMemberRoute ? (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <h1 className="text-lg font-bold text-[#F2F2EC] tracking-wide">
            {getPageTitle()}
          </h1>
        </div>
      ) : (
        <button 
          className="absolute left-1/2 -translate-x-1/2 cursor-pointer flex items-center justify-center focus:ring-2 focus:ring-accent focus:outline-none rounded-lg" 
          onClick={() => navigate('/')}
          aria-label="Go to home"
        >
          <Logo 
            isMemberRoute={isMemberRoute} 
            isDarkBackground={true} 
            className="h-14 w-auto"
          />
        </button>
      )}

      <div className="flex items-center gap-1 ml-auto">
        {isMemberRoute && user && (
          <button 
            onClick={() => isStaffOrAdmin && !isViewingAs ? navigate('/admin?tab=updates') : navigate('/updates?tab=activity')}
            className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg relative`}
            aria-label={isStaffOrAdmin && !isViewingAs ? "Updates" : "Notifications"}
          >
            <span className="material-symbols-outlined text-[24px]">{isStaffOrAdmin && !isViewingAs ? 'campaign' : 'notifications'}</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
        {isMemberRoute && user ? (
          <button 
            onClick={handleTopRightClick}
            className={`flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-full`}
            aria-label="View profile"
          >
            <Avatar name={user.name} email={user.email} size="md" />
          </button>
        ) : (
          <button 
            onClick={handleTopRightClick}
            className={`px-4 py-2 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-full border border-white/30 text-sm font-semibold tracking-wide`}
            aria-label={user ? 'Go to dashboard' : 'Members login'}
          >
            Members
          </button>
        )}
      </div>
    </header>
  ) : null;

  return (
    <div className={`${isDarkTheme ? 'dark liquid-bg text-white' : 'bg-[#F2F2EC] text-primary'} min-h-screen w-full relative transition-colors duration-500 font-sans`}>
      
      {isDarkTheme ? (
        <>
            <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#E7E7DC]/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        </>
      ) : (
        <>
            <div className="fixed top-[-20%] right-[-20%] w-[600px] h-[600px] bg-white rounded-full blur-[80px] pointer-events-none opacity-60"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#E7E7DC] rounded-full blur-[60px] pointer-events-none opacity-40"></div>
        </>
      )}
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>

      <NotificationContext.Provider value={{ openNotifications }}>
        <ViewAsBanner />
        
        {/* Header rendered via portal to escape transform context */}
        {headerContent && createPortal(headerContent, document.body)}
        
        <div className={`relative w-full min-h-screen flex flex-col ${isDarkTheme ? 'text-white' : 'text-primary'}`}>

            <main 
                id="main-content"
                className={`flex-1 relative ${showHeader && !isLandingPage ? 'pt-[max(88px,calc(env(safe-area-inset-top)+72px))]' : ''}`}
            >
                {children}
                {isMemberRoute && !isAdminRoute && !isProfilePage && <BottomSentinel />}
            </main>

            {isMemberRoute && !isAdminRoute && !isProfilePage && user && (
              <MemberBottomNav currentPath={location.pathname} isDarkTheme={isDarkTheme} />
            )}

            <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
      </NotificationContext.Provider>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <ToastProvider>
          <BottomNavProvider>
          <AnnouncementBadgeProvider>
          <NavigationLoadingProvider>
          <InitialLoadingScreen>
            <OfflineBanner />
            <HashRouter>
              <NavigationLoader />
              <SmoothScrollProvider>
                <ScrollToTop />
                <Layout>
                  <AnimatedRoutes />
                </Layout>
              </SmoothScrollProvider>
            </HashRouter>
          </InitialLoadingScreen>
          </NavigationLoadingProvider>
          </AnnouncementBadgeProvider>
          </BottomNavProvider>
          </ToastProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
