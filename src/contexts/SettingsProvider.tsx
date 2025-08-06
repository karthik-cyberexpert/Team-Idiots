import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { showSuccess, showError } from '@/utils/toast';

interface AppSettings {
  maintenanceMode: boolean;
}

interface SettingsContextType extends AppSettings {
  loading: boolean;
  toggleMaintenanceMode: (enabled: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'maintenance_mode')
        .single();

      if (error) throw error;

      if (data) {
        setMaintenanceMode(data.value.enabled);
      }
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      // Default to false if settings can't be fetched
      setMaintenanceMode(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('app-settings-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.maintenance_mode' },
        (payload) => {
          setMaintenanceMode(payload.new.value.enabled);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const toggleMaintenanceMode = async (enabled: boolean) => {
    if (profile?.role !== 'admin') {
      showError("You are not authorized to perform this action.");
      return;
    }
    try {
      const { error, data } = await supabase.functions.invoke("toggle-maintenance-mode", {
        body: { enabled },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      showSuccess(data.message);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const value = {
    maintenanceMode,
    loading,
    toggleMaintenanceMode,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};