import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Face Enrollment Edge Function - Pure Pass-Through Proxy
 * 
 * This function forwards enrollment requests to the Django backend.
 * NO Supabase database writes - Django is the single source of truth for:
 * - Face embeddings
 * - Enrollment status
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

    console.log('Face Enroll - Django API URL:', DJANGO_API_URL);

    const body = await req.json();
    const { image, user_id, user_name } = body;
    
    if (!image) {
      throw new Error('Image data is required');
    }

    if (!user_id) {
      throw new Error('User ID is required');
    }

    console.log(`Forwarding face enrollment for user: ${user_id}`);

    // Forward enrollment to Django API
    let response;
    try {
      response = await fetch(`${DJANGO_API_URL}/api/recognize-frame/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          frame: image,
          mode: 'ENROLL',
          user_id: user_id,
          name: user_name || 'User',
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
      console.error('Failed to parse Django response as JSON');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid response from enrollment API',
        raw_response: responseText,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate face error
    if (!response.ok) {
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

    // Return successful enrollment response from Django
    // NO local database updates - Django is source of truth
    console.log('Face enrollment successful via Django');

    return new Response(JSON.stringify({
      success: true,
      user_id: user_id,
      embedding_saved: data.embedding_saved || data.status === 'success' || true,
      message: data.message || 'Face enrolled successfully',
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Face enroll edge function error:', error);
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
