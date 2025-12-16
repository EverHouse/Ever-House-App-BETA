export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  image: string;
  category: string;
  description: string;
  spotsLeft?: number;
  isFull?: boolean;
  price?: string;
}

export enum MembershipTier {
  Social = 'Social',
  Core = 'Core',
  Premium = 'Premium',
  Corporate = 'Corporate',
}

export interface MenuItem {
  label: string;
  path: string;
}
