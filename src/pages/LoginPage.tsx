import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Team-Idiots</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            view="sign_in"
            showLinks={false}
            redirectTo={`${window.location.origin}/dashboard`}
          />
           <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/" className="underline hover:text-primary">
              Return to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;