// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  try {
    const body = await req.json();
    const { prompt, duration, motionIntensity, videoQuality, model, aspectRatio } = body;
    if (!prompt) throw new Error("Missing prompt");
    return new Response(JSON.stringify({ task_id: `stub-${Date.now()}`, status: "pending", prompt, model, aspectRatio, duration }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
