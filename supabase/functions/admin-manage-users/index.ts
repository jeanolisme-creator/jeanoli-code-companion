import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await supabaseClient.auth.getUser();
    if (!caller) throw new Error("Não autenticado");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) throw new Error("Acesso negado: apenas administradores");

    const { action, email, password, name, userId, role, banned } = await req.json();

    // CREATE user
    if (action === "create") {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError) throw createError;
      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST users with roles
    if (action === "list") {
      const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
      const { data: allRoles } = await supabaseAdmin.from("user_roles").select("*");

      const merged = (authUsers || []).map(u => {
        const profile = profiles?.find(p => p.id === u.id);
        const userRoles = allRoles?.filter(r => r.user_id === u.id) || [];
        return {
          id: u.id,
          email: u.email || '',
          name: profile?.name || u.user_metadata?.name || u.email?.split('@')[0] || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned: u.banned || false,
          user_roles: userRoles.map(r => ({ role: r.role })),
        };
      });

      return new Response(JSON.stringify({ users: merged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE user (name, email, password)
    if (action === "update") {
      const updates: Record<string, unknown> = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (name) updates.user_metadata = { name };

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
      if (updateError) throw updateError;

      // Also update profile name
      if (name) {
        await supabaseAdmin.from("profiles").update({ name }).eq("id", userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BAN / UNBAN user
    if (action === "ban") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: banned ? "876000h" : "none",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SET ROLE
    if (action === "set_role") {
      // Remove existing roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      // Insert new role
      if (role) {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE user
    if (action === "delete") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Ação inválida");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
