import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DJANGO_API_URL = Deno.env.get('DJANGO_API_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    console.log(`Processing face enrollment for user: ${user_id}`);

    // Initialize Supabase client with service role for database operations
    const supabase = createClient(
      SUPABASE_URL!, 
      SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY!
    );

    // Call Django API for face enrollment
    console.log('Calling Django face enrollment API...');
    
    let response;
    try {
      response = await fetch(`${DJANGO_API_URL}/api/face/enroll/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          frame: image,
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
          message: data.message || 'This face appears to be already enrolled for another user.',
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: `Enrollment failed: ${response.status}`,
        message: data.message || data.error || 'Face enrollment failed',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Successfully enrolled - update database
    console.log('Face enrollment successful, updating database...');

    // Upsert face_embeddings record to mark user as enrolled
    const { error: embedError } = await supabase
      .from('face_embeddings')
      .upsert({
        user_id: user_id,
        embedding: { enrolled: true, enrolled_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (embedError) {
      console.error('Error updating face_embeddings:', embedError);
      // Don't fail the request, enrollment was successful on Django side
    } else {
      console.log('Face embeddings record created/updated for user:', user_id);
    }

    // Update profile to mark enrollment complete
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user_id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: data.message || 'Face enrolled successfully',
      user_id: user_id,
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
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
