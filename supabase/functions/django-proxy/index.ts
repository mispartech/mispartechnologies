import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Django API Proxy Edge Function
 * 
 * This function forwards requests to the Django backend and handles CORS.
 * Used for endpoints that need to be called directly from the browser.
 * 
 * Supported actions:
 * - check-enrollment-status: Check if user has completed face enrollment
 * - get-user: Get current user info
 * - Other Django API calls
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const DJANGO_API_URL = Deno.env.get('DJANGO_API_URL');

    if (!DJANGO_API_URL) {
      console.error('DJANGO_API_URL is not configured');
      return new Response(JSON.stringify({
        error: 'Django API URL is not configured',
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, user_id, endpoint, method = 'GET', payload } = body;

    console.log(`[django-proxy] Action: ${action}, User ID: ${user_id}, Endpoint: ${endpoint}`);

    let djangoUrl: string;
    let requestMethod = method;
    let requestBody: string | undefined;

    // Route based on action
    if (action === 'check-enrollment-status') {
      if (!user_id) {
        return new Response(JSON.stringify({
          error: 'user_id is required',
          timestamp: new Date().toISOString(),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      djangoUrl = `${DJANGO_API_URL}/api/face/enrollment-status/${user_id}/`;
      requestMethod = 'GET';
      
    } else if (action === 'get-current-user') {
      djangoUrl = `${DJANGO_API_URL}/api/auth/me/`;
      requestMethod = 'GET';
      
    } else if (endpoint) {
      // Generic proxy for any endpoint
      djangoUrl = `${DJANGO_API_URL}${endpoint}`;
      requestMethod = method;
      if (payload) {
        requestBody = JSON.stringify(payload);
      }
      
    } else {
      return new Response(JSON.stringify({
        error: `Unknown action: ${action}. Provide 'action' or 'endpoint'.`,
        timestamp: new Date().toISOString(),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[django-proxy] Calling Django: ${requestMethod} ${djangoUrl}`);

    // Forward authorization header if present
    const authHeader = req.headers.get('Authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    let response;
    try {
      response = await fetch(djangoUrl, {
        method: requestMethod,
        headers,
        body: requestBody,
      });
      console.log(`[django-proxy] Django response status: ${response.status}`);
    } catch (fetchError) {
      console.error('[django-proxy] Connection error:', fetchError);
      return new Response(JSON.stringify({
        error: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse response
    const responseText = await response.text();
    console.log(`[django-proxy] Django raw response: ${responseText.substring(0, 500)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Return raw text if not JSON
      return new Response(responseText, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Return Django response with CORS headers
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[django-proxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
