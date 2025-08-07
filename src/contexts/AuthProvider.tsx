import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'user';
  xp: number;
  game_points: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean; // Indicates if initial auth state is being determined
  profileLoading: boolean; // Indicates if profile data is being fetched
  signOut: () => Promise<void>;
  userLevel: number;
  userBadge: string;
  leaderboardPopupData: { position: number } | null;
  closeLeaderboardPopup: () => void;
  checkLeaderboard: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const XP_LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, badge: "Bronze" },
  { level: 2, xp: 100, badge: "Silver" },
  { level: 3, xp: 250, badge: "Gold" },
  { level: 4, xp: 500, badge: "Platinum" },
  { level: 5, xp: 1000, badge: "Diamond" },
];

const calculateLevelAndBadge = (xp: number) => {
  let level = 1;
  let badge = "Bronze";
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVEL_THRESHOLDS[i].xp) {
      level = XP_LEVEL_THRESHOLDS[i].level;
      badge = XP_LEVEL_THRESHOLDS[i].badge;
      break;
    }
  }
  return { level, badge };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // True initially
  const [profileLoading, setProfileLoading] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [userBadge, setUserBadge] = useState("Bronze");
  const [leaderboardPopupData, setLeaderboardPopupData] = useState<{ position: number } | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, xp, game_points')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        // Handle specific error cases
        if (profileError.code === 'PGRST116') {
          console.warn('Profile not found for user:', userId);
        } else {
          console.error('Profile fetch error:', profileError);
        }
        throw profileError;
      }

      if (profileData) {
        const typedProfile = profileData as Profile;
        setProfile(typedProfile);
        const { level, badge } = calculateLevelAndBadge(typedProfile.xp);
        setUserLevel(level);
        setUserBadge(badge);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      setUserLevel(1);
      setUserBadge("Bronze");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const checkLeaderboard = useCallback(async () => {
    if (!user || profile?.role === 'admin') return; // Don't show for admins
    try {
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('profiles')
        .select('id')
        .order('xp', { ascending: false });

      if (leaderboardError) throw leaderboardError;

      const userRankIndex = leaderboard.findIndex(p => p.id === user.id);
      
      if (userRankIndex !== -1) {
        const currentPosition = userRankIndex + 1;
        setLeaderboardPopupData({ position: currentPosition });
      }
    } catch (error) {
      console.error("Error checking leaderboard rank:", error);
    }
  }, [user, profile]);

  useEffect(() => {
    // This listener is crucial for initial session and subsequent changes.
    // The 'INITIAL_SESSION' event fires when the client first determines the session state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'INITIAL_SESSION') {
          // For the initial session, set loading to false immediately.
          // Profile fetching can happen in the background.
          setLoading(false);
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // For sign-in or user updates, fetch profile.
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setProfile(null);
          setUserLevel(1);
          setUserBadge("Bronze");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]); // fetchProfile is a dependency because it's called inside useEffect

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const closeLeaderboardPopup = () => {
    setLeaderboardPopupData(null);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    profileLoading,
    signOut,
    userLevel,
    userBadge,
    leaderboardPopupData,
    closeLeaderboardPopup,
    checkLeaderboard,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};