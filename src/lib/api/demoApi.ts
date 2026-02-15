/**
 * Demo API Client
 * Calls the demo-recognize edge function for public (unauthenticated) demo use.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface DemoApiResponse {
  success: boolean;
  error?: string;
  code?: string;
  message?: string;
  confidence?: number;
  name?: string;
  type?: string;
  bbox?: number[];
  attendance_marked?: boolean;
  [key: string]: any;
}

async function callDemoFunction(body: Record<string, any>): Promise<DemoApiResponse> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/demo-recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[demoApi] Request failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Enroll a face for demo (no auth required)
 */
export async function demoEnrollFace(
  imageBase64: string,
  demoId: string
): Promise<DemoApiResponse> {
  return callDemoFunction({
    action: 'enroll',
    image: imageBase64,
    demo_id: demoId,
  });
}

/**
 * Recognize a face for demo (no auth required)
 */
export async function demoRecognizeFace(
  imageBase64: string,
  demoId: string
): Promise<DemoApiResponse> {
  return callDemoFunction({
    action: 'recognize',
    image: imageBase64,
    demo_id: demoId,
  });
}
