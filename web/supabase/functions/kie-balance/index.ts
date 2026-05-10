// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  return new Response(JSON.stringify({ credit_balance: "Demo: Please set your KIE key in Settings" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
  });
});
