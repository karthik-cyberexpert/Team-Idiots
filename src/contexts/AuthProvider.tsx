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
  signOut: () => Promise<void>;
  userLevel: number;
  userBadge: string;
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
  const [loading, setLoading] = useState(true); // Start true
  const [userLevel, setUserLevel] = useState(1);
  const [userBadge, setUserBadge] = useState("Bronze");

  useEffect(() => {
    let isMounted = true;

    const fetchSessionAndProfile = async (currentSession: Session | null) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
        
        if (isMounted) {
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
        }
      } else {
        if (isMounted) {
          setProfile(null);
          setUserLevel(1);
          setUserBadge("Bronze");
        }
      }
      if (isMounted) {
        setLoading(false); // Ensure loading is set to false only after all async ops are done
        console.log("AuthProvider: Loading set to false. Current session:", currentSession);
      }
    };

    // Initial session check using getSession()
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        fetchSessionAndProfile(initialSession);
      }
    }).catch(error => {
      console.error("AuthProvider: Error getting initial session:", error);
      if (isMounted) {
        setLoading(false); // Ensure loading is false even on error
      }
    });

    // Listen for auth state changes (for subsequent events like login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        // For subsequent changes (login, logout, token refresh), update state
        fetchSessionAndProfile(currentSession);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Real-time profile updates for XP, etc. (This is separate and fine)
  useEffect(() => {
    if (user?.id) {
      const channel = supabase
        .channel(`public:profiles:id=eq.${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            const newProfile = payload.new as Profile;
            setProfile(newProfile);
            const { level, badge } = calculateLevelAndBadge(newProfile.xp);
            setUserLevel(level);
            setUserBadge(badge);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    userLevel,
    userBadge,
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