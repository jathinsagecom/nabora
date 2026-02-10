'use client';

// ============================================================
// NAVIGATION CONFIG
// All menu items, grouped by section.
// role: minimum role required (null = any authenticated user)
// feature: feature flag that must be enabled in community settings
// showInBottomBar: whether to show in mobile bottom tab bar
// ============================================================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
  section: 'main' | 'manage' | 'admin';
  role: 'resident' | 'community_admin' | null;
  superAdminOnly?: boolean;
  feature?: string; // key in community.settings.features
  showInBottomBar?: boolean;
}

export const navItems: NavItem[] = [
  // ──── Main Section (all users) ────
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: '◻',
    activeIcon: '◼',
    section: 'main',
    role: null,
    showInBottomBar: true,
  },
  {
    label: 'Events',
    href: '/events',
    icon: '◇',
    activeIcon: '◆',
    section: 'main',
    role: null,
    feature: 'events',
    showInBottomBar: false,
  },
  {
    label: 'Tips',
    href: '/tips',
    icon: '☆',
    activeIcon: '★',
    section: 'main',
    role: null,
    feature: 'tips',
    showInBottomBar: true,
  },
  {
    label: 'Facilities',
    href: '/facilities',
    icon: '☆',
    activeIcon: '★',
    section: 'main',
    role: null,
    feature: 'facilities',
    showInBottomBar: true,
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: '☆',
    activeIcon: '★',
    section: 'main',
    role: null,
    feature: 'documents',
    showInBottomBar: false,
  },
  {
    label: 'My Bookings',
    href: '/bookings',
    icon: '☆',
    activeIcon: '★',
    section: 'main',
    role: null,
    feature: 'facilities',
    showInBottomBar: false,
  },
  {
    label: 'Contacts',
    href: '/contacts',
    icon: '☆',
    activeIcon: '★',
    section: 'main',
    role: null,
    feature: 'contacts',
    showInBottomBar: true,
  },

  // ──── Manage Section (community_admin) ────
  {
    label: 'Invites',
    href: '/manage/invites',
    icon: '✉',
    activeIcon: '✉',
    section: 'manage',
    role: 'community_admin',
  },
  {
    label: 'Events',
    href: '/manage/events',
    icon: '◇',
    activeIcon: '◆',
    section: 'manage',
    role: 'community_admin',
  },
  {
    label: 'Residents',
    href: '/manage/residents',
    icon: '♟',
    activeIcon: '♟',
    section: 'manage',
    role: 'community_admin',
  },
  {
    label: 'Units',
    href: '/manage/units',
    icon: '⊞',
    activeIcon: '⊞',
    section: 'manage',
    role: 'community_admin',
  },
  {
    label: 'Bookings',
    href: '/manage/bookings',
    icon: '⊞',
    activeIcon: '⊞',
    section: 'manage',
    role: 'community_admin',
  },
  {
    label: 'Settings',
    href: '/manage/settings',
    icon: '⊘',
    activeIcon: '⊘',
    section: 'manage',
    role: 'community_admin',
  },

  // ──── Admin Section (super_admin) ────
  {
    label: 'Communities',
    href: '/admin/communities',
    icon: '⊕',
    activeIcon: '⊕',
    section: 'admin',
    role: null,
    superAdminOnly: true,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: '⊗',
    activeIcon: '⊗',
    section: 'admin',
    role: null,
    superAdminOnly: true,
  },
];

// ============================================================
// HELPER: Filter nav items based on user context
// ============================================================

export function getVisibleNavItems(
  role: string | null,
  isSuperAdmin: boolean,
  features: Record<string, boolean>
): NavItem[] {
  return navItems.filter((item) => {
    // Super admin only items
    if (item.superAdminOnly && !isSuperAdmin) return false;

    // Role check
    if (item.role === 'community_admin') {
      if (role !== 'community_admin' && !isSuperAdmin) return false;
    }

    // Feature flag check
    if (item.feature) {
      // If features object is empty (no settings), show all by default
      if (Object.keys(features).length > 0 && features[item.feature] === false) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================
// HELPER: Get bottom bar items (mobile)
// ============================================================

export function getBottomBarItems(
  role: string | null,
  isSuperAdmin: boolean,
  features: Record<string, boolean>
): NavItem[] {
  return getVisibleNavItems(role, isSuperAdmin, features).filter(
    (item) => item.showInBottomBar
  );
}