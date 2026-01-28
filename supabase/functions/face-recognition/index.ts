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

    console.log('Django API URL:', DJANGO_API_URL);
    console.log('SSL/TLS: Using HTTPS connection to Django API');

    const body = await req.json();
    const { action, image, frame, user_data, organization_id } = body;
    
    // Support both 'image' and 'frame' keys for the image data
    const imageData = image || frame;
    
    console.log(`Processing action: ${action}`);

    // Initialize Supabase client with service role for database operations
    // This bypasses RLS to allow attendance recording from the edge function
    const supabase = createClient(
      SUPABASE_URL!, 
      SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY!
    );

    if (action === 'recognize') {
      // Call Django API for face recognition
      console.log('Calling Django recognize-frame API...');
      
      let response;
      try {
        response = await fetch(`${DJANGO_API_URL}/api/recognize-frame/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            frame: imageData,
          }),
        });
        console.log('SSL/TLS: Connection successful, status:', response.status);
      } catch (fetchError) {
        console.error('SSL/TLS connection error:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: `SSL/TLS connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          ssl_debug: {
            url: `${DJANGO_API_URL}/api/recognize-frame/`,
            error_type: fetchError instanceof Error ? fetchError.name : 'Unknown',
          },
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Django API error:', response.status, errorText);
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
      console.log('Raw Django response:', JSON.stringify(data));

      // Extract faces from Django response - handle nested structure
      // Django returns: { status, code, message, data: { faces: [...] } }
      // Or sometimes: { faces: [...] } directly
      const djangoFaces = data.data?.faces || data.faces || [];
      console.log('Extracted faces count:', djangoFaces.length);

      // Process recognized faces and record attendance
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];
      const processedFaces = [];

      for (const face of djangoFaces) {
        console.log('Processing face:', JSON.stringify(face));
        
        const faceResult: any = {
          name: face.name || 'Unknown',
          recognized: face.recognized || false,
          confidence: face.confidence || (face.distance ? (1 - face.distance) : null),
          bbox: face.bbox || [],
        };

        // Check if this is a recognized member
        // Django may return user_id for recognized faces
        if (face.recognized && face.user_id) {
          // Recognized member - record attendance
          faceResult.user_id = face.user_id;
          faceResult.type = 'member';
          console.log('Processing recognized member:', face.user_id);

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
            const { error: updateError } = await supabase
              .from('attendance')
              .update({ 
                face_detections: (existingAttendance.face_detections || 1) + 1,
                confidence_score: faceResult.confidence,
              })
              .eq('id', existingAttendance.id);
            
            if (updateError) {
              console.error('Error updating attendance:', updateError);
            }
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
              console.log('Attendance marked for member:', face.user_id);
              faceResult.attendance_status = 'marked';
              
              // Create notification for the user
              try {
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
              }
            }
          }
        } else {
          // Unrecognized face - record as temp attendance
          // Django returns temp_user_id for temporary/unknown faces
          const tempFaceId = face.temp_user_id || face.temp_face_id || `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          faceResult.temp_face_id = tempFaceId;
          faceResult.type = 'visitor';
          faceResult.name = `Visitor #${tempFaceId}`;
          console.log('Processing visitor with temp ID:', tempFaceId);

          // Check if this temp face already exists today
          const { data: existingTemp, error: tempCheckError } = await supabase
            .from('temp_attendance')
            .select('id, face_detections')
            .eq('temp_face_id', tempFaceId)
            .eq('date', today)
            .maybeSingle();

          if (tempCheckError) {
            console.error('Error checking temp attendance:', tempCheckError);
          }

          if (existingTemp) {
            const { error: updateError } = await supabase
              .from('temp_attendance')
              .update({ face_detections: (existingTemp.face_detections || 1) + 1 })
              .eq('id', existingTemp.id);
            
            if (updateError) {
              console.error('Error updating temp attendance:', updateError);
            } else {
              console.log('Updated temp attendance for:', tempFaceId);
            }
            faceResult.attendance_status = 'updated';
          } else {
            const { error: insertError } = await supabase
              .from('temp_attendance')
              .insert({
                temp_face_id: tempFaceId,
                date: today,
                time: currentTime,
                face_detections: 1,
                face_roi_url: face.face_roi_url || null,
              });
            
            if (insertError) {
              console.error('Error inserting temp attendance:', insertError);
              faceResult.attendance_status = 'error';
            } else {
              console.log('Temp attendance recorded for:', tempFaceId);
              faceResult.attendance_status = 'recorded';
            }
          }
        }

        processedFaces.push(faceResult);
      }

      console.log('Processed faces result:', JSON.stringify(processedFaces));

      // Pass through the Django response code for frontend state management
      const responseCode = data.code || (processedFaces.length > 0 ? 'FACE_RECOGNIZED' : 'NO_FACE');
      console.log('Response code:', responseCode);

      return new Response(JSON.stringify({
        success: true,
        code: responseCode,
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

      let response;
      try {
        response = await fetch(`${DJANGO_API_URL}/api/attendance/mark/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frame: imageData,
            image: imageData,
            user_id: user_data.user_id,
            name: user_data.name,
            action: 'register',
          }),
        });
        console.log('SSL/TLS: Registration API connection successful, status:', response.status);
      } catch (fetchError) {
        console.error('SSL/TLS connection error during registration:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: `SSL/TLS connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          ssl_debug: {
            url: `${DJANGO_API_URL}/api/attendance/mark/`,
            error_type: fetchError instanceof Error ? fetchError.name : 'Unknown',
          },
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Django register API error:', response.status, errorText);
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
      // Health check endpoint with SSL debugging
      console.log('Performing health check with SSL debugging...');
      try {
        const healthResponse = await fetch(`${DJANGO_API_URL}/api/health/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const healthData = await healthResponse.json();
        console.log('Health check SSL/TLS: Connection successful');
        
        return new Response(JSON.stringify({
          success: true,
          django_api: healthResponse.ok ? 'connected' : 'error',
          django_status: healthData,
          edge_function: 'healthy',
          ssl_status: 'OK',
          api_url: DJANGO_API_URL,
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (healthError) {
        console.error('Health check SSL/TLS error:', healthError);
        return new Response(JSON.stringify({
          success: false,
          django_api: 'unreachable',
          edge_function: 'healthy',
          error: healthError instanceof Error ? healthError.message : 'Connection failed',
          ssl_debug: {
            url: `${DJANGO_API_URL}/api/health/`,
            error_type: healthError instanceof Error ? healthError.name : 'Unknown',
            error_message: healthError instanceof Error ? healthError.message : 'Unknown error',
          },
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
