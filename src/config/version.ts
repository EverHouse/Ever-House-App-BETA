export const APP_VERSION = '1.1.0';
export const LAST_UPDATED = '2025-12-27';

export const VERSION_HISTORY = [
  {
    version: '1.1.0',
    date: '2025-12-27',
    changes: [
      'Added walking mascot loading animation with random taglines',
      'Added navigation loader for smooth page transitions',
      'Optimized app performance and cleaned up codebase',
      'Improved loading experience with fade-in animations',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-12-26',
    changes: [
      'Initial release of Even House Members App',
      'Member dashboard with booking and guest pass features',
      'Staff portal with admin management tools',
      'Golf simulator booking system with approval workflow',
      'Events, wellness, and announcements integration',
    ],
  },
];

export function formatLastUpdated(): string {
  const date = new Date(LAST_UPDATED + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
