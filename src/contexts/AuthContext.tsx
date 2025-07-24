import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName?: string) => Promise<any>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        console.log('🔍 Checking authentication session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) {
          console.log('⚠️ Component unmounted during session check');
          return;
        }
        
        if (error) {
          console.error('❌ Session check error:', error);
          setUser(null);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Session found, loading user profile for:', session.user.email);
          await loadUserProfile(session.user);
        } else {
          console.log('ℹ️ No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('💥 Critical error checking session:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
      
      try {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('💥 Error in auth state change:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const ensureUserExists = async (authUser: any): Promise<void> => {
    try {
      console.log('🔧 Ensuring user exists in database for:', authUser.email);
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // User doesn't exist, create them
        console.log('👤 User not found in database, creating new record...');
        
        const metadata = authUser.user_metadata || {};
        const newUserData = {
          id: authUser.id,
          email: authUser.email,
          first_name: metadata?.firstName || metadata?.first_name || '',
          last_name: metadata?.lastName || metadata?.last_name || '',
          username: metadata?.username || metadata?.firstName || metadata?.first_name || authUser.email?.split('@')[0] || '',
          profile_picture_url: metadata?.profile_picture_url || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 Creating user with data:', { ...newUserData, id: '[REDACTED]' });

        const { error: insertError } = await supabase
          .from('users')
          .insert(newUserData);

        if (insertError) {
          console.error('❌ Error creating user in users table:', insertError);
          // Don't throw - this is non-critical
        } else {
          console.log('✅ User created successfully in database');
        }
      } else if (checkError) {
        console.error('❌ Error checking user existence:', checkError);
        // Don't throw - this is non-critical
      } else {
        console.log('✅ User already exists in database');
      }
    } catch (error) {
      console.error('💥 Error ensuring user exists:', error);
      // Don't throw - this is non-critical for auth flow
    }
  };

  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('📊 Loading user profile for:', authUser.email);
      
      // Always ensure user exists in database (non-blocking)
      await ensureUserExists(authUser);
      
      // Try to load the complete profile, but don't fail if it doesn't work
      let userProfile = null;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!error && data) {
          userProfile = data;
          console.log('✅ User profile loaded from database');
        } else {
          console.warn('⚠️ Could not load user profile from database:', error?.message);
        }
      } catch (profileError) {
        console.warn('⚠️ Error loading user profile from database:', profileError);
      }

      // Always create a user object, using database data if available, fallback to auth metadata
      const metadata = authUser.user_metadata || {};
      
      const userData: User = {
        id: authUser.id,
        email: authUser.email!,
        role: metadata?.role === 'admin' ? 'admin' : 'user',
        firstName: userProfile?.first_name || metadata?.firstName || metadata?.first_name || '',
        lastName: userProfile?.last_name || metadata?.lastName || metadata?.last_name || '',
        profilePictureUrl: userProfile?.profile_picture_url || metadata?.profile_picture_url || ''
      };

      console.log('✅ User profile loaded successfully:', { 
        email: userData.email, 
        role: userData.role,
        hasFirstName: !!userData.firstName,
        hasProfilePicture: !!userData.profilePictureUrl
      });

      setUser(userData);
    } catch (error) {
      console.error('💥 Error loading user profile:', error);
      
      // Create comprehensive fallback user object - NEVER fail here
      const metadata = authUser.user_metadata || {};
      const fallbackUser: User = {
        id: authUser.id,
        email: authUser.email!,
        role: metadata?.role === 'admin' ? 'admin' : 'user',
        firstName: metadata?.firstName || metadata?.first_name || '',
        lastName: metadata?.lastName || metadata?.last_name || '',
        profilePictureUrl: metadata?.profile_picture_url || ''
      };
      
      console.log('⚠️ Using fallback user data:', { 
        email: fallbackUser.email, 
        role: fallbackUser.role 
      });
      
      setUser(fallbackUser);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ Login successful, loading profile...');
        await loadUserProfile(data.user);
      }
    } catch (error) {
      console.error('💥 Login failed:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName?: string) => {
    try {
      console.log('📝 Attempting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: firstName,
            lastName: lastName || '',
            role: 'user'
          },
          emailRedirectTo: undefined
        }
      });

      if (error) {
        console.error('❌ Signup error:', error);
        throw error;
      }

      console.log('✅ Signup successful');

      // Handle different signup scenarios
      if (data.user && data.session) {
        console.log('🎉 User signed up and session created, loading profile...');
        await loadUserProfile(data.user);
      } else if (data.user && !data.session) {
        console.log('📧 User created but no session (email confirmation may be required)');
        try {
          console.log('🔄 Attempting auto-login...');
          await login(email, password);
        } catch (loginError) {
          console.error('❌ Auto-login after signup failed:', loginError);
          throw new Error('Account created but automatic login failed. Please try logging in manually.');
        }
      }

      return data;
    } catch (error) {
      console.error('💥 Signup failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Signing out user...');
      
      await supabase.auth.signOut();
      setUser(null);
      
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('💥 Sign out error:', error);
      // Still clear user state even if signOut fails
      setUser(null);
      throw error;
    }
  };

  const logout = signOut;

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, signOut, signup, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};