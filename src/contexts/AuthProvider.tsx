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
  loading: boolean; // Indicates if initial auth state is being determined
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
  const [loading, setLoading] = useState(true); // Start loading until session is checked
  const [profileLoading, setProfileLoading] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [userBadge, setUserBadge] = useState("Bronze");
  const [leaderboardPopupData, setLeaderboardPopupData] = useState<{ position: number } | null>(null);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;

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
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // On initial load, get the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false); // We're done with the initial session check
    });

    // Then, set up a listener for future auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch profile if it's a new session or user
          if (!profile || profile.id !== session.user.id) {
            fetchProfile(session.user.id);
          }

          if (_event === 'SIGNED_IN') {
            // Leaderboard check logic
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
                
                if (!lastSeenPositionStr || currentPosition < parseInt(lastSeenPositionStr, 10)) {
                  setLeaderboardPopupData({ position: currentPosition });
                }
              }
            } catch (error) {
              console.error("Error checking leaderboard rank:", error);
            }
          }
        } else {
          setProfile(null);
          setUserLevel(1);
          setUserBadge("Bronze");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

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