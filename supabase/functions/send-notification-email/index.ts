import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const allowedOrigins = [
  'http://localhost:5173',
  'https://jnqjfybdhsdynrldzgde.supabase.co',
];

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

interface NotificationEmailRequest {
  to: string;
  subject: string;
  type: 'placement' | 'announcement' | 'video_review' | 'general';
  data: {
    userName?: string;
    title?: string;
    company?: string;
    status?: string;
    reviewNotes?: string;
    content?: string;
    link?: string;
  };
}

const getEmailTemplate = (type: string, data: any) => {
  const baseUrl = Deno.env.get("VITE_SUPABASE_URL")?.replace('.supabase.co', '') || '';
  
  switch (type) {
    case 'placement':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">New Placement Opportunity</h1>
          <p>Hello ${data.userName},</p>
          <p>A new placement opportunity has been posted:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">${data.company}</h2>
            <p><strong>Role:</strong> ${data.title}</p>
          </div>
          <p>
            <a href="${data.link}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Details
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            College Placement Portal Team
          </p>
        </div>
      `;
    
    case 'announcement':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">New Announcement</h1>
          <p>Hello ${data.userName},</p>
          <p>A new announcement has been posted:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">${data.title}</h2>
            <p>${data.content}</p>
          </div>
          <p>
            <a href="${data.link}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Announcement
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            College Placement Portal Team
          </p>
        </div>
      `;
    
    case 'video_review':
      const statusColor = data.status === 'approved' ? '#10b981' : '#ef4444';
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${statusColor};">Video ${data.status === 'approved' ? 'Approved' : 'Rejected'}</h1>
          <p>Hello ${data.userName},</p>
          <p>Your video submission "${data.title}" has been reviewed.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Status:</strong> <span style="color: ${statusColor}; text-transform: capitalize;">${data.status}</span></p>
            ${data.reviewNotes ? `<p><strong>Review Notes:</strong><br>${data.reviewNotes}</p>` : ''}
          </div>
          <p>
            <a href="${data.link}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Your Videos
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            College Placement Portal Team
          </p>
        </div>
      `;
    
    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Notification</h1>
          <p>Hello ${data.userName},</p>
          <p>${data.content}</p>
          ${data.link ? `
            <p>
              <a href="${data.link}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Details
              </a>
            </p>
          ` : ''}
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            College Placement Portal Team
          </p>
        </div>
      `;
  }
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const { to, subject, type, data }: NotificationEmailRequest = await req.json();

    const html = getEmailTemplate(type, data);

    const emailResponse = await resend.emails.send({
      from: "College Placement Portal <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...headers },
      }
    );
  }
};

serve(handler);
