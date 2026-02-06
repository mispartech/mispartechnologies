import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Face Recognition Edge Function - Pure Pass-Through Proxy
 * 
 * This function forwards all requests to the Django backend and returns responses as-is.
 * NO Supabase database writes - Django is the single source of truth for:
 * - Face embeddings
 * - Attendance records
 * - Temporary user tracking
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DJANGO_API_URL = Deno.env.get('DJANGO_API_URL');

    if (!DJANGO_API_URL) {
      console.error('DJANGO_API_URL is not configured');
      throw new Error('Django API URL is not configured');
    }

    console.log('Django API URL:', DJANGO_API_URL);

    const body = await req.json();
    const { action, image, frame, user_data, organization_id, mode } = body;
    
    // Support both 'image' and 'frame' keys for the image data
    const imageData = image || frame;

    // Extract Django JWT from request headers for forwarding
    const authHeader = req.headers.get('Authorization');
    
    console.log(`Processing action: ${action}, mode: ${mode || 'RECOGNIZE'}, has_auth: ${!!authHeader}`);

    if (action === 'recognize') {
      // Forward recognition request to Django - NO local processing
      console.log('Forwarding to Django recognize-frame API...');
      
      let response;
      try {
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authHeader) {
          requestHeaders['Authorization'] = authHeader;
        }

        response = await fetch(`${DJANGO_API_URL}/api/recognize-frame/`, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify({ 
            frame: imageData,
            mode: mode || 'RECOGNIZE',
            user_id: user_data?.user_id || null,
          }),
        });
        console.log('Django API response status:', response.status);
      } catch (fetchError) {
        console.error('Connection error:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse Django response
      const responseText = await response.text();
      console.log('Django raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse Django response as JSON');
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid response from Django API',
          raw_response: responseText,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!response.ok) {
        console.error('Django API error:', response.status, data);
        return new Response(JSON.stringify({
          success: false,
          error: `Django API error: ${response.status}`,
          code: data.code || 'ERROR',
          message: data.message || data.error || 'Recognition failed',
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Pass through Django response directly - frontend will interpret
      // Expected Django response format:
      // KNOWN user: { type: "KNOWN", user_id, confidence, attendance_marked, name, bbox }
      // TEMP user: { type: "TEMP", temp_user_id, requires_claim, bbox }
      // Or legacy format with faces array
      
      console.log('Forwarding Django response to frontend');
      
      // Normalize response for frontend consumption
      const normalizedResponse = {
        success: true,
        code: data.code || data.status || 'OK',
        type: data.type || null,
        // Pass through all Django fields
        user_id: data.user_id || null,
        temp_user_id: data.temp_user_id || null,
        confidence: data.confidence || null,
        attendance_marked: data.attendance_marked || false,
        requires_claim: data.requires_claim || false,
        name: data.name || null,
        bbox: data.bbox || null,
        // Support legacy faces array format
        faces: data.data?.faces || data.faces || [],
        faces_count: (data.data?.faces || data.faces || []).length,
        message: data.message || null,
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(normalizedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'register' || action === 'enroll') {
      // Forward enrollment request to Django - NO local DB writes
      console.log('Forwarding to Django for face enrollment...');
      
      if (!user_data?.user_id) {
        throw new Error('user_id is required for enrollment');
      }

      let response;
      try {
        const enrollHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authHeader) {
          enrollHeaders['Authorization'] = authHeader;
        }

        response = await fetch(`${DJANGO_API_URL}/api/recognize-frame/`, {
          method: 'POST',
          headers: enrollHeaders,
          body: JSON.stringify({
            frame: imageData,
            mode: 'ENROLL',
            user_id: user_data.user_id,
            name: user_data.name || 'User',
          }),
        });
        console.log('Django enrollment API response status:', response.status);
      } catch (fetchError) {
        console.error('Connection error during enrollment:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseText = await response.text();
      console.log('Django enrollment raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse Django enrollment response');
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid response from enrollment API',
          raw_response: responseText,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for duplicate face error from Django
      if (!response.ok || data.code === 'DUPLICATE_FACE') {
        const isDuplicate = 
          data.code === 'DUPLICATE_FACE' || 
          data.error?.toLowerCase().includes('duplicate') ||
          data.message?.toLowerCase().includes('duplicate') ||
          data.message?.toLowerCase().includes('already enrolled');

        if (isDuplicate) {
          return new Response(JSON.stringify({
            success: false,
            error: 'duplicate_face',
            code: 'DUPLICATE_FACE',
            message: data.message || 'This face appears to be already enrolled for another user.',
            timestamp: new Date().toISOString(),
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: false,
          error: `Enrollment failed: ${response.status}`,
          code: data.code || 'ERROR',
          message: data.message || data.error || 'Face enrollment failed',
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Pass through successful enrollment response
      // Frontend expects: { success: true, embedding_saved: true }
      return new Response(JSON.stringify({
        success: true,
        user_id: user_data.user_id,
        embedding_saved: data.embedding_saved || data.status === 'success' || true,
        message: data.message || 'Face enrolled successfully',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'health') {
      // Health check endpoint
      console.log('Performing health check...');
      try {
        const healthResponse = await fetch(`${DJANGO_API_URL}/api/health/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        let healthData = {};
        try {
          healthData = await healthResponse.json();
        } catch {
          // Health endpoint might not return JSON
        }
        
        return new Response(JSON.stringify({
          success: true,
          django_api: healthResponse.ok ? 'connected' : 'error',
          django_status: healthData,
          edge_function: 'healthy',
          api_url: DJANGO_API_URL,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (healthError) {
        console.error('Health check error:', healthError);
        return new Response(JSON.stringify({
          success: false,
          django_api: 'unreachable',
          edge_function: 'healthy',
          error: healthError instanceof Error ? healthError.message : 'Connection failed',
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } else {
      throw new Error(`Unknown action: ${action}. Supported actions: recognize, register, enroll, health`);
    }

  } catch (error: unknown) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
