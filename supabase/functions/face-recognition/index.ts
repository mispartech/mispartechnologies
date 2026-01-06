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

    if (!DJANGO_API_URL) {
      console.error('DJANGO_API_URL is not configured');
      throw new Error('Django API URL is not configured');
    }

    const { action, image, user_data } = await req.json();
    console.log(`Processing action: ${action}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    if (action === 'recognize') {
      // Call Django API for face recognition
      console.log('Calling Django recognize API...');
      const response = await fetch(`${DJANGO_API_URL}/api/recognize/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Django API error:', errorText);
        throw new Error(`Django API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Recognition result:', JSON.stringify(data));

      // Process recognized faces and record attendance
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];

      for (const face of data.faces || []) {
        if (face.recognized && face.name !== 'unregistered') {
          // Check if attendance already recorded today
          const { data: existingAttendance } = await supabase
            .from('attendance')
            .select('id, face_detections')
            .eq('date', today)
            .single();

          if (existingAttendance) {
            // Update face detection count
            await supabase
              .from('attendance')
              .update({ face_detections: existingAttendance.face_detections + 1 })
              .eq('id', existingAttendance.id);
          }
          // Note: For new attendance records, you'd need the user_id mapping
        } else {
          // Record as temp attendance for unrecognized visitor
          const tempFaceId = `visitor_${Date.now()}`;
          const { data: existingTemp } = await supabase
            .from('temp_attendance')
            .select('id, face_detections')
            .eq('temp_face_id', tempFaceId)
            .eq('date', today)
            .single();

          if (!existingTemp) {
            await supabase
              .from('temp_attendance')
              .insert({
                temp_face_id: tempFaceId,
                date: today,
                time: currentTime,
                face_detections: 1,
              });
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        faces: data.faces,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'register') {
      // Call Django API to register a new face
      console.log('Calling Django register-face API...');
      const response = await fetch(`${DJANGO_API_URL}/api/register-face/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
          user_id: user_data?.user_id,
          name: user_data?.name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Django register API error:', errorText);
        throw new Error(`Django API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Registration result:', JSON.stringify(data));

      return new Response(JSON.stringify({
        success: true,
        ...data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
