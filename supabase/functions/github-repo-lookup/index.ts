import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { owner, repo, token } = await req.json();

    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ ok: false, status: 400, error: "Parâmetros inválidos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Jeanoli-Studio-IA",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          ok: false,
          status: response.status,
          requiresAuth: response.status === 404 && !token,
          error: payload?.message || "Erro ao consultar GitHub",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify({
        ok: true,
        repo: {
          name: data.name,
          fullName: data.full_name,
          owner: data.owner?.login,
          private: data.private,
          language: data.language || "Unknown",
          defaultBranch: data.default_branch || "main",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
