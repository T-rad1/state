import { supabase } from './supabaseClient';

/**
 * Test storage functionality for debugging upload issues
 */
export const testStorageSetup = async () => {
  console.log('🧪 Testing Supabase Storage Setup...');
  
  try {
    // Test 1: Check if we can list buckets
    console.log('📦 Testing bucket access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Cannot list buckets:', bucketsError);
      return false;
    }
    
    console.log('✅ Available buckets:', buckets?.map(b => b.name) || []);
    
    // Test 2: Check property-images bucket specifically
    const propertyImagesBucket = buckets?.find(b => b.name === 'property-images');
    if (!propertyImagesBucket) {
      console.error('❌ property-images bucket not found');
      return false;
    }
    
    console.log('✅ property-images bucket found:', propertyImagesBucket);
    
    // Test 3: Try to list files in the bucket
    console.log('📁 Testing file listing...');
    const { data: files, error: listError } = await supabase.storage
      .from('property-images')
      .list('documents', { limit: 1 });
      
    if (listError) {
      console.error('❌ Cannot list files in documents folder:', listError);
      // This might be OK if the folder doesn't exist yet
      console.log('ℹ️ This might be normal if no documents have been uploaded yet');
    } else {
      console.log('✅ Can list files in documents folder:', files?.length || 0, 'files found');
    }
    
    // Test 4: Create a small test file
    console.log('📄 Testing file upload...');
    const testContent = new Blob(['Test PDF content'], { type: 'application/pdf' });
    const testFileName = `test-${Date.now()}.pdf`;
    const testPath = `documents/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(testPath, testContent, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      return false;
    }
    
    console.log('✅ Test upload successful:', uploadData);
    
    // Test 5: Get public URL
    console.log('🔗 Testing public URL generation...');
    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(testPath);
      
    console.log('✅ Public URL generated:', publicUrl);
    
    // Test 6: Test URL accessibility
    console.log('🌐 Testing URL accessibility...');
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log('✅ File is accessible via public URL');
      } else {
        console.error('❌ File not accessible:', response.status, response.statusText);
      }
    } catch (fetchError) {
      console.error('❌ Cannot access public URL:', fetchError);
    }
    
    // Test 7: Clean up test file
    console.log('🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('property-images')
      .remove([testPath]);
      
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up successfully');
    }
    
    // Test 8: Test settings table
    console.log('⚙️ Testing settings table...');
    const testSetting = {
      pdf_url: publicUrl,
      filename: 'test.pdf',
      uploaded_at: new Date().toISOString()
    };
    
    const { data: settingData, error: settingError } = await supabase
      .from('settings')
      .upsert(
        { 
          key: 'storage_test', 
          value: testSetting,
          updated_at: new Date().toISOString() 
        }, 
        { 
          onConflict: 'key',
          ignoreDuplicates: false
        }
      )
      .select();
      
    if (settingError) {
      console.error('❌ Settings table test failed:', settingError);
      return false;
    }
    
    console.log('✅ Settings table test successful:', settingData);
    
    // Clean up test setting
    await supabase.from('settings').delete().eq('key', 'storage_test');
    
    console.log('🎉 All storage tests passed!');
    return true;
    
  } catch (error) {
    console.error('💥 Storage test failed:', error);
    return false;
  }
};

/**
 * Run storage diagnostics
 */
export const runStorageDiagnostics = async () => {
  console.log('🔍 Running Storage Diagnostics...');
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('❌ Authentication error:', authError);
    return;
  }
  
  if (!user) {
    console.error('❌ No authenticated user found');
    return;
  }
  
  console.log('✅ User authenticated:', user.email);
  
  // Run the full test suite
  const testResult = await testStorageSetup();
  
  if (testResult) {
    console.log('✅ Storage is properly configured');
  } else {
    console.log('❌ Storage configuration issues detected');
  }
};