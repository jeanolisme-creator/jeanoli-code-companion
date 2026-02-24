import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ghFetch = async (url: string, token?: string) => {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Jeanoli-Studio-IA",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { owner, repo, branch, token, path, action } = await req.json();
    const normalizedToken = typeof token === "string" ? token.trim() : "";

    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ ok: false, error: "owner e repo são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const branchName = branch || "main";

    // Action: "tree" - fetch the repo file tree
    if (action === "tree") {
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branchName}?recursive=1`;
      const res = await ghFetch(treeUrl, normalizedToken || undefined);
      
      if (!res.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: `Erro ao buscar árvore: ${res.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      const files = (data.tree || [])
        .filter((f: any) => f.type === "blob")
        .map((f: any) => ({ path: f.path, size: f.size, sha: f.sha }));

      return new Response(
        JSON.stringify({ ok: true, files }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: "file" - fetch a single file content
    if (action === "file") {
      if (!path) {
        return new Response(
          JSON.stringify({ ok: false, error: "path é obrigatório para action=file" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branchName}`;
      const res = await ghFetch(fileUrl, normalizedToken || undefined);
      
      if (!res.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: `Arquivo não encontrado: ${path}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      
      // Decode base64 content
      let content = "";
      if (data.content) {
        try {
          content = atob(data.content.replace(/\n/g, ""));
        } catch {
          content = "// Arquivo binário - não é possível exibir";
        }
      }

      return new Response(
        JSON.stringify({ ok: true, content, path: data.path, size: data.size, sha: data.sha }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: "batch" - fetch multiple files at once
    if (action === "batch") {
      const paths: string[] = Array.isArray(path) ? path : [];
      const results: Record<string, string> = {};

      await Promise.all(
        paths.map(async (p: string) => {
          try {
            const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${p}?ref=${branchName}`;
            const res = await ghFetch(fileUrl, normalizedToken || undefined);
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                results[p] = atob(data.content.replace(/\n/g, ""));
              }
            }
          } catch {
            // skip failed files
          }
        })
      );

      return new Response(
        JSON.stringify({ ok: true, files: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "action inválida. Use: tree, file, batch" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
