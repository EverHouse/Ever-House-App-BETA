type LazyComponent = { prefetch?: () => Promise<any> };

const prefetchedPaths = new Set<string>();

const routeImports: Record<string, () => Promise<any>> = {
  '/book': () => import('../pages/Member/BookGolf'),
  '/member-events': () => import('../pages/Member/Events'),
  '/member-wellness': () => import('../pages/Member/Wellness'),
  '/profile': () => import('../pages/Member/Profile'),
  '/cafe': () => import('../pages/Member/Cafe'),
  '/dashboard': () => import('../pages/Member/Dashboard'),
};

export const prefetchRoute = (path: string) => {
  if (prefetchedPaths.has(path)) return;
  const importFn = routeImports[path];
  if (importFn) {
    prefetchedPaths.add(path);
    importFn();
  }
};

export const prefetchAdjacentRoutes = (currentPath: string) => {
  const navOrder = ['/dashboard', '/book', '/member-wellness', '/member-events', '/cafe'];
  const idx = navOrder.indexOf(currentPath);
  if (idx === -1) return;
  
  if (idx > 0) prefetchRoute(navOrder[idx - 1]);
  if (idx < navOrder.length - 1) prefetchRoute(navOrder[idx + 1]);
};

export const prefetchAllNavRoutes = () => {
  Object.keys(routeImports).forEach(prefetchRoute);
};

export const prefetchOnIdle = () => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => prefetchAllNavRoutes());
  } else {
    setTimeout(prefetchAllNavRoutes, 100);
  }
};
