
import React, { useState, useEffect, useContext, createContext, ErrorInfo, useMemo } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Debug layout mode - activate with ?debugLayout=1
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

import Logo from './components/Logo';
import Dashboard from './pages/Member/Dashboard';
import BookGolf from './pages/Member/BookGolf';
import MemberEvents from './pages/Member/Events';
import MemberWellness from './pages/Member/Wellness';
import Profile from './pages/Member/Profile';
import Cafe from './pages/Member/Cafe';
import Sims from './pages/Member/Sims';
import Landing from './pages/Public/Landing';
import Membership from './pages/Public/Membership';
import Contact from './pages/Public/Contact';
import Gallery from './pages/Public/Gallery';
import WhatsOn from './pages/Public/WhatsOn';
import PrivateHire from './pages/Public/PrivateHire';
import PrivateEvents from './pages/Public/PrivateEvents';
import PublicWellness from './pages/Public/Wellness';
import PublicCafe from './pages/Public/Cafe';
import FAQ from './pages/Public/FAQ';
import Login from './pages/Public/Login';
import VerifyMagicLink from './pages/Public/VerifyMagicLink';
import AuthCallback from './pages/Public/AuthCallback';
import MenuOverlay from './components/MenuOverlay';
import ViewAsBanner from './components/ViewAsBanner';
import AdminDashboard from './pages/Admin/AdminDashboard';
import { ToastProvider } from './components/Toast';

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
  
  // Activate debug layout mode
  useDebugLayout();
  
  const isMemberRoute = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/cafe', '/sims'].some(path => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  // Admin always dark, member routes respect theme preference, public routes always light
  const isDarkTheme = isAdminRoute || (isMemberRoute && effectiveTheme === 'dark');
  const showHeader = !isAdminRoute;

  // Routes that handle their own slide animation
  const shouldAnimate = true;

  // Navigation Logic: Always show hamburger menu
  const handleTopLeftClick = () => {
    setIsMenuOpen(true);
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
      if (isProfilePage) return 'dashboard';
      if (isMemberRoute) return 'account_circle';
      return 'account_circle';
  };

  const getCenterIcon = () => {
      if (!isMemberRoute) return null;
      const path = location.pathname;
      if (path === '/dashboard') return 'home';
      if (path === '/profile') return 'account_circle';
      if (path.startsWith('/book') || path.startsWith('/sims')) return 'sports_golf';
      if (path.startsWith('/member-wellness')) return 'spa';
      if (path.startsWith('/cafe')) return 'local_cafe';
      if (path.startsWith('/member-events')) return 'celebration';
      return 'home';
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
                  aria-label="Open menu"
                >
                  <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                
                {isMemberRoute ? (
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <span 
                      key={getCenterIcon()}
                      className={`material-symbols-outlined text-[32px] animate-icon-morph ${isDarkTheme ? 'text-[#F2F2EC]' : 'text-[#F2F2EC]'}`}
                    >
                      {getCenterIcon()}
                    </span>
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
                    <span 
                      key={getTopRightIcon()}
                      className="material-symbols-outlined text-[24px] animate-icon-morph"
                    >
                       {getTopRightIcon()}
                    </span>
                  </button>
                </div>
              </header>
            )}

            {/* Main Content - No top padding needed due to flex layout */}
            <main 
                id="main-content"
                className={`flex-1 overflow-y-auto overscroll-contain relative scrollbar-hide ${isMemberRoute && !isAdminRoute ? 'pb-32' : ''} ${isMemberRoute ? (isDarkTheme ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]') : ''}`}
            >
                <div key={location.pathname} className={`${shouldAnimate ? 'animate-page-enter' : ''} min-h-full`}>
                    {children}
                </div>
            </main>

            {/* Member Dock - Full Width with iOS Safe Area */}
            {isMemberRoute && !isAdminRoute && user && (
              <div className="fixed bottom-0 left-0 right-0 flex justify-center z-30 px-4 pb-4 safe-area-bottom">
                 <nav 
                   className={`w-full max-w-md rounded-2xl p-1.5 flex items-stretch justify-between h-16 ${
                     isDarkTheme 
                       ? 'glass-card bg-[#0f120a]/80 border border-white/10 shadow-glass backdrop-blur-2xl' 
                       : 'bg-[#293515] shadow-lg'
                   }`} 
                   role="navigation" 
                   aria-label="Member navigation"
                 >
                    <NavItem to="/dashboard" icon="dashboard" isActive={location.pathname === '/dashboard'} label="Dashboard" isDarkTheme={isDarkTheme} />
                    <NavItem to="/book" icon="sports_golf" isActive={location.pathname === '/book'} label="Book Golf" isDarkTheme={isDarkTheme} />
                    <NavItem to="/member-wellness" icon="spa" isActive={location.pathname === '/member-wellness'} label="Wellness" isDarkTheme={isDarkTheme} />
                    <NavItem to="/member-events" icon="calendar_month" isActive={location.pathname === '/member-events'} label="Events" isDarkTheme={isDarkTheme} />
                    <NavItem to="/cafe" icon="local_cafe" isActive={location.pathname === '/cafe'} label="Cafe" isDarkTheme={isDarkTheme} />
                 </nav>
              </div>
            )}

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

const NotifItem: React.FC<{icon: string; title: string; desc: string; time: string}> = ({ icon, title, desc, time }) => (
  <div className="flex gap-3 p-3 rounded-xl glass-button border-0 bg-white/5 hover:bg-white/10 transition-colors">
     <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
     </div>
     <div>
        <div className="flex justify-between items-center w-full">
           <h4 className="font-bold text-sm text-white">{title}</h4>
           <span className="text-[10px] text-white/50 ml-2">{time}</span>
        </div>
        <p className="text-xs text-white/70 mt-0.5">{desc}</p>
     </div>
  </div>
);

const NavItem: React.FC<{ to: string; icon: string; isActive: boolean; label: string; isDarkTheme: boolean }> = ({ to, icon, isActive, label, isDarkTheme }) => {
  const navigate = useNavigate();
  const isGolfIcon = icon === 'sports_golf';
  const shouldFill = isActive && !isGolfIcon;

  const activeClasses = isDarkTheme 
    ? 'bg-[#E7E7DC] text-[#293515] shadow-glow scale-105' 
    : 'bg-white text-[#293515] shadow-md scale-105';
  
  const inactiveClasses = isDarkTheme
    ? 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
    : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95';

  return (
    <button 
      onClick={() => navigate(to)} 
      className={`flex-1 h-full flex items-center justify-center rounded-xl transition-all duration-300 focus:ring-2 focus:ring-accent focus:outline-none ${isActive ? activeClasses : inactiveClasses}`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`material-symbols-outlined text-[24px] ${shouldFill ? 'filled' : ''}`}>{icon}</span>
    </button>
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
              <Route path="/menu" element={<PublicCafe />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify" element={<VerifyMagicLink />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<Login />} />

              {/* Admin Routes - requires admin role */}
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              } />

              {/* Member Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/book" element={
                <ProtectedRoute>
                  <BookGolf />
                </ProtectedRoute>
              } />
              <Route path="/member-events" element={
                <ProtectedRoute>
                  <MemberEvents />
                </ProtectedRoute>
              } />
              <Route path="/member-wellness" element={
                <ProtectedRoute>
                  <MemberWellness />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/cafe" element={
                <ProtectedRoute>
                  <Cafe />
                </ProtectedRoute>
              } />
              <Route path="/sims" element={
                <ProtectedRoute>
                  <Sims />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </HashRouter>
          </ToastProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;