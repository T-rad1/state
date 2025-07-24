import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🚀 Initializing Supabase client...');
console.log('📍 URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '[MISSING]');
console.log('🔑 Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '[MISSING]');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
  console.log('✅ Supabase URL format is valid');
} catch (error) {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Simple connection test
const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('properties')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection test failed:', error);
    } else {
      console.log('✅ Supabase connection successful');
    }
    
    // Test a simple query
    const { data: testData, error: testError } = await supabase
      .from('properties')
      .select('id, title')
      .limit(1);
    
    if (testError) {
      console.error('❌ Query test failed:', testError);
    } else {
      console.log('✅ Query test successful, found:', testData?.length || 0, 'properties');
    }

    // Test storage access
    console.log('🗄️ Testing storage access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Storage buckets test failed:', bucketsError);
    } else {
      console.log('✅ Storage accessible, buckets:', buckets?.map(b => b.name) || []);
      
      // Test property-images bucket specifically
      const { data: files, error: filesError } = await supabase.storage
        .from('property-images')
        .list('', { limit: 1 });
        
      if (filesError) {
        console.error('❌ Property-images bucket test failed:', filesError);
      } else {
        console.log('✅ Property-images bucket accessible');
      }
    }
    
  } catch (error) {
    console.error('💥 Connection test error:', error);
  }
};

// Run test
testConnection();