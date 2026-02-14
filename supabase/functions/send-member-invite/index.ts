import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  inviteId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  token: string;
  organizationName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify caller has admin privileges
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = !roleError && roles && roles.some(r =>
      ["super_admin", "admin", "parish_pastor", "department_head"].includes(r.role)
    );

    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden - Admin privileges required" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { inviteId, email, firstName, lastName, token, organizationName }: InviteRequest = await req.json();

    if (!email || !token) {
      throw new Error("Missing required fields: email and token are required");
    }

    const appUrl = req.headers.get("origin") || "https://id-preview--71729e30-cc18-4a7b-89e9-8263bcd306a8.lovable.app";
    const registrationUrl = `${appUrl}/register?token=${token}`;

    const memberName = firstName ? `${firstName}${lastName ? ` ${lastName}` : ""}` : "Team Member";
    const orgName = organizationName || "Our Organization";

    console.log(`Sending invite email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "FaceAttend <noreply@resend.dev>",
      to: [email],
      subject: `You're invited to join ${orgName} on FaceAttend`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #18181b; font-size: 24px; margin: 0;">Welcome to FaceAttend!</h1>
              </div>
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello ${memberName},</p>
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                You've been invited to join <strong>${orgName}</strong> on FaceAttend. Click below to complete your registration:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${registrationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Complete Your Registration</a>
              </div>
              <p style="color: #71717a; font-size: 14px; line-height: 1.6;">This invitation link will expire in 7 days.</p>
              <p style="color: #a1a1aa; font-size: 12px; line-height: 1.6; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
                If you didn't expect this invitation, you can safely ignore this email.
                <br><br>If the button doesn't work, copy and paste this link:<br>
                <a href="${registrationUrl}" style="color: #2563eb; word-break: break-all;">${registrationUrl}</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Member invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-member-invite function:", error);
    return new Response(JSON.stringify({ success: false, error: "Failed to send invite" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
