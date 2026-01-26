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

    console.log('Django API URL:', DJANGO_API_URL);

    const body = await req.json();
    const { action, image, frame, user_data, organization_id } = body;
    
    // Support both 'image' and 'frame' keys for the image data
    const imageData = image || frame;
    
    console.log(`Processing action: ${action}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    if (action === 'recognize') {
      // Call Django API for face recognition
      console.log('Calling Django recognize-frame API...');
      
      // The Django API only expects `frame` - do NOT send organization_id as Django doesn't use it
      // Organization filtering happens on the Supabase side after recognition
      const response = await fetch(`${DJANGO_API_URL}/api/recognize-frame/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          frame: imageData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Django API error:', response.status, errorText);
        // Return 200 so the client receives a structured payload (Supabase SDK treats non-2xx as invoke error)
        return new Response(JSON.stringify({
          success: false,
          error: `Django API error: ${response.status}`,
          django_status: errorText,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      console.log('Recognition result:', JSON.stringify(data));

      // Process recognized faces and record attendance
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];
      const processedFaces = [];

      for (const face of data.faces || []) {
        const faceResult: any = {
          name: face.name || 'Unknown',
          recognized: face.recognized || false,
          confidence: face.confidence || face.distance ? (1 - (face.distance || 0)) : null,
          bbox: face.bbox || [],
        };

        if (face.recognized && face.user_id) {
          // Recognized member - record attendance
          faceResult.user_id = face.user_id;
          faceResult.type = 'member';

          // Check if attendance already recorded today for this user
          const { data: existingAttendance, error: checkError } = await supabase
            .from('attendance')
            .select('id, face_detections')
            .eq('user_id', face.user_id)
            .eq('date', today)
            .maybeSingle();

          if (checkError) {
            console.error('Error checking attendance:', checkError);
          }

          if (existingAttendance) {
            // Update face detection count
            await supabase
              .from('attendance')
              .update({ 
                face_detections: (existingAttendance.face_detections || 1) + 1,
                confidence_score: faceResult.confidence,
              })
              .eq('id', existingAttendance.id);
            
            faceResult.attendance_status = 'already_marked';
          } else {
            // Create new attendance record
            const { error: insertError } = await supabase
              .from('attendance')
              .insert({
                user_id: face.user_id,
                date: today,
                time: currentTime,
                face_detections: 1,
                confidence_score: faceResult.confidence,
                face_roi_url: face.face_roi_url || null,
              });

            if (insertError) {
              console.error('Error inserting attendance:', insertError);
              faceResult.attendance_status = 'error';
            } else {
              faceResult.attendance_status = 'marked';
              
              // Create notification for the user
              try {
                // Check if user has attendance alerts enabled
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('notification_preferences, first_name')
                  .eq('id', face.user_id)
                  .single();
                
                const prefs = profile?.notification_preferences as { attendance_alerts?: boolean } | null;
                
                if (prefs?.attendance_alerts !== false) {
                  await supabase
                    .from('notifications')
                    .insert({
                      user_id: face.user_id,
                      title: 'Attendance Marked ✓',
                      message: `Your attendance has been recorded at ${currentTime.slice(0, 5)}`,
                      type: 'attendance',
                      metadata: { date: today, time: currentTime },
                    });
                  console.log('Notification created for user:', face.user_id);
                }
              } catch (notifError) {
                console.error('Failed to create notification:', notifError);
                // Don't fail the attendance marking if notification fails
              }
            }
          }
        } else {
          // Unrecognized face - record as temp attendance
          const tempFaceId = face.temp_face_id || `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          faceResult.temp_face_id = tempFaceId;
          faceResult.type = 'visitor';

          // Check if this temp face already exists today
          const { data: existingTemp } = await supabase
            .from('temp_attendance')
            .select('id, face_detections')
            .eq('temp_face_id', tempFaceId)
            .eq('date', today)
            .maybeSingle();

          if (existingTemp) {
            await supabase
              .from('temp_attendance')
              .update({ face_detections: (existingTemp.face_detections || 1) + 1 })
              .eq('id', existingTemp.id);
            
            faceResult.attendance_status = 'updated';
          } else {
            await supabase
              .from('temp_attendance')
              .insert({
                temp_face_id: tempFaceId,
                date: today,
                time: currentTime,
                face_detections: 1,
                face_roi_url: face.face_roi_url || null,
              });
            
            faceResult.attendance_status = 'recorded';
          }
        }

        processedFaces.push(faceResult);
      }

      return new Response(JSON.stringify({
        success: true,
        faces: processedFaces,
        faces_count: processedFaces.length,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'register') {
      // Call Django API to register a new face
      console.log('Calling Django attendance/mark API for registration...');
      
      if (!user_data?.user_id || !user_data?.name) {
        throw new Error('user_data with user_id and name is required for registration');
      }

      const response = await fetch(`${DJANGO_API_URL}/api/attendance/mark/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // The Django API expects `frame` (not `image`). We also include `image` for backwards compatibility.
          frame: imageData,
          image: imageData,
          user_id: user_data.user_id,
          name: user_data.name,
          action: 'register',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Django register API error:', response.status, errorText);
        // Return 200 so the client receives a structured payload (Supabase SDK treats non-2xx as invoke error)
        return new Response(JSON.stringify({
          success: false,
          error: `Django API error: ${response.status}`,
          django_status: errorText,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      console.log('Registration result:', JSON.stringify(data));

      // Update user profile with face registration status
      if (data.success) {
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', user_data.user_id);
      }

      return new Response(JSON.stringify({
        success: true,
        user_id: user_data.user_id,
        message: data.message || 'Face registered successfully',
        embedding_size: data.embedding_size,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'health') {
      // Health check endpoint
      try {
        const healthResponse = await fetch(`${DJANGO_API_URL}/api/health/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const healthData = await healthResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          django_api: healthResponse.ok ? 'connected' : 'error',
          django_status: healthData,
          edge_function: 'healthy',
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (healthError) {
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
      throw new Error(`Unknown action: ${action}. Supported actions: recognize, register, health`);
    }

  } catch (error: unknown) {
    console.error('Edge function error:', error);
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
