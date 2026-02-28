'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from './supabase-browser';
import type { User } from '@supabase/supabase-js';
import { useThemeStore, type ThemePreset, MASTER_THEME } from './theme';

// ============================================================
// TYPES
// ============================================================

export interface CommunityMembership {
  id: string;
  community_id: string;
  role: 'resident' | 'community_admin';
  is_default: boolean;
  joined_at: string;
  community: {
    id: string;
    name: string;
    slug: string;
    settings: {
      theme?: { preset?: string };
      features?: Record<string, boolean>;
    } | null;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Residency {
  id: string;
  resident_type: string;
  starts_at: string;
  ends_at: string | null;
  is_current: boolean;
  unit: {
    id: string;
    unit_number: string;
    floor: string | null;
    unit_type: string | null;
    community_id: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  memberships: CommunityMembership[];
  activeMembership: CommunityMembership | null;
  residencies: Residency[];
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  role: string | null;
  activeCommunity: CommunityMembership['community'] | null;
  features: Record<string, boolean>;
  switchCommunity: (membership: CommunityMembership) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  memberships: [],
  activeMembership: null,
  residencies: [],
  loading: true,
  isSuperAdmin: false,
  isAdmin: false,
  role: null,
  activeCommunity: null,
  features: {},
  switchCommunity: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<CommunityMembership[]>([]);
  const [activeMembership, setActiveMembership] = useState<CommunityMembership | null>(null);
  const [residencies, setResidencies] = useState<Residency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setUser(null);
      setProfile(null);
      setMemberships([]);
      setActiveMembership(null);
      setResidencies([]);
      setLoading(false);
      return;
    }

    setUser(user);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) setProfile(profileData);

    // Fetch memberships with community details
    const { data: membershipData } = await supabase
      .from('user_communities')
      .select('*, community:communities(id, name, slug, settings)')
      .eq('user_id', user.id);

    if (membershipData && membershipData.length > 0) {
      setMemberships(membershipData);
      const defaultMembership =
        membershipData.find((m) => m.is_default) || membershipData[0];
      setActiveMembership(defaultMembership);

      const preset = defaultMembership?.community?.settings?.theme?.preset as ThemePreset | undefined;
      if (preset) {
        useThemeStore.getState().setPreset(preset);
      }
    }

    // Fetch current residencies
    const { data: residencyData } = await supabase
      .from('residencies')
      .select('*, unit:units(id, unit_number, floor, unit_type, community_id)')
      .eq('user_id', user.id)
      .eq('is_current', true);

    if (residencyData) setResidencies(residencyData);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setMemberships([]);
          setActiveMembership(null);
          setResidencies([]);
        } else if (event === 'SIGNED_IN') {
          fetchData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchData]);

  const switchCommunity = async (membership: CommunityMembership) => {
    // Unset old default
    if (activeMembership) {
      await supabase
        .from('user_communities')
        .update({ is_default: false })
        .eq('id', activeMembership.id);
    }

    // Set new default
    await supabase
      .from('user_communities')
      .update({ is_default: true })
      .eq('id', membership.id);

    setActiveMembership(membership);

    // Update local state
    setMemberships((prev) =>
      prev.map((m) => ({
        ...m,
        is_default: m.id === membership.id,
      }))
    );

    // Switch theme to match community
    const preset = membership.community?.settings?.theme?.preset as ThemePreset | undefined;
    useThemeStore.getState().setPreset(preset || MASTER_THEME);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useThemeStore.getState().setPreset(MASTER_THEME);
    router.push('/auth/login');
    router.refresh();
  };

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const isAdmin =
    isSuperAdmin || activeMembership?.role === 'community_admin';
  const role = activeMembership?.role ?? null;
  const activeCommunity = activeMembership?.community ?? null;
  const features = activeCommunity?.settings?.features ?? {};

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        memberships,
        activeMembership,
        residencies,
        loading,
        isSuperAdmin,
        isAdmin,
        role,
        activeCommunity,
        features,
        switchCommunity,
        signOut,
        refresh: fetchData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}