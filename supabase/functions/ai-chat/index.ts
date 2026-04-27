// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  try {
    const body = await req.json();
    const msgs = body.messages || [];
    const last = msgs.filter((m: any) => m.role === 'user').pop();
    const q = last?.content || "";
    let reply = "I'm your AI assistant. Integrate your own LLM API in the edge function for full responses.";
    if (/product|sell|brand|marketing|strategy|content|tiktok|audience/i.test(q)) {
      reply = "That's a great marketing question! Here's a strategy overview:

1. Hook viewers in first 3 seconds
2. Show relatable Malaysian scenarios
3. End with a clear CTA

For Malaysian modest fashion specifically, focus on authentic moments, real people wearing products naturally, and leverage Raya/Festive themes for maximum engagement.";
    } else if (/how to|tutorial|help|use/i.test(q)) {
      reply = "You can use QFM Studio's tools to:
- Generate product images and videos
- Create storyboards for TikTok content
- Generate captions, hooks, hashtags
- Plan your content calendar

Navigate using the sidebar on the left. Start with the Dashboard for quick actions.";
    }
    return new Response(JSON.stringify({ message: reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
    });
  }
});
