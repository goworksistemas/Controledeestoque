// CRITICAL: This script MUST execute BEFORE React hydrates
// It captures Supabase auth tokens from the URL (both hash and query params)

(function captureSupabaseAuth() {
  // Only run on reset-password page
  if (!window.location.pathname.includes('reset-password')) {
    return;
  }

  console.log('🔍 [EARLY CAPTURE] Full URL:', window.location.href);
  console.log('🔍 [EARLY CAPTURE] Hash:', window.location.hash);
  console.log('🔍 [EARLY CAPTURE] Search (query params):', window.location.search);

  const hash = window.location.hash;
  const search = window.location.search;
  
  // Check for Supabase error in URL
  const params = new URLSearchParams(search || hash.substring(1));
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const errorCode = params.get('error_code');
  
  if (error || errorDescription) {
    console.error('❌ [EARLY CAPTURE] Supabase returned an error!');
    console.error('❌ [EARLY CAPTURE] Error:', error);
    console.error('❌ [EARLY CAPTURE] Description:', errorDescription);
    console.error('❌ [EARLY CAPTURE] Code:', errorCode);
    sessionStorage.setItem('supabase_auth_error', JSON.stringify({
      error,
      errorDescription,
      errorCode
    }));
    return;
  }
  
  // Check hash fragment first (#access_token=...)
  if (hash && hash.length > 1) {
    console.log('🔒 [EARLY CAPTURE] Auth hash detected BEFORE React:', hash.substring(0, 50) + '...');
    
    try {
      // Save to sessionStorage immediately
      sessionStorage.setItem('supabase_auth_hash', hash);
      sessionStorage.setItem('supabase_auth_hash_timestamp', Date.now().toString());
      console.log('✅ [EARLY CAPTURE] Hash saved to sessionStorage');
    } catch (error) {
      console.error('❌ [EARLY CAPTURE] Failed to save hash:', error);
    }
    return; // Found hash, we're done
  }
  
  // Check query parameters (PKCE flow: ?token=...&type=recovery)
  if (search && search.length > 1) {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const code = params.get('code'); // PKCE authorization code
    
    console.log('🔍 [EARLY CAPTURE] Query params detected:', {
      hasToken: !!token,
      hasAccessToken: !!accessToken,
      hasCode: !!code,
      type
    });
    
    if (token || accessToken || code) {
      console.log('🔒 [EARLY CAPTURE] Auth query params detected BEFORE React');
      
      try {
        // Save to sessionStorage immediately
        sessionStorage.setItem('supabase_auth_query', search);
        sessionStorage.setItem('supabase_auth_query_timestamp', Date.now().toString());
        console.log('✅ [EARLY CAPTURE] Query params saved to sessionStorage');
      } catch (error) {
        console.error('❌ [EARLY CAPTURE] Failed to save query params:', error);
      }
      return; // Found query params, we're done
    }
  }
  
  console.log('⚠️ [EARLY CAPTURE] No auth tokens detected on reset-password page');
  console.log('⚠️ [EARLY CAPTURE] This means the Supabase redirect did NOT include tokens');
  console.log('⚠️ [EARLY CAPTURE] Possible causes:');
  console.log('   1. URL not whitelisted in Supabase dashboard');
  console.log('   2. Token already expired (>1 hour)');
  console.log('   3. Link already used');
  console.log('   4. Email provider modified the URL');
})();