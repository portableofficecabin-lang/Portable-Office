import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupAdminRequest {
  email: string;
  password: string;
  setup_key: string;
}

const SETUP_KEY = Deno.env.get("ADMIN_SETUP_KEY");

if (!SETUP_KEY) {
  console.error("ADMIN_SETUP_KEY environment variable is not set");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, setup_key }: SetupAdminRequest = await req.json();

    // Validate setup key
    if (setup_key !== SETUP_KEY) {
      throw new Error("Invalid setup key");
    }

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    console.log("Setting up admin account for:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin already exists (initial check - database constraint is the real enforcement)
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("role", "admin")
      .limit(1);

    if (existingRoles && existingRoles.length > 0) {
      throw new Error("Admin account already exists");
    }

    console.log("No existing admin found, proceeding with creation");

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    console.log("Created auth user:", authData.user.id);

    // Assign admin role (database constraint idx_single_admin prevents duplicates)
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "admin",
      });

    if (roleError) {
      // Cleanup: delete the auth user if role assignment fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      // Check if it's a unique constraint violation (race condition prevented)
      if (roleError.code === '23505') {
        throw new Error("Admin account already exists (race condition prevented)");
      }
      throw roleError;
    }

    console.log("Admin role assigned successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin account created successfully",
        email: email,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in setup-admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
