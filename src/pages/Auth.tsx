import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { djangoApi } from '@/lib/api/client';
import { useDjangoAuth } from '@/contexts/DjangoAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Scan, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user, refreshUser } = useDjangoAuth();

  // Redirect if already authenticated via Django
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.organization_id) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Also check Supabase session for existing users (Phase 1 bridge)
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !isAuthenticated) {
        // Existing Supabase user - sync to Django
        await syncSupabaseUserToDjango(session.user);
      }
    };
    
    checkExistingSession();
  }, [isAuthenticated]);

  const syncSupabaseUserToDjango = async (supabaseUser: any) => {
    try {
      const { data, error } = await djangoApi.syncFromSupabase({
        supabase_uid: supabaseUser.id,
        email: supabaseUser.email || '',
        first_name: supabaseUser.user_metadata?.first_name || '',
        last_name: supabaseUser.user_metadata?.last_name || '',
      });

      if (data && !error) {
        await refreshUser();
        if (data.user?.organization_id) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err) {
      console.error('Failed to sync Supabase user to Django:', err);
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (isLogin) {
        // Phase 1: Try Django login first
        const djangoResult = await djangoApi.login(email, password);
        
        if (!djangoResult.error && djangoResult.data?.user) {
          // Django login successful
          await refreshUser();
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
          
          if (djangoResult.data.user.organization_id) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
          return;
        }

        // Fallback: Try Supabase login for existing users
        const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (supabaseError) {
          toast({
            title: 'Login failed',
            description: supabaseError.message.includes('Invalid login credentials')
              ? 'Invalid email or password. Please try again.'
              : supabaseError.message,
            variant: 'destructive',
          });
          return;
        }

        // Supabase login successful - sync to Django
        if (supabaseData.user) {
          await syncSupabaseUserToDjango(supabaseData.user);
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
        }
      } else {
        // NEW SIGNUPS: Go directly to Django (Phase 1)
        const djangoResult = await djangoApi.register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });

        if (djangoResult.error) {
          toast({
            title: 'Sign up failed',
            description: djangoResult.error,
            variant: 'destructive',
          });
          return;
        }

        // Auto-login after registration
        const loginResult = await djangoApi.login(email, password);
        if (loginResult.data?.user) {
          await refreshUser();
          toast({
            title: 'Account created!',
            description: 'Welcome to the Smart Attendance System.',
          });
          navigate('/onboarding');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Scan className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Mispar Technologies</span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isLogin 
                ? 'Sign in to access the attendance system' 
                : 'Register to get started with face recognition'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                required
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  required
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading 
                ? (isLogin ? 'Signing in...' : 'Creating account...') 
                : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
