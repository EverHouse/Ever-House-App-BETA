
import React, { useState, useEffect, useContext, createContext, ErrorInfo, useMemo } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';

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
import Landing from './pages/Public/Landing';
import Membership from './pages/Public/Membership';
import Contact from './pages/Public/Contact';
import Gallery from './pages/Public/Gallery';
import WhatsOn from './pages/Public/WhatsOn';
import PrivateHire from './pages/Public/PrivateHire';
import PrivateEvents from './pages/Public/PrivateEvents';
import PublicWellness from './pages/Public/Wellness';
import FAQ from './pages/Public/FAQ';
import Login from './pages/Public/Login';
import MenuOverlay from './components/MenuOverlay';
import AdminDashboard from './pages/Admin/AdminDashboard';

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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { announcements, user } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'updates' | 'announcements'>('updates');
  
  // Activate debug layout mode
  useDebugLayout();
  
  const isMemberRoute = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/cafe'].some(path => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isDarkTheme = isMemberRoute || isAdminRoute;
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

  const handleTopRightClick = () => {
    if (user) {
        if (isMemberRoute) {
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
      if (isMemberRoute) return 'qr_code_2'; // Updated to clean QR icon
      return 'account_circle';
  };

  const openNotifications = (tab?: 'updates' | 'announcements') => {
    if (tab) setNotifTab(tab);
    setIsNotificationsOpen(true);
  };
  
  // Header: Black for member routes, Brand Green for public
  const headerClasses = isMemberRoute 
    ? "bg-[#0f120a] text-[#F2F2EC] shadow-md relative z-40 border-b border-white/5"
    : "bg-[#293515] text-[#F2F2EC] shadow-md relative z-40";
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
                  className="cursor-pointer flex items-center justify-center focus:ring-2 focus:ring-accent focus:outline-none rounded-lg" 
                  onClick={() => navigate('/')}
                  aria-label="Go to home"
                >
                  <Logo 
                    isMemberRoute={isMemberRoute} 
                    isDarkBackground={true} 
                    className="h-14 w-auto"
                  />
                </button>

                <button 
                  onClick={handleTopRightClick}
                  className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg`}
                  aria-label={user ? (isMemberRoute ? 'View profile' : 'Go to dashboard') : 'Login'}
                >
                  <span className="material-symbols-outlined text-[24px]">
                     {getTopRightIcon()}
                  </span>
                </button>
              </header>
            )}

            {/* Main Content - No top padding needed due to flex layout */}
            <main 
                id="main-content"
                className={`flex-1 overflow-y-auto overscroll-contain relative scrollbar-hide ${showHeader ? 'pb-32' : ''}`}
            >
                <div key={location.pathname} className={`${shouldAnimate ? 'animate-page-enter' : ''} min-h-full`}>
                    {children}
                </div>
            </main>

            {/* Member Dock - Full Width with iOS Safe Area */}
            {isMemberRoute && !isAdminRoute && user && (
              <div className="fixed bottom-0 left-0 right-0 flex justify-center z-30 px-4 pb-4 safe-area-bottom">
                 <nav className="w-full max-w-md glass-card rounded-2xl p-1.5 flex items-stretch justify-between shadow-glass backdrop-blur-2xl bg-[#0f120a]/80 border border-white/10 h-16" role="navigation" aria-label="Member navigation">
                    <NavItem to="/dashboard" icon="dashboard" isActive={location.pathname === '/dashboard'} label="Dashboard" />
                    <NavItem to="/book" icon="sports_golf" isActive={location.pathname === '/book'} label="Book Golf" />
                    <NavItem to="/member-wellness" icon="spa" isActive={location.pathname === '/member-wellness'} label="Wellness" />
                    <NavItem to="/member-events" icon="calendar_month" isActive={location.pathname === '/member-events'} label="Events" />
                    <NavItem to="/cafe" icon="local_cafe" isActive={location.pathname === '/cafe'} label="Cafe" />
                 </nav>
              </div>
            )}

            <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            
            {/* Notifications Modal */}
            {isNotificationsOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setIsNotificationsOpen(false)}></div>
                 <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-in slide-in-from-top-5 duration-300 border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-bold text-xl text-white">Notifications</h3>
                       <button onClick={() => setIsNotificationsOpen(false)} className="w-8 h-8 rounded-lg glass-button flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">close</span>
                       </button>
                    </div>
                    
                    <div className="h-[300px] overflow-y-auto space-y-3 scrollbar-hide">
                      {notifTab === 'updates' ? (
                         <>
                            <NotifItem icon="check_circle" title="Booking Confirmed" desc="Bay 2 • Tomorrow, 9:00 AM" time="2h ago" />
                            <NotifItem icon="local_cafe" title="Order Ready" desc="Pickup at counter" time="5h ago" />
                         </>
                      ) : (
                         announcements.map((ann) => (
                            <NotifItem key={ann.id} icon="campaign" title={ann.title} desc={ann.desc} time={ann.date} />
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

const NavItem: React.FC<{ to: string; icon: string; isActive: boolean; label: string }> = ({ to, icon, isActive, label }) => {
  const navigate = useNavigate();
  const isGolfIcon = icon === 'sports_golf';
  const shouldFill = isActive && !isGolfIcon;

  return (
    <button 
      onClick={() => navigate(to)} 
      className={`flex-1 h-full flex items-center justify-center rounded-xl transition-all duration-300 focus:ring-2 focus:ring-accent focus:outline-none ${isActive ? 'bg-[#E7E7DC] text-[#293515] shadow-glow scale-105' : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}`}
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
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Login />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
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
              
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </HashRouter>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;