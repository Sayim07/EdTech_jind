import { MessageSquare, Award, ClipboardList, Compass, CreditCard, LayoutDashboard, Store, UserRound, Users, BookOpen, Briefcase } from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  /** Heading shown in the top bar when this link is active. */
  title?: string;
  icon: typeof Award;
  /** `tab` is the admin dashboard's ?tab= value (empty when absent). */
  match: (pathname: string, tab: string) => boolean;
}

export const STUDENT_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', title: 'My Dashboard', icon: LayoutDashboard, match: (p) => p === '/dashboard' },
  { href: '/courses', label: 'Courses', icon: Compass, match: (p) => p.startsWith('/courses') },
  { href: '/assignments', label: 'Assignments', icon: ClipboardList, match: (p) => p.startsWith('/assignments') },
  { href: '/purchases', label: 'Purchases & Certificates', icon: Award, match: (p) => p.startsWith('/purchases') || p.startsWith('/certificates') },
  { href: '/messages', label: 'Messages', title: 'Messages', icon: MessageSquare, match: (p) => p.startsWith('/messages') },
  { href: '/profile', label: 'Profile', icon: UserRound, match: (p) => p === '/profile' },
];

export const INSTRUCTOR_LINKS: NavLink[] = [
  { href: '/messages', label: 'Messages', title: 'Messages', icon: MessageSquare, match: (p) => p.startsWith('/messages') },
  { href: '/profile', label: 'Profile', icon: UserRound, match: (p) => p === '/profile' },
];

const onAdminTab = (p: string, tab: string, id: string) => p === '/admin' && tab === id;

export const ADMIN_LINKS: NavLink[] = [
  { href: '/admin?tab=home', label: 'Dashboard', title: 'Admin Dashboard', icon: LayoutDashboard, match: (p, t) => p === '/admin' && (t === '' || t === 'home' || t === 'analytics') },
  { href: '/admin?tab=courses', label: 'Courses', title: 'Manage Courses', icon: BookOpen, match: (p, t) => onAdminTab(p, t, 'courses') || p.startsWith('/admin/courses') || p.startsWith('/admin/categories') },
  { href: '/admin?tab=students', label: 'Students', title: 'Registered Students', icon: Users, match: (p, t) => onAdminTab(p, t, 'students') },
  { href: '/admin?tab=payments', label: 'Payments', title: 'Fee Payments', icon: CreditCard, match: (p, t) => onAdminTab(p, t, 'payments') || p.startsWith('/admin/payments') },
  { href: '/admin/staff', label: 'Staff', title: 'Staff', icon: Briefcase, match: (p) => p.startsWith('/admin/staff') },
  { href: '/messages', label: 'Messages', title: 'Messages', icon: MessageSquare, match: (p) => p.startsWith('/messages') },
  { href: '/admin?tab=profile', label: 'Profile', title: 'Admin Profile', icon: UserRound, match: (p, t) => onAdminTab(p, t, 'profile') },
  { href: '/courses', label: 'Storefront', title: 'Storefront', icon: Store, match: (p) => p.startsWith('/courses') },
];

export const linksFor = (role?: string) => (role === 'ADMIN' ? ADMIN_LINKS : role === 'INSTRUCTOR' ? INSTRUCTOR_LINKS : STUDENT_LINKS);
