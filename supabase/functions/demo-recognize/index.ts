import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Demo Face Recognition Edge Function
 * Public endpoint (no auth) for demo users to enroll/recognize faces.
 * Proxies to Django demo endpoints.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DJANGO_API_URL = Deno.env.get('DJANGO_API_URL');
    if (!DJANGO_API_URL) {
      throw new Error('DJANGO_API_URL is not configured');
    }

    const body = await req.json();
    const { action, image, demo_id } = body;

    if (!demo_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'demo_id is required',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!image) {
      return new Response(JSON.stringify({
        success: false,
        error: 'image is required',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Demo action: ${action}, demo_id: ${demo_id}`);

    if (action === 'enroll') {
      let response;
      try {
        response = await fetch(`${DJANGO_API_URL}/api/demo/enroll/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, demo_id }),
        });
      } catch (fetchError) {
        console.error('Demo enroll connection error:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseText = await response.text();
      console.log('Demo enroll response:', response.status, responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid response from demo enroll API',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: data.message || data.error || 'Demo enrollment failed',
          code: data.code || 'ERROR',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: data.message || 'Face enrolled for demo',
        demo_id,
        ...data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'recognize') {
      let response;
      try {
        response = await fetch(`${DJANGO_API_URL}/api/demo/recognize/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: image, demo_id }),
        });
      } catch (fetchError) {
        console.error('Demo recognize connection error:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseText = await response.text();
      console.log('Demo recognize response:', response.status, responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid response from demo recognize API',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: data.message || data.error || 'Demo recognition failed',
          code: data.code || 'ERROR',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        ...data,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Supported: enroll, recognize`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: unknown) {
    console.error('Demo edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
