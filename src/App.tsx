import React, { useState, useEffect, useContext, createContext, ErrorInfo, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import Logo from './components/Logo';
import MenuOverlay from './components/MenuOverlay';
import ViewAsBanner from './components/ViewAsBanner';
import { ToastProvider } from './components/Toast';

const Landing = lazy(() => import('./pages/Public/Landing'));
const Membership = lazy(() => import('./pages/Public/Membership'));
const Contact = lazy(() => import('./pages/Public/Contact'));
const Gallery = lazy(() => import('./pages/Public/Gallery'));
const WhatsOn = lazy(() => import('./pages/Public/WhatsOn'));
const PrivateHire = lazy(() => import('./pages/Public/PrivateHire'));
const PrivateEvents = lazy(() => import('./pages/Public/PrivateEvents'));
const PublicWellness = lazy(() => import('./pages/Public/Wellness'));
const FAQ = lazy(() => import('./pages/Public/FAQ'));
const Login = lazy(() => import('./pages/Public/Login'));
const AuthCallback = lazy(() => import('./pages/Public/AuthCallback'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const MemberPortal = lazy(() => import('./components/MemberPortal'));
const Sims = lazy(() => import('./pages/Member/Sims'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

// Error Boundary Component
interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Use property initializer to avoid strict property initialization errors
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
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const main = document.querySelector('#main-content');
      if (main) {
        main.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        // Fallback to window scroll if element not found
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    });
  }, [pathname]);
  return null;
};

interface NotificationContextType {
  openNotifications: (tab?: 'updates' | 'announcements') => void;
}
export const NotificationContext = createContext<NotificationContextType>({ 
    openNotifications: () => {}
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useData();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { actualUser } = useData();
  if (!actualUser) return <Navigate to="/login" replace />;
  if (actualUser.role !== 'admin' && actualUser.role !== 'staff') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

interface UserNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: number;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { announcements, user } = useData();
  const { effectiveTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'updates' | 'announcements'>('updates');
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.email) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(user.email)}`);
          if (res.ok) {
            const data = await res.json();
            setUserNotifications(data);
            setUnreadCount(data.filter((n: UserNotification) => !n.is_read).length);
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  const markAsRead = async (notifId: number) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
      setUserNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.email) return;
    try {
      await fetch(`/api/notifications/mark-all-read?user_email=${encodeURIComponent(user.email)}`, { method: 'PUT' });
      setUserNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };
  
  const isMemberRoute = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/cafe', '/sims'].some(path => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  // Admin always dark, member routes respect theme preference, public routes always light
  const isDarkTheme = isAdminRoute || (isMemberRoute && effectiveTheme === 'dark');
  const showHeader = !isAdminRoute;

  // Routes that handle their own slide animation
  const selfAnimatedRoutes = ['/book', '/member-events', '/member-wellness', '/cafe'];
  const shouldAnimate = !selfAnimatedRoutes.some(path => location.pathname.startsWith(path));

  // Navigation Logic: Show Menu on Root or Dashboard, otherwise Back
  const isRootPage = location.pathname === '/' || location.pathname === '/dashboard';

  const handleTopLeftClick = () => {
    if (isRootPage) {
        setIsMenuOpen(true);
    } else {
        navigate(-1);
    }
  };

  const isProfilePage = location.pathname === '/profile';
  
  const handleTopRightClick = () => {
    if (user) {
        if (isProfilePage) {
            navigate('/dashboard');
        } else if (isMemberRoute) {
            navigate('/profile');
        } else {
            navigate('/dashboard');
        }
    } else {
        navigate('/login');
    }
  };

  const getTopRightIcon = () => {
      if (!user) return 'login';
      if (isProfilePage) return 'account_circle';
      if (isMemberRoute) return 'badge';
      return 'account_circle';
  };

  const openNotifications = (tab?: 'updates' | 'announcements') => {
    if (tab) setNotifTab(tab);
    setIsNotificationsOpen(true);
  };
  
  // Header: Depends on theme for member routes, Brand Green for public
  const headerClasses = isMemberRoute 
    ? (isDarkTheme 
        ? "bg-[#0f120a] text-[#F2F2EC] shadow-md relative z-40 border-b border-white/5"
        : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20 relative z-40 border-b border-[#1e2810]")
    : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20 relative z-40";
  // Icon-only buttons with simple hover state, no background shapes
  const headerBtnClasses = "text-white hover:opacity-70 active:scale-95 transition-all";

  return (
    <div className={`${isDarkTheme ? 'dark liquid-bg text-white' : 'bg-[#F2F2EC] text-primary'} h-screen w-screen overflow-hidden flex justify-center transition-colors duration-500 font-sans`}>
      
      {/* Ambient Background Orbs & Noise Texture */}
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
      
      {/* Global Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>

      <NotificationContext.Provider value={{ openNotifications }}>
        {/* View As Banner - shows when admin is viewing as another member */}
        <ViewAsBanner />
        
        {/* Main App Container */}
        <div className={`relative w-full h-full flex flex-col overflow-hidden ${isDarkTheme ? 'text-white' : 'text-primary'}`}>
            
            {/* Header - Now Relative (Flex Item) to flush perfectly with content */}
            {showHeader && (
              <header className={`flex items-center justify-between px-6 py-4 flex-shrink-0 ${headerClasses}`} role="banner">
                <button 
                  onClick={handleTopLeftClick}
                  className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg`}
                  aria-label={isRootPage ? 'Open menu' : 'Go back'}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {isRootPage ? 'menu' : 'arrow_back'}
                  </span>
                </button>
                
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

                <div className="flex items-center gap-1 ml-auto">
                  {isMemberRoute && user && (
                    <button 
                      onClick={() => setIsNotificationsOpen(true)}
                      className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg relative`}
                      aria-label="Notifications"
                    >
                      <span className="material-symbols-outlined text-[24px]">notifications</span>
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button 
                    onClick={handleTopRightClick}
                    className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg`}
                    aria-label={user ? (isMemberRoute ? 'View profile' : 'Go to dashboard') : 'Login'}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                       {getTopRightIcon()}
                    </span>
                  </button>
                </div>
              </header>
            )}

            {/* Main Content - No top padding needed due to flex layout */}
            <main 
                id="main-content"
                className={`flex-1 overflow-hidden relative scrollbar-hide ${isMemberRoute ? (isDarkTheme ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]') : 'overflow-y-auto overscroll-contain'}`}
            >
                <div key={location.pathname} className={`${shouldAnimate ? 'animate-page-enter' : ''} min-h-full`}>
                    {children}
                </div>
            </main>

            
            <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            
            {/* Notifications Modal */}
            {isNotificationsOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setIsNotificationsOpen(false)}></div>
                 <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-in slide-in-from-top-5 duration-300 border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-xl text-white">Notifications</h3>
                       <div className="flex items-center gap-2">
                         {unreadCount > 0 && (
                           <button 
                             onClick={markAllAsRead}
                             className="text-xs text-white/70 hover:text-white transition-colors"
                           >
                             Mark all read
                           </button>
                         )}
                         <button onClick={() => setIsNotificationsOpen(false)} className="w-8 h-8 rounded-lg glass-button flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">close</span>
                         </button>
                       </div>
                    </div>
                    
                    <div className="h-[350px] overflow-y-auto space-y-3 scrollbar-hide">
                      {userNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/50">
                          <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        userNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                            className={`flex gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                              notif.is_read 
                                ? 'bg-white/5 hover:bg-white/10' 
                                : 'bg-accent/20 hover:bg-accent/30 border border-accent/30'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              notif.type === 'booking_approved' ? 'bg-green-500/20' :
                              notif.type === 'booking_declined' ? 'bg-red-500/20' :
                              'bg-accent/20'
                            }`}>
                              <span className={`material-symbols-outlined text-[20px] ${
                                notif.type === 'booking_approved' ? 'text-green-400' :
                                notif.type === 'booking_declined' ? 'text-red-400' :
                                'text-white'
                              }`}>
                                {notif.type === 'booking_approved' ? 'check_circle' :
                                 notif.type === 'booking_declined' ? 'cancel' :
                                 'notifications'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className={`font-bold text-sm ${notif.is_read ? 'text-white/70' : 'text-white'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-white/50 ml-2 shrink-0">
                                  {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${notif.is_read ? 'text-white/50' : 'text-white/70'}`}>
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                 </div>
              </div>
            )}
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
          <HashRouter>
            <ScrollToTop />
            <Layout>
              <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/membership/*" element={<Membership />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/whats-on" element={<WhatsOn />} />
              <Route path="/private-hire" element={<PrivateHire />} />
              <Route path="/private-events" element={<PrivateEvents />} />
              <Route path="/wellness" element={<PublicWellness />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Admin Routes - requires admin role */}
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              } />

              {/* Member Portal - Swipeable tabs */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              <Route path="/book" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              <Route path="/member-events" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              <Route path="/member-wellness" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              <Route path="/cafe" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              <Route path="/sims" element={
                <ProtectedRoute>
                  <Sims />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </Layout>
          </HashRouter>
          </ToastProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;