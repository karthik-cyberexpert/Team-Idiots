import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'user';
  xp: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean; // Indicates if initial auth state is being determined (session only)
  profileLoading: boolean; // Indicates if profile data is being fetched
  signOut: () => Promise<void>;
  userLevel: number;
  userBadge: string;
  leaderboardPopupData: { position: number } | null;
  closeLeaderboardPopup: () => void;
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
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [userBadge, setUserBadge] = useState("Bronze");
  const [leaderboardPopupData, setLeaderboardPopupData] = useState<{ position: number } | null>(null);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error("Error fetching profile:", profileError);
      setProfile(null);
    } else if (profileData) {
      const typedProfile = profileData as Profile;
      setProfile(typedProfile);
      const { level, badge } = calculateLevelAndBadge(typedProfile.xp);
      setUserLevel(level);
      setUserBadge(badge);
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Stop the main loading indicator as soon as we know the session status
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false);
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id); // Fetch profile, but don't block rendering

        if (event === 'SIGNED_IN') {
          try {
            const { data: leaderboard, error: leaderboardError } = await supabase
              .from('profiles')
              .select('id, xp')
              .order('xp', { ascending: false });

            if (leaderboardError) throw leaderboardError;

            const userRankIndex = leaderboard.findIndex(p => p.id === session.user.id);
            
            if (userRankIndex !== -1) {
              const currentPosition = userRankIndex + 1;
              const lastSeenPositionStr = localStorage.getItem(`leaderboard-seen-position-${session.user.id}`);
              
              if (lastSeenPositionStr) {
                const lastSeenPosition = parseInt(lastSeenPositionStr, 10);
                if (currentPosition < lastSeenPosition) {
                  setLeaderboardPopupData({ position: currentPosition });
                } else if (currentPosition > lastSeenPosition) {
                  localStorage.setItem(`leaderboard-seen-position-${session.user.id}`, String(currentPosition));
                }
              } else {
                setLeaderboardPopupData({ position: currentPosition });
              }
            }
          } catch (error) {
            console.error("Error checking leaderboard rank on sign-in:", error);
          }
        }
      } else {
        setProfile(null);
        setUserLevel(1);
        setUserBadge("Bronze");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const closeLeaderboardPopup = () => {
    if (leaderboardPopupData && user) {
      localStorage.setItem(`leaderboard-seen-position-${user.id}`, String(leaderboardPopupData.position));
    }
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