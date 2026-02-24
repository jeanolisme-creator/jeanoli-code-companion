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
    const normalizedToken = typeof token === "string" ? token.trim() : "";

    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ ok: false, status: 400, error: "Parâmetros inválidos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const githubUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const baseHeaders = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Jeanoli-Studio-IA",
    };

    const requestRepo = async (authHeader?: string) => {
      const response = await fetch(githubUrl, {
        method: "GET",
        headers: {
          ...baseHeaders,
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });

      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    };

    let result = await requestRepo(normalizedToken ? `Bearer ${normalizedToken}` : undefined);

    if (
      normalizedToken &&
      !result.response.ok &&
      (result.response.status === 401 || result.response.status === 403)
    ) {
      result = await requestRepo(`token ${normalizedToken}`);
    }

    if (!result.response.ok) {
      const status = result.response.status;
      const githubMessage = typeof result.payload?.message === "string" ? result.payload.message : "";

      const friendlyError =
        status === 401
          ? "Token GitHub inválido ou expirado"
          : status === 403
            ? "Token sem permissão para acessar este repositório privado"
            : status === 404 && normalizedToken
              ? "Repositório não encontrado ou token sem acesso a este repositório"
              : githubMessage || "Erro ao consultar GitHub";

      return new Response(
        JSON.stringify({
          ok: false,
          status,
          requiresAuth: status === 404 && !normalizedToken,
          error: friendlyError,
          githubMessage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = result.payload;
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
