import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  'http://localhost:5173',
  'https://jnqjfybdhsdynrldzgde.supabase.co',
];

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const { resumeId, resumeText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call Lovable AI to analyze the resume
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an ATS (Applicant Tracking System) analyzer. Analyze resumes and provide:
1. A score from 0-100 based on ATS compatibility
2. Specific, actionable feedback on how to improve the resume

Consider:
- Use of keywords and industry-specific terms
- Clear formatting and structure
- Quantifiable achievements
- Action verbs
- Professional summary
- Skills section
- Education and experience relevance

Respond in JSON format with two fields: "score" (number) and "feedback" (string with detailed suggestions).`
          },
          {
            role: "user",
            content: `Analyze this resume and provide ATS score and feedback:\n\n${resumeText}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the AI response
    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch {
      // If not valid JSON, extract score and use content as feedback
      const scoreMatch = content.match(/score["\s:]+(\d+)/i);
      analysisResult = {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 75,
        feedback: content
      };
    }

    // Update the resume record with the analysis
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        ats_score: analysisResult.score,
        ats_feedback: analysisResult.feedback
      })
      .eq('id', resumeId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        score: analysisResult.score, 
        feedback: analysisResult.feedback 
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }
});
