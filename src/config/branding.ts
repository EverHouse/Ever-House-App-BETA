export const BRAND = {
  name: 'Even House',
  tagline: 'A new kind of members club — rooted in golf, built for community.',
  
  logos: {
    monogram: {
      dark: '/assets/logos/monogram-dark.png',
      white: '/assets/logos/monogram-white.png',
    },
    mascot: {
      dark: '/assets/logos/EH-guy logo black.png',
      white: '/assets/logos/EH-guy logo white.png',
    },
  },
  
  colors: {
    primary: '#293515',
    accent: '#C4A962',
    background: {
      light: '#F2F2EC',
      dark: '#0f120a',
    },
  },
};

export type LogoType = 'monogram' | 'mascot';
export type LogoVariant = 'dark' | 'white';

export function getLogo(type: LogoType, variant: LogoVariant): string {
  return BRAND.logos[type][variant];
}

export function getLogoForContext(options: {
  isMemberRoute: boolean;
  isDarkBackground: boolean;
}): string {
  const { isMemberRoute, isDarkBackground } = options;
  const type: LogoType = isMemberRoute ? 'mascot' : 'monogram';
  const variant: LogoVariant = isDarkBackground ? 'white' : 'dark';
  return getLogo(type, variant);
}
