// Test script to insert sample data and verify database access
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjqsbaylowccmppthemu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcXNiYXlsb3djY21wcHRoZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjMyOTAsImV4cCI6MjA2MzU5OTI5MH0.d8iHa9As8k8JadntW2LWf4fc69FkkKGRwNiVtZCvpf4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseAccess() {
  console.log('🧪 Testing database access...');
  
  try {
    // Test 1: Check if we can read from properties table
    console.log('\n📊 Testing properties table access...');
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .limit(5);
    
    if (propError) {
      console.error('❌ Properties error:', propError);
    } else {
      console.log('✅ Properties accessible:', properties?.length || 0, 'records');
      console.log('Sample property:', properties?.[0]);
    }
    
    // Test 2: Check settings table
    console.log('\n⚙️ Testing settings table access...');
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*');
    
    if (settingsError) {
      console.error('❌ Settings error:', settingsError);
    } else {
      console.log('✅ Settings accessible:', settings?.length || 0, 'records');
      console.log('Settings:', settings);
    }
    
    // Test 3: Try to insert test data if tables are empty
    if (!properties || properties.length === 0) {
      console.log('\n🏠 No properties found, attempting to insert test data...');
      
      const testProperty = {
        title: 'Beautiful Downtown Apartment',
        description: 'A stunning apartment in the heart of the city with modern amenities and great views.',
        price: 350000,
        location: 'Downtown, City Center',
        images: [
          'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg',
          'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'
        ],
        bedrooms: 2,
        bathrooms: 2,
        size: 1200,
        amenities: ['Air Conditioning', 'Balcony', 'Parking', 'Gym Access'],
        type: 'apartment',
        year_built: 2020,
        show_on_homepage: true,
        assignment_status: 'published'
      };
      
      const { data: insertedProperty, error: insertError } = await supabase
        .from('properties')
        .insert(testProperty)
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Insert error:', insertError);
        console.log('💡 This might be due to RLS policies blocking inserts');
      } else {
        console.log('✅ Test property inserted:', insertedProperty);
      }
    }
    
    // Test 4: Check if settings exist, if not try to insert
    if (!settings || settings.length === 0) {
      console.log('\n⚙️ No settings found, attempting to insert default settings...');
      
      const defaultSettings = [
        {
          key: 'site_info',
          value: {
            title: 'HomeVista',
            description: 'Find your dream home with our AI-powered apartment marketplace.'
          }
        },
        {
          key: 'homepage_background',
          value: {
            image_url: 'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg'
          }
        }
      ];
      
      for (const setting of defaultSettings) {
        const { data: insertedSetting, error: settingError } = await supabase
          .from('settings')
          .insert(setting)
          .select()
          .single();
        
        if (settingError) {
          console.error('❌ Setting insert error:', settingError);
        } else {
          console.log('✅ Setting inserted:', insertedSetting.key);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testDatabaseAccess();