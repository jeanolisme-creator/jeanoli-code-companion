import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ghFetch = async (url: string, token: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Jeanoli-Studio-IA",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { owner, repo, branch, token, files, message } = await req.json();

    if (!owner || !repo || !token || !files || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "owner, repo, token, files e message são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const branchName = branch || "main";

    // 1. Get the latest commit SHA for the branch
    const refRes = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branchName}`,
      token
    );
    if (!refRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Branch ${branchName} não encontrada` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA from the latest commit
    const commitRes = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      token
    );
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeItems = await Promise.all(
      (files as { path: string; content: string }[]).map(async (file) => {
        const blobRes = await ghFetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
          token,
          {
            method: "POST",
            body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
          }
        );
        const blobData = await blobRes.json();
        return {
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blobData.sha,
        };
      })
    );

    // 4. Create a new tree
    const treeRes = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      }
    );
    const treeData = await treeRes.json();

    // 5. Create a new commit
    const newCommitRes = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: treeData.sha,
          parents: [latestCommitSha],
        }),
      }
    );
    const newCommitData = await newCommitRes.json();

    // 6. Update the branch reference
    const updateRefRes = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommitData.sha }),
      }
    );

    if (!updateRefRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "Erro ao atualizar branch. Verifique permissões do token." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        commitSha: newCommitData.sha,
        message: newCommitData.message,
        url: `https://github.com/${owner}/${repo}/commit/${newCommitData.sha}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
