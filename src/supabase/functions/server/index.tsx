/**
 * GOWORK - Sistema de Controle de Estoque
 * Backend API Server
 * 
 * Estrutura:
 * - Hono web framework rodando no Supabase Edge Functions
 * - Todas as rotas prefixadas com /make-server-46b247d8
 * - Autenticação via Bearer token no header Authorization
 * - Supabase Client com service role (bypassa RLS)
 * 
 * Principais Endpoints:
 * - /users, /units, /categories, /items - CRUD básico
 * - /unit-stocks - Gerenciamento de estoque por unidade
 * - /movements - Histórico de movimentações (atualiza stock automaticamente)
 * - /requests - Solicitações de materiais do almoxarifado
 * - /furniture-* - Endpoints específicos para móveis
 * - /delivery-* - Sistema de entregas e confirmações
 * 
 * Lógica de Negócio:
 * - Almoxarifado Central: única unidade onde materiais regulares são cadastrados
 * - Móveis: cadastrados por unidade, podem ser transferidos
 * - Movimentos atualizam automaticamente o unit_stock correspondente
 * - Sistema de códigos únicos diários para confirmações
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase client with service role (bypasses RLS)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ========== HELPER FUNCTIONS FOR CASE CONVERSION ==========
// Convert snake_case to camelCase for user objects
function userDbToApi(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    primaryUnitId: user.primary_unit_id,
    additionalUnitIds: user.additional_unit_ids,
    warehouseType: user.warehouse_type,
    jobTitle: user.job_title,
    createdAt: user.created_at,
  };
}

// Health check endpoint
app.get("/make-server-46b247d8/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== SCHEMA INITIALIZATION ==========
app.post("/make-server-46b247d8/init-schema", async (c) => {
  try {
    // Create units table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          floors JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    }).catch(() => {
      // If RPC doesn't exist, try direct SQL (may not work in all environments)
      console.log("RPC exec_sql not available, tables may need to be created manually");
    });

    // Check if floors column exists, if not add it
    const { data: columns } = await supabase
      .from('units')
      .select('*')
      .limit(0);
    
    // If we can query, the table exists
    // Try to add floors column if it doesn't exist (will fail silently if it does)
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE units 
        ADD COLUMN IF NOT EXISTS floors JSONB DEFAULT '[]'::jsonb;
      `
    }).catch(() => {
      console.log("Could not add floors column via RPC");
    });

    return c.json({ 
      message: "Schema initialization attempted",
      note: "If tables don't exist, please create them manually in Supabase dashboard"
    });
  } catch (error) {
    console.error("Schema initialization error:", error);
    return c.json({ 
      error: "Schema initialization failed", 
      details: error.message,
      note: "Please ensure tables are created in Supabase dashboard"
    }, 500);
  }
});

// ========== SEED DATA ==========
// Initialize database with demo data
app.post("/make-server-46b247d8/seed", async (c) => {
  try {
    // Check if already seeded
    const { data: existingUnits } = await supabase.from('units').select('id').limit(1);
    if (existingUnits && existingUnits.length > 0) {
      return c.json({ message: "Database already seeded" });
    }

    // Seed Units
    const units = [
      { name: "Almoxarifado Central", address: "Rua do Estoque, 100", status: "active", floors: ["Térreo"] },
      { name: "Paulista 302", address: "Av. Paulista, 302", status: "active", floors: [] },
      { name: "Paulista 475", address: "Av. Paulista, 475", status: "active", floors: [] },
      { name: "Campus 1", address: "Campus 1 - Endereço", status: "active", floors: [] },
      { name: "Campus 2", address: "Campus 2 - Endereço", status: "active", floors: [] },
      { name: "Consolação", address: "Rua da Consolação", status: "active", floors: [] },
      { name: "Pinheiros 2", address: "Pinheiros 2 - Endereço", status: "active", floors: [] },
      { name: "Joaquim Antunes", address: "Rua Joaquim Antunes", status: "active", floors: [] },
      { name: "Amauri 1", address: "Rua Amauri - Unidade 1", status: "active", floors: [] },
      { name: "Amauri 2", address: "Rua Amauri - Unidade 2", status: "active", floors: [] },
      { name: "Funchal", address: "Rua Funchal", status: "active", floors: [] },
    ];

    // Seed Categories
    const categories = [
      { name: "Acessórios", description: "Cabos, adaptadores e acessórios diversos" },
      { name: "Áudio/Vídeo", description: "Equipamentos de áudio e vídeo" },
      { name: "Ferramentas", description: "Ferramentas e equipamentos" },
      { name: "Limpeza", description: "Produtos e itens de limpeza" },
      { name: "Consumíveis", description: "Café, açúcar, copos e outros itens de consumo diário" },
      { name: "Elétrica", description: "Materiais elétricos e iluminação" },
      { name: "Hidráulica", description: "Materiais para manutenção hidráulica" },
      { name: "Escritório", description: "Material de escritório e papelaria" },
      { name: "Móveis", description: "Cadeiras, mesas, armários e outros móveis" },
    ];

    const { error: unitsError } = await supabase.from('units').insert(units);
    if (unitsError) throw unitsError;

    const { error: categoriesError } = await supabase.from('categories').insert(categories);
    if (categoriesError) throw categoriesError;

    // Create initial users in auth.users and public.users
    const initialUsers = [
      {
        email: 'dev@gowork.com',
        password: 'dev123456',
        name: 'Developer Gowork',
        role: 'developer',
        primaryUnitId: null, // Volante - sem unidade fixa
      },
      {
        email: 'admin@gowork.com',
        password: 'admin123456',
        name: 'Admin Gowork',
        role: 'admin',
        primaryUnitId: null,
      },
    ];

    let usersCreated = 0;
    for (const userData of initialUsers) {
      try {
        // Create in auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: { 
            name: userData.name, 
            role: userData.role,
          },
        });

        if (authError) {
          console.error(`Error creating auth user ${userData.email}:`, authError);
          continue;
        }

        // Create in public.users
        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          primary_unit_id: userData.primaryUnitId,
        });

        if (userError) {
          console.error(`Error creating user in database ${userData.email}:`, userError);
          continue;
        }

        usersCreated++;
      } catch (error) {
        console.error(`Error processing user ${userData.email}:`, error);
      }
    }

    return c.json({ 
      message: "Database seeded successfully", 
      units: units.length,
      categories: categories.length,
      users: usersCreated
    }, 201);
  } catch (error) {
    console.error("Error seeding database:", error);
    return c.json({ error: "Failed to seed database" }, 500);
  }
});

/**
 * POST /migrate-unit-stocks
 * Migração única para corrigir unit_id dos stocks do almoxarifado
 * 
 * Histórico:
 * - Stocks antigos tinham unit_id como string "unit-warehouse"
 * - Precisam ser atualizados para o UUID real do Almoxarifado Central
 * 
 * Este endpoint pode ser executado múltiplas vezes sem problemas (idempotente)
 */
app.post("/make-server-46b247d8/migrate-unit-stocks", async (c) => {
  try {
    console.log('🔧 Iniciando migração de unit_stocks...');
    
    // 1. Buscar o UUID real da unidade "Almoxarifado Central"
    const { data: warehouseUnit, error: warehouseError } = await supabase
      .from('units')
      .select('id, name')
      .eq('name', 'Almoxarifado Central')
      .single();
    
    if (warehouseError || !warehouseUnit) {
      console.error('❌ Erro ao buscar Almoxarifado Central:', warehouseError);
      return c.json({ error: 'Almoxarifado Central não encontrado' }, 404);
    }
    
    console.log('✅ Almoxarifado Central encontrado:', warehouseUnit.id);
    
    // 2. Buscar TODOS os unit_stocks (não podemos filtrar por 'unit-warehouse' porque a coluna é UUID)
    const { data: allStocks, error: fetchError } = await supabase
      .from('unit_stocks')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Erro ao buscar stocks:', fetchError);
      console.error('❌ Código do erro:', fetchError.code);
      console.error('❌ Mensagem do erro:', fetchError.message);
      console.error('❌ Detalhes do erro:', fetchError.details);
      return c.json({ 
        error: 'Erro ao buscar stocks',
        details: fetchError.message,
        code: fetchError.code 
      }, 500);
    }
    
    // Filtrar stocks que NÃO são UUIDs válidos (provavelmente são strings hardcoded)
    // Um UUID válido tem formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidStocks = (allStocks || []).filter(stock => {
      // Se unit_id não é um UUID válido OU se for exatamente 'unit-warehouse'
      return !uuidRegex.test(stock.unit_id) || stock.unit_id === 'unit-warehouse';
    });
    
    console.log(`📦 Total de stocks: ${allStocks?.length || 0}`);
    console.log(`📦 Stocks com unit_id inválido: ${invalidStocks.length}`);
    
    if (!invalidStocks || invalidStocks.length === 0) {
      return c.json({ 
        message: 'Nenhum stock precisa de migração',
        updated: 0
      });
    }
    
    // 3. Atualizar cada stock com o UUID correto
    let updated = 0;
    for (const stock of invalidStocks) {
      const { error: updateError } = await supabase
        .from('unit_stocks')
        .update({ unit_id: warehouseUnit.id })
        .eq('id', stock.id);
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar stock ${stock.id}:`, updateError);
      } else {
        updated++;
        console.log(`✅ Stock ${stock.id} atualizado`);
      }
    }
    
    console.log(`✅ Migração concluída: ${updated} stocks atualizados`);
    
    return c.json({ 
      message: 'Migração concluída com sucesso',
      warehouseUnitId: warehouseUnit.id,
      totalFound: invalidStocks.length,
      updated: updated
    }, 200);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return c.json({ error: 'Erro na migração' }, 500);
  }
});

// ========== AUTHENTICATION ==========
// Sign up - Create new user with Supabase Auth
app.post("/make-server-46b247d8/auth/signup", async (c) => {
  try {
    const { email, password, name, role, primaryUnitId, additionalUnitIds, warehouseType, jobTitle } = await c.req.json();
    
    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Check if user already exists in public.users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return c.json({ error: "User already exists" }, 400);
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, primaryUnitId, additionalUnitIds, warehouseType, jobTitle },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      
      // If user already exists in auth.users, try to retrieve it and sync to public.users
      if (authError.message?.includes('email_exists') || authError.code === 'email_exists') {
        console.log("User exists in auth.users, attempting to sync...");
        
        // Try to sign in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError || !signInData.user) {
          return c.json({ error: "User exists but password doesn't match. Please use a different email or reset your password." }, 400);
        }
        
        // Create user in database with the existing auth ID
        const { data: userData, error: userError } = await supabase.from('users').insert({
          id: signInData.user.id,
          email,
          name,
          role,
          primary_unit_id: primaryUnitId || null,
          additional_unit_ids: additionalUnitIds || null,
          warehouse_type: warehouseType || null,
          job_title: jobTitle || null,
        }).select().single();

        if (userError) {
          console.error("Error syncing user to database:", userError);
          return c.json({ error: "User exists in auth but failed to sync to database" }, 400);
        }

        return c.json({ user: userData, message: "User synced successfully" }, 201);
      }
      
      return c.json({ error: authError.message }, 400);
    }

    // Create user in database
    const { data: userData, error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name,
      role,
      primary_unit_id: primaryUnitId || null,
      additional_unit_ids: additionalUnitIds || null,
      warehouse_type: warehouseType || null,
      job_title: jobTitle || null,
    }).select().single();

    if (userError) {
      console.error("Error creating user in database:", userError);
      return c.json({ error: userError.message }, 400);
    }

    return c.json({ user: userData, message: "User created successfully" }, 201);
  } catch (error) {
    console.error("Error during signup:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Sign in - Authenticate user
app.post("/make-server-46b247d8/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // Authenticate with Supabase Auth (auth.users table)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Log com mais contexto mas sem logar todo o erro (pode conter informações sensíveis)
      console.error("❌ Error signing in - Code:", error.code, "- User:", email);
      
      // Return specific error messages based on error code
      if (error.message.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
        return c.json({ error: "Email ou senha incorretos" }, 401);
      }
      if (error.message.includes('Email not confirmed')) {
        return c.json({ error: "Email não confirmado" }, 401);
      }
      if (error.message.includes('User not found')) {
        return c.json({ error: "Usuário não encontrado" }, 401);
      }
      
      return c.json({ error: error.message || "Erro ao fazer login. Verifique suas credenciais." }, 401);
    }

    if (!data.session || !data.user) {
      return c.json({ error: "Não foi possível criar a sessão" }, 401);
    }

    // Get user data from public.users table (support table)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user from database:", userError);
      return c.json({ error: "Failed to fetch user data: " + userError.message }, 500);
    }

    // If user doesn't exist in public.users, create it automatically (migration/sync)
    if (!userData) {
      console.log("User exists in auth.users but not in public.users, creating record...");
      const metadata = data.user.user_metadata || {};
      
      const newUserData = {
        id: data.user.id,
        email: data.user.email || email,
        name: metadata.name || data.user.email?.split('@')[0] || 'User',
        role: metadata.role || 'requester',
        primary_unit_id: metadata.primaryUnitId || null,
        warehouse_type: metadata.warehouseType || null,
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUserData)
        .select()
        .maybeSingle();

      if (createError) {
        console.error("Error creating user in public.users:", createError);
        // Even if fails to create in public.users, return basic auth data
        return c.json({ 
          user: userDbToApi(newUserData),
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
          warning: "User authenticated but failed to sync with database"
        });
      }
      
      console.log("User successfully synced to public.users");
      return c.json({ 
        user: userDbToApi(createdUser || newUserData),
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      });
    }

    // User found in both tables, return normally with camelCase transformation
    return c.json({ 
      user: userDbToApi(userData),
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Error during signin:", error);
    return c.json({ error: "Failed to sign in" }, 500);
  }
});

// Get current user session
app.get("/make-server-46b247d8/auth/session", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return c.json({ error: error.message }, 401);
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return c.json({ user: userData, session: { access_token: token } });
  } catch (error) {
    console.error("Error getting session:", error);
    return c.json({ error: "Failed to get session" }, 500);
  }
});

// Sign out
app.post("/make-server-46b247d8/auth/signout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ message: "Already signed out" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    await supabase.auth.admin.signOut(token);

    return c.json({ message: "Signed out successfully" });
  } catch (error) {
    console.error("Error signing out:", error);
    return c.json({ error: "Failed to sign out" }, 500);
  }
});

// Update password - for forced password changes
app.post("/make-server-46b247d8/auth/update-password", async (c) => {
  try {
    const { userId, newPassword } = await c.req.json();
    
    if (!userId || !newPassword) {
      return c.json({ error: "userId e newPassword são obrigatórios" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Update password in auth.users
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Clear the requirePasswordChange flag in public.users
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        require_password_change: false,
        first_login: false 
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error("Error clearing password change flag:", userUpdateError);
      // Don't fail the request if this fails - password was already changed
    }

    return c.json({ 
      message: "Senha atualizada com sucesso",
      user: updateData.user 
    });
  } catch (error) {
    console.error("Error during password update:", error);
    return c.json({ error: "Erro ao atualizar senha" }, 500);
  }
});

// Clear password change flags (called after Supabase Auth password reset)
app.post("/make-server-46b247d8/auth/clear-password-flags", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: "userId é obrigatório" }, 400);
    }

    // Clear the password change flags in public.users
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        require_password_change: false,
        first_login: false,
        reset_token: null,
        reset_token_expiry: null
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error("Error clearing password flags:", userUpdateError);
      return c.json({ error: "Erro ao limpar flags de senha" }, 500);
    }

    return c.json({ 
      message: "Flags de senha limpos com sucesso"
    });
  } catch (error) {
    console.error("Error clearing password flags:", error);
    return c.json({ error: "Erro ao limpar flags" }, 500);
  }
});

// Request password reset - generates a reset token
app.post("/make-server-46b247d8/auth/request-password-reset", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email é obrigatório" }, 400);
    }

    // Find user by email in public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao buscar usuário" }, 500);
    }

    if (!userData) {
      // Don't reveal if email exists or not for security
      return c.json({ error: "Se o email estiver cadastrado, um link de recuperação será gerado" }, 404);
    }

    // Generate a UUID token for the reset link
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store reset token in public.users
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry.toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error("Error storing reset token:", updateError);
      return c.json({ error: "Erro ao gerar link de recuperação" }, 500);
    }

    return c.json({ 
      message: "Link de recuperação gerado",
      resetToken,
      userId: userData.id,
      expiresAt: resetTokenExpiry.toISOString()
    });
  } catch (error) {
    console.error("Error during password reset request:", error);
    return c.json({ error: "Erro ao solicitar recuperação de senha" }, 500);
  }
});

// Validate reset token
app.post("/make-server-46b247d8/auth/validate-reset-token", async (c) => {
  try {
    const { token } = await c.req.json();
    
    if (!token) {
      return c.json({ error: "Token é obrigatório" }, 400);
    }

    // Find user with this token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao validar token" }, 500);
    }

    if (!userData) {
      return c.json({ error: "Token inválido" }, 400);
    }

    // Check if token is expired
    const tokenExpiry = new Date(userData.reset_token_expiry);
    if (tokenExpiry < new Date()) {
      return c.json({ error: "Token expirado. Solicite um novo link de recuperação." }, 400);
    }

    return c.json({ 
      message: "Token válido",
      email: userData.email,
      userId: userData.id
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return c.json({ error: "Erro ao validar token" }, 500);
  }
});

// Reset password using token
app.post("/make-server-46b247d8/auth/reset-password-with-token", async (c) => {
  try {
    const { token, newPassword } = await c.req.json();
    
    if (!token || !newPassword) {
      return c.json({ error: "Token e nova senha são obrigatórios" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Find user and verify token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao buscar usuário" }, 500);
    }

    if (!userData) {
      return c.json({ error: "Token inválido" }, 400);
    }

    // Check if token is expired
    const tokenExpiry = new Date(userData.reset_token_expiry);
    if (tokenExpiry < new Date()) {
      return c.json({ error: "Token expirado. Solicite um novo link de recuperação." }, 400);
    }

    // Update password in auth.users
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Clear reset token and flags
    const { error: clearError } = await supabase
      .from('users')
      .update({ 
        reset_token: null,
        reset_token_expiry: null,
        require_password_change: false,
        first_login: false
      })
      .eq('id', userData.id);

    if (clearError) {
      console.error("Error clearing reset token:", clearError);
      // Don't fail - password was already updated
    }

    return c.json({ 
      message: "Senha redefinida com sucesso"
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    return c.json({ error: "Erro ao redefinir senha" }, 500);
  }
});

// Reset password using token (deprecated - kept for compatibility)
app.post("/make-server-46b247d8/auth/reset-password", async (c) => {
  try {
    const { email, resetToken, newPassword } = await c.req.json();
    
    if (!email || !resetToken || !newPassword) {
      return c.json({ error: "Email, código e nova senha são obrigatórios" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Find user and verify token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('reset_token', resetToken)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao buscar usuário" }, 500);
    }

    if (!userData) {
      return c.json({ error: "Código de recuperação inválido" }, 400);
    }

    // Check if token is expired
    const tokenExpiry = new Date(userData.reset_token_expiry);
    if (tokenExpiry < new Date()) {
      return c.json({ error: "Código de recuperação expirado. Solicite um novo código." }, 400);
    }

    // Update password in auth.users
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Clear reset token and flags
    const { error: clearError } = await supabase
      .from('users')
      .update({ 
        reset_token: null,
        reset_token_expiry: null,
        require_password_change: false,
        first_login: false
      })
      .eq('id', userData.id);

    if (clearError) {
      console.error("Error clearing reset token:", clearError);
      // Don't fail - password was already updated
    }

    return c.json({ 
      message: "Senha redefinida com sucesso"
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    return c.json({ error: "Erro ao redefinir senha" }, 500);
  }
});

// ========== USERS ==========
app.get("/make-server-46b247d8/users", async (c) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    // Transform snake_case to camelCase
    const transformedData = (data || []).map(userDbToApi);
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

app.post("/make-server-46b247d8/users", async (c) => {
  try {
    const newUser = await c.req.json();
    const { data, error } = await supabase.from('users').insert(newUser).select().single();
    if (error) throw error;
    return c.json(userDbToApi(data), 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

app.put("/make-server-46b247d8/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { name, email, role, primaryUnitId, additionalUnitIds, warehouseType, jobTitle, password } = await c.req.json();
    
    // Prepare updates for public.users table
    const dbUpdates: any = {};
    if (name !== undefined) dbUpdates.name = name;
    if (email !== undefined) dbUpdates.email = email;
    if (role !== undefined) dbUpdates.role = role;
    if (primaryUnitId !== undefined) dbUpdates.primary_unit_id = primaryUnitId;
    if (additionalUnitIds !== undefined) dbUpdates.additional_unit_ids = additionalUnitIds;
    if (warehouseType !== undefined) dbUpdates.warehouse_type = warehouseType;
    if (jobTitle !== undefined) dbUpdates.job_title = jobTitle;
    
    // Update public.users table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (dbError) {
      console.error("Error updating user in database:", dbError);
      return c.json({ error: dbError.message }, 500);
    }
    
    // Update auth.users metadata and password
    const authUpdates: any = {
      user_metadata: {
        name: name || userData.name,
        role: role || userData.role,
        primaryUnitId: primaryUnitId !== undefined ? primaryUnitId : userData.primary_unit_id,
        additionalUnitIds: additionalUnitIds !== undefined ? additionalUnitIds : userData.additional_unit_ids,
        warehouseType: warehouseType !== undefined ? warehouseType : userData.warehouse_type,
        jobTitle: jobTitle || null,
      }
    };
    
    // Update email if provided
    if (email && email !== userData.email) {
      authUpdates.email = email;
      authUpdates.email_confirm = true; // Auto-confirm since we don't have email server
    }
    
    // Update password if provided
    if (password) {
      authUpdates.password = password;
    }
    
    const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
    
    if (authError) {
      console.error("Error updating user auth metadata:", authError);
      // Don't fail the request if metadata update fails, just log it
      return c.json({ 
        ...userDbToApi(userData), 
        warning: "User updated but auth metadata sync failed" 
      });
    }
    
    return c.json({ 
      ...userDbToApi(userData), 
      message: "User updated successfully" 
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

app.delete("/make-server-46b247d8/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Delete from auth.users first (this will cascade to public.users if FK is set properly)
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Error deleting user from auth.users:", authError);
      // Continue anyway to try deleting from public.users
    }
    
    // Delete from public.users
    const { error: dbError } = await supabase.from('users').delete().eq('id', id);
    if (dbError) {
      console.error("Error deleting user from public.users:", dbError);
      return c.json({ error: "Failed to delete user from database" }, 500);
    }
    
    return c.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Change password (authenticated user)
app.post("/make-server-46b247d8/auth/change-password", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { newPassword } = await c.req.json();
    
    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Update password for the authenticated user
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      console.error("Error changing password:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error during password change:", error);
    return c.json({ error: "Failed to change password" }, 500);
  }
});

// Admin: Reset user password directly
app.post("/make-server-46b247d8/auth/admin-reset-password", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: adminError } = await supabase.auth.getUser(token);
    
    if (adminError || !adminUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is admin or developer
    const { data: adminData } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!adminData || !['admin', 'developer'].includes(adminData.role)) {
      return c.json({ error: "Forbidden: Admin or Developer role required" }, 403);
    }

    const { userId, newPassword } = await c.req.json();
    
    if (!userId || !newPassword || newPassword.length < 6) {
      return c.json({ error: "User ID and password (min 6 chars) required" }, 400);
    }

    // Update password for specified user
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error resetting user password:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error during admin password reset:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

// ========== UNITS ==========
app.get("/make-server-46b247d8/units", async (c) => {
  try {
    const { data, error } = await supabase.from('units').select('*');
    if (error) throw error;
    
    // Ensure floors is always an array
    const unitsWithFloors = (data || []).map(unit => ({
      ...unit,
      floors: Array.isArray(unit.floors) ? unit.floors : []
    }));
    
    return c.json(unitsWithFloors);
  } catch (error) {
    console.error("Error fetching units:", error);
    return c.json({ error: "Failed to fetch units" }, 500);
  }
});

app.post("/make-server-46b247d8/units", async (c) => {
  try {
    const newUnit = await c.req.json();
    
    // Ensure floors is an array
    const unitToInsert = {
      ...newUnit,
      floors: Array.isArray(newUnit.floors) ? newUnit.floors : []
    };
    
    const { data, error } = await supabase.from('units').insert(unitToInsert).select().single();
    if (error) throw error;
    
    // Ensure response has floors as array
    const responseData = {
      ...data,
      floors: Array.isArray(data.floors) ? data.floors : []
    };
    
    return c.json(responseData, 201);
  } catch (error) {
    console.error("Error creating unit:", error);
    return c.json({ error: "Failed to create unit" }, 500);
  }
});

app.put("/make-server-46b247d8/units/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    // Ensure floors is an array if it's being updated
    const updatesToApply = {
      ...updates,
      ...(updates.floors !== undefined && { floors: Array.isArray(updates.floors) ? updates.floors : [] })
    };
    
    const { data, error } = await supabase
      .from('units')
      .update(updatesToApply)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    // Ensure response has floors as array
    const responseData = {
      ...data,
      floors: Array.isArray(data.floors) ? data.floors : []
    };
    
    return c.json(responseData);
  } catch (error) {
    console.error("Error updating unit:", error);
    return c.json({ error: "Failed to update unit" }, 500);
  }
});

// ========== CATEGORIES ==========
app.get("/make-server-46b247d8/categories", async (c) => {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

app.post("/make-server-46b247d8/categories", async (c) => {
  try {
    const newCategory = await c.req.json();
    const { data, error } = await supabase.from('categories').insert(newCategory).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({ error: "Failed to create category" }, 500);
  }
});

// ========== ITEMS ==========
app.get("/make-server-46b247d8/items", async (c) => {
  try {
    const { data, error } = await supabase.from('items').select('*');
    if (error) throw error;
    console.log(`✅ Retornando ${data?.length || 0} items`);
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching items:", error);
    return c.json({ error: "Failed to fetch items" }, 500);
  }
});

app.post("/make-server-46b247d8/items", async (c) => {
  try {
    const newItem = await c.req.json();
    const { data, error } = await supabase.from('items').insert(newItem).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating item:", error);
    return c.json({ error: "Failed to create item" }, 500);
  }
});

app.put("/make-server-46b247d8/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating item:", error);
    return c.json({ error: "Failed to update item" }, 500);
  }
});

// ========== UNIT STOCKS ==========
app.get("/make-server-46b247d8/unit-stocks", async (c) => {
  try {
    console.log('📦 GET /unit-stocks - Buscando todos os stocks...');
    const { data, error } = await supabase.from('unit_stocks').select('*');
    if (error) throw error;
    
    // Transformar snake_case para camelCase
    const transformedData = (data || []).map(stock => ({
      id: stock.id,
      itemId: stock.item_id,
      unitId: stock.unit_id,
      quantity: stock.quantity,
      minimumQuantity: stock.minimum_quantity,
      location: stock.location,
    }));
    
    console.log(`✅ Retornando ${transformedData.length} stocks transformados`);
    console.log('📦 Exemplo de stock transformado:', transformedData[0]);
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching unit stocks:", error);
    return c.json({ error: "Failed to fetch unit stocks" }, 500);
  }
});

app.post("/make-server-46b247d8/unit-stocks", async (c) => {
  try {
    const newStock = await c.req.json();
    
    console.log('📦 Criando novo stock:', newStock);
    
    // Transformar camelCase para snake_case antes de inserir
    const dbStock = {
      item_id: newStock.itemId,
      unit_id: newStock.unitId,
      quantity: newStock.quantity,
      minimum_quantity: newStock.minimumQuantity,
      location: newStock.location,
    };
    
    console.log('📦 Stock no formato DB:', dbStock);
    
    const { data, error } = await supabase.from('unit_stocks').insert(dbStock).select().single();
    if (error) {
      console.error('❌ Erro do Supabase ao inserir stock:', error);
      throw error;
    }
    
    console.log('✅ Stock criado com sucesso:', data);
    
    // Transformar de volta para camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      unitId: data.unit_id,
      quantity: data.quantity,
      minimumQuantity: data.minimum_quantity,
      location: data.location,
    };
    
    return c.json(transformedData, 201);
  } catch (error) {
    console.error("❌ Error creating unit stock:", error);
    return c.json({ 
      error: "Failed to create unit stock",
      details: error.message || String(error)
    }, 500);
  }
});

app.put("/make-server-46b247d8/unit-stocks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Transformar camelCase para snake_case antes de atualizar
    const dbUpdates: any = {};
    if (updates.itemId !== undefined) dbUpdates.item_id = updates.itemId;
    if (updates.unitId !== undefined) dbUpdates.unit_id = updates.unitId;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.minimumQuantity !== undefined) dbUpdates.minimum_quantity = updates.minimumQuantity;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    
    const { data, error } = await supabase.from('unit_stocks').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    // Transformar de volta para camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      unitId: data.unit_id,
      quantity: data.quantity,
      minimumQuantity: data.minimum_quantity,
      location: data.location,
    };
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error updating unit stock:", error);
    return c.json({ error: "Failed to update unit stock" }, 500);
  }
});

// ========== REQUESTS ==========
app.get("/make-server-46b247d8/requests", async (c) => {
  try {
    const { data, error } = await supabase.from('requests').select('*');
    if (error) throw error;
    
    // Transform snake_case to camelCase for frontend
    const transformedData = (data || []).map((row: any) => ({
      id: row.id,
      itemId: row.item_id,
      requestingUnitId: row.requesting_unit_id,
      requestedByUserId: row.requested_by_user_id,
      quantity: row.quantity,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      approvedByUserId: row.approved_by_user_id,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      pickupReadyByUserId: row.pickup_ready_by_user_id,
      pickupReadyAt: row.pickup_ready_at ? new Date(row.pickup_ready_at) : undefined,
      pickedUpByUserId: row.picked_up_by_user_id,
      pickedUpAt: row.picked_up_at ? new Date(row.picked_up_at) : undefined,
      completedByUserId: row.completed_by_user_id,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      rejectedReason: row.rejected_reason,
      observations: row.observations,
      urgency: row.urgency,
    }));
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return c.json({ error: "Failed to fetch requests" }, 500);
  }
});

app.post("/make-server-46b247d8/requests", async (c) => {
  try {
    const requestData = await c.req.json();
    console.log("📝 Creating new request - RAW DATA:", JSON.stringify(requestData, null, 2));
    
    // Transform camelCase to snake_case for database
    const dbRequest = {
      item_id: requestData.itemId,
      requesting_unit_id: requestData.requestingUnitId,
      requested_by_user_id: requestData.requestedByUserId,
      quantity: requestData.quantity,
      status: requestData.status || 'pending',
      urgency: requestData.urgency || 'medium',
      observations: requestData.observations,
      // Don't send created_at or updated_at - database will auto-generate
    };
    
    console.log("📝 Transformed to snake_case for DB:", JSON.stringify(dbRequest, null, 2));
    
    const { data, error } = await supabase.from('requests').insert(dbRequest).select().single();
    
    if (error) {
      console.error("❌ Supabase error creating request:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log("✅ Request created successfully in DB:", data.id);
    
    // Transform response back to camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      requestingUnitId: data.requesting_unit_id,
      requestedByUserId: data.requested_by_user_id,
      quantity: data.quantity,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      approvedByUserId: data.approved_by_user_id,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      pickupReadyByUserId: data.pickup_ready_by_user_id,
      pickupReadyAt: data.pickup_ready_at ? new Date(data.pickup_ready_at) : undefined,
      pickedUpByUserId: data.picked_up_by_user_id,
      pickedUpAt: data.picked_up_at ? new Date(data.picked_up_at) : undefined,
      completedByUserId: data.completed_by_user_id,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      rejectedReason: data.rejected_reason,
      observations: data.observations,
      urgency: data.urgency,
    };
    
    console.log("✅ Returning transformed request to frontend:", transformedData.id);
    return c.json(transformedData, 201);
  } catch (error) {
    console.error("❌ Error creating request:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    return c.json({ 
      error: "Failed to create request",
      details: error.message,
      hint: error.hint || "Check server logs for more details"
    }, 500);
  }
});

app.put("/make-server-46b247d8/requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Transform camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.itemId !== undefined) dbUpdates.item_id = updates.itemId;
    if (updates.requestingUnitId !== undefined) dbUpdates.requesting_unit_id = updates.requestingUnitId;
    if (updates.requestedByUserId !== undefined) dbUpdates.requested_by_user_id = updates.requestedByUserId;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
    if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
    if (updates.approvedByUserId !== undefined) dbUpdates.approved_by_user_id = updates.approvedByUserId;
    if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
    if (updates.pickupReadyByUserId !== undefined) dbUpdates.pickup_ready_by_user_id = updates.pickupReadyByUserId;
    if (updates.pickupReadyAt !== undefined) dbUpdates.pickup_ready_at = updates.pickupReadyAt;
    if (updates.pickedUpByUserId !== undefined) dbUpdates.picked_up_by_user_id = updates.pickedUpByUserId;
    if (updates.pickedUpAt !== undefined) dbUpdates.picked_up_at = updates.pickedUpAt;
    if (updates.completedByUserId !== undefined) dbUpdates.completed_by_user_id = updates.completedByUserId;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    if (updates.rejectedReason !== undefined) dbUpdates.rejected_reason = updates.rejectedReason;
    
    const { data, error } = await supabase.from('requests').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    // Transform response back to camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      requestingUnitId: data.requesting_unit_id,
      requestedByUserId: data.requested_by_user_id,
      quantity: data.quantity,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      approvedByUserId: data.approved_by_user_id,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      pickupReadyByUserId: data.pickup_ready_by_user_id,
      pickupReadyAt: data.pickup_ready_at ? new Date(data.pickup_ready_at) : undefined,
      pickedUpByUserId: data.picked_up_by_user_id,
      pickedUpAt: data.picked_up_at ? new Date(data.picked_up_at) : undefined,
      completedByUserId: data.completed_by_user_id,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      rejectedReason: data.rejected_reason,
      observations: data.observations,
      urgency: data.urgency,
    };
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error updating request:", error);
    return c.json({ error: "Failed to update request" }, 500);
  }
});

// ========== MOVEMENTS ==========
app.get("/make-server-46b247d8/movements", async (c) => {
  try {
    console.log('📝 GET /movements - Buscando todos os movements...');
    const { data, error } = await supabase.from('simple_movements').select('*');
    if (error) throw error;
    
    // Map database columns to frontend fields
    const mappedData = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      itemId: row.item_id,
      unitId: row.unit_id,
      userId: row.user_id,
      quantity: row.quantity,
      timestamp: new Date(row.timestamp),
      notes: row.notes,
      createdAt: new Date(row.created_at),
    }));
    
    console.log(`✅ Retornando ${mappedData.length} movements`);
    return c.json(mappedData);
  } catch (error) {
    console.error("Error fetching movements:", error);
    return c.json({ error: "Failed to fetch movements" }, 500);
  }
});

/**
 * POST /movements
 * Cria um movimento de estoque e atualiza a quantidade correspondente
 * 
 * Tipos de movimento:
 * - ENTRADA (aumenta estoque): 'entry', 'return'
 * - SAÍDA (diminui estoque): 'consumption', 'loan'
 * 
 * Fluxo:
 * 1. Buscar ou criar unit_stock para item+unidade
 * 2. Calcular nova quantidade baseado no tipo de movimento
 * 3. Validar que não fique negativo
 * 4. Atualizar unit_stock
 * 5. Registrar movimento no histórico
 */
app.post("/make-server-46b247d8/movements", async (c) => {
  try {
    const newMovement = await c.req.json();
    console.log('📥 Recebido movimento:', JSON.stringify(newMovement, null, 2));
    
    // 1. Verificar se existe unit_stock para este item+unidade
    let { data: existingStock, error: findError } = await supabase
      .from('unit_stocks')
      .select('*')
      .eq('item_id', newMovement.itemId)
      .eq('unit_id', newMovement.unitId)
      .maybeSingle();
    
    if (findError) {
      console.error('❌ Erro ao buscar stock:', findError);
    }
    
    // 2. Se não existir, criar com quantidade 0
    if (!existingStock) {
      const { data: newStock, error: createStockError } = await supabase
        .from('unit_stocks')
        .insert({
          item_id: newMovement.itemId,
          unit_id: newMovement.unitId,
          quantity: 0,
          minimum_quantity: 0,
          location: ''
        })
        .select()
        .single();
      
      if (createStockError) {
        console.error('❌ Erro ao criar stock:', createStockError);
        return c.json({ error: 'Erro ao criar estoque', details: createStockError.message }, 500);
      }
      
      existingStock = newStock;
    }
    
    // 3. Calcular nova quantidade
    const currentQuantity = existingStock.quantity || 0;
    // Tipos de ENTRADA (soma): 'entry', 'return'
    // Tipos de SAÍDA (subtrai): 'consumption', 'loan'
    const isAddition = newMovement.type === 'entry' || newMovement.type === 'return';
    const quantityChange = isAddition ? newMovement.quantity : -newMovement.quantity;
    const newQuantity = currentQuantity + quantityChange;
    
    console.log('📊 Calculando nova quantidade:');
    console.log('   ├─ Quantidade ATUAL:', currentQuantity);
    console.log('   ├─ Tipo de movimento:', newMovement.type);
    console.log('   ├─ É adição?:', isAddition);
    console.log('   ├─ Mudança:', quantityChange);
    console.log('   └─ Quantidade NOVA:', newQuantity);
    
    // Validar quantidade negativa
    if (newQuantity < 0) {
      console.error('❌ ESTOQUE INSUFICIENTE!');
      return c.json({ 
        error: 'Estoque insuficiente', 
        details: `Não é possível realizar esta operação. Estoque atual: ${currentQuantity}, quantidade solicitada: ${newMovement.quantity}` 
      }, 400);
    }
    
    // 4. Atualizar a quantidade no unit_stock ANTES de criar o movimento
    const { error: updateError, data: updatedStock } = await supabase
      .from('unit_stocks')
      .update({ quantity: newQuantity })
      .eq('item_id', newMovement.itemId)
      .eq('unit_id', newMovement.unitId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar estoque:', updateError);
      return c.json({ error: 'Erro ao atualizar estoque', details: updateError.message }, 500);
    }
    
    console.log('✅ Stock atualizado:', JSON.stringify(updatedStock, null, 2));
    
    // 5. Criar o movimento
    const dbMovement = {
      type: newMovement.type,
      item_id: newMovement.itemId,
      unit_id: newMovement.unitId,
      user_id: newMovement.userId,
      quantity: newMovement.quantity,
      timestamp: newMovement.timestamp || new Date().toISOString(),
      notes: newMovement.notes || null,
    };
    
    const { data, error } = await supabase.from('simple_movements').insert(dbMovement).select().single();
    
    if (error) {
      console.error("❌ Erro ao criar movimento:", error);
      return c.json({ error: "Failed to create movement", details: error.message }, 500);
    }
    
    console.log('✅ Movimento criado e estoque atualizado');
    
    return c.json({
      id: data.id,
      type: data.type,
      itemId: data.item_id,
      unitId: data.unit_id,
      userId: data.user_id,
      quantity: data.quantity,
      timestamp: new Date(data.timestamp),
      notes: data.notes,
      createdAt: new Date(data.created_at),
    }, 201);
  } catch (error) {
    console.error("❌ Erro ao criar movimento:", error);
    return c.json({ error: "Failed to create movement" }, 500);
  }
});

// ========== LOANS ==========
app.get("/make-server-46b247d8/loans", async (c) => {
  try {
    const { data, error } = await supabase.from('loans').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching loans:", error);
    return c.json({ error: "Failed to fetch loans" }, 500);
  }
});

app.post("/make-server-46b247d8/loans", async (c) => {
  try {
    const newLoan = await c.req.json();
    const { data, error } = await supabase.from('loans').insert(newLoan).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating loan:", error);
    return c.json({ error: "Failed to create loan" }, 500);
  }
});

app.put("/make-server-46b247d8/loans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('loans').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating loan:", error);
    return c.json({ error: "Failed to update loan" }, 500);
  }
});

// ========== FURNITURE TRANSFERS ==========
app.get("/make-server-46b247d8/furniture-transfers", async (c) => {
  try {
    const { data, error } = await supabase.from('furniture_transfers').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching furniture transfers:", error);
    return c.json({ error: "Failed to fetch furniture transfers" }, 500);
  }
});

app.post("/make-server-46b247d8/furniture-transfers", async (c) => {
  try {
    const newTransfer = await c.req.json();
    const { data, error } = await supabase.from('furniture_transfers').insert(newTransfer).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating furniture transfer:", error);
    return c.json({ error: "Failed to create furniture transfer" }, 500);
  }
});

app.put("/make-server-46b247d8/furniture-transfers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('furniture_transfers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating furniture transfer:", error);
    return c.json({ error: "Failed to update furniture transfer" }, 500);
  }
});

// ========== FURNITURE REMOVAL REQUESTS ==========
app.get("/make-server-46b247d8/furniture-removal-requests", async (c) => {
  try {
    const { data, error } = await supabase.from('furniture_removal_requests').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching furniture removal requests:", error);
    return c.json({ error: "Failed to fetch furniture removal requests" }, 500);
  }
});

app.post("/make-server-46b247d8/furniture-removal-requests", async (c) => {
  try {
    const newRequest = await c.req.json();
    const { data, error } = await supabase.from('furniture_removal_requests').insert(newRequest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating furniture removal request:", error);
    return c.json({ error: "Failed to create furniture removal request" }, 500);
  }
});

app.put("/make-server-46b247d8/furniture-removal-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('furniture_removal_requests').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating furniture removal request:", error);
    return c.json({ error: "Failed to update furniture removal request" }, 500);
  }
});

// ========== FURNITURE REQUESTS TO DESIGNER ==========
app.get("/make-server-46b247d8/furniture-requests-to-designer", async (c) => {
  try {
    const { data, error } = await supabase.from('furniture_requests_to_designer').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching furniture requests to designer:", error);
    return c.json({ error: "Failed to fetch furniture requests to designer" }, 500);
  }
});

app.post("/make-server-46b247d8/furniture-requests-to-designer", async (c) => {
  try {
    const newRequest = await c.req.json();
    const { data, error } = await supabase.from('furniture_requests_to_designer').insert(newRequest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating furniture request to designer:", error);
    return c.json({ error: "Failed to create furniture request to designer" }, 500);
  }
});

app.put("/make-server-46b247d8/furniture-requests-to-designer/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('furniture_requests_to_designer').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating furniture request to designer:", error);
    return c.json({ error: "Failed to update furniture request to designer" }, 500);
  }
});

// ========== UNIQUE PRODUCT INSTANCES ==========
app.get("/make-server-46b247d8/individual-items", async (c) => {
  try {
    const { data, error } = await supabase.from('unique_product_instances').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching individual items:", error);
    return c.json({ error: "Failed to fetch individual items" }, 500);
  }
});

app.post("/make-server-46b247d8/individual-items", async (c) => {
  try {
    const newItem = await c.req.json();
    const { data, error } = await supabase.from('unique_product_instances').insert(newItem).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating individual item:", error);
    return c.json({ error: "Failed to create individual item" }, 500);
  }
});

app.put("/make-server-46b247d8/individual-items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('unique_product_instances').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating individual item:", error);
    return c.json({ error: "Failed to update individual item" }, 500);
  }
});

// ========== DELIVERY BATCHES ==========
app.get("/make-server-46b247d8/delivery-batches", async (c) => {
  try {
    const { data, error } = await supabase
      .from("delivery_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Convert dates from strings to Date objects
    const batches = data.map(batch => ({
      ...batch,
      requestIds: batch.request_ids || [],
      furnitureRequestIds: batch.furniture_request_ids || [],
      targetUnitId: batch.target_unit_id,
      driverUserId: batch.driver_user_id,
      qrCode: batch.qr_code,
      createdAt: new Date(batch.created_at),
      dispatchedAt: batch.dispatched_at ? new Date(batch.dispatched_at) : undefined,
      deliveryConfirmedAt: batch.delivery_confirmed_at ? new Date(batch.delivery_confirmed_at) : undefined,
      receivedConfirmedAt: batch.received_confirmed_at ? new Date(batch.received_confirmed_at) : undefined,
      completedAt: batch.completed_at ? new Date(batch.completed_at) : undefined,
      confirmedByRequesterAt: batch.confirmed_by_requester_at ? new Date(batch.confirmed_by_requester_at) : undefined,
    }));

    return c.json(batches);
  } catch (error) {
    console.error("Error fetching delivery batches:", error);
    return c.json({ error: "Failed to fetch delivery batches" }, 500);
  }
});

app.post("/make-server-46b247d8/delivery-batches", async (c) => {
  try {
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from("delivery_batches")
      .insert({
        id: body.id,
        request_ids: body.requestIds,
        furniture_request_ids: body.furnitureRequestIds || [],
        target_unit_id: body.targetUnitId,
        driver_user_id: body.driverUserId,
        qr_code: body.qrCode,
        status: body.status || 'pending',
        created_at: body.createdAt || new Date().toISOString(),
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error("Error creating delivery batch:", error);
    return c.json({ error: "Failed to create delivery batch" }, 500);
  }
});

app.put("/make-server-46b247d8/delivery-batches/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Primeiro, tenta buscar o lote existente
    const { data: existing } = await supabase
      .from("delivery_batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      // Se não existe, cria um novo (migração automática do localStorage)
      console.log(`⚠️ Lote ${id} não encontrado, criando automaticamente...`);
      
      const { data: created, error: createError } = await supabase
        .from("delivery_batches")
        .insert({
          id: id,
          request_ids: body.requestIds || [],
          furniture_request_ids: body.furnitureRequestIds || [],
          target_unit_id: body.targetUnitId || '',
          driver_user_id: body.driverUserId || '',
          qr_code: body.qrCode || id,
          status: body.status || 'pending',
          created_at: body.createdAt || new Date().toISOString(),
          notes: body.notes,
          dispatched_at: body.dispatchedAt,
          delivery_confirmed_at: body.deliveryConfirmedAt,
          received_confirmed_at: body.receivedConfirmedAt,
          completed_at: body.completedAt,
          confirmed_by_requester_at: body.confirmedByRequesterAt,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating delivery batch on-the-fly:", createError);
        throw createError;
      }
      
      console.log(`✅ Lote ${id} criado automaticamente durante update`);
      return c.json(created);
    }

    // Se existe, atualiza normalmente
    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.dispatchedAt !== undefined) updates.dispatched_at = body.dispatchedAt;
    if (body.deliveryConfirmedAt !== undefined) updates.delivery_confirmed_at = body.deliveryConfirmedAt;
    if (body.receivedConfirmedAt !== undefined) updates.received_confirmed_at = body.receivedConfirmedAt;
    if (body.completedAt !== undefined) updates.completed_at = body.completedAt;
    if (body.confirmedByRequesterAt !== undefined) updates.confirmed_by_requester_at = body.confirmedByRequesterAt;

    const { data, error } = await supabase
      .from("delivery_batches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ Lote ${id} atualizado: status=${body.status}`);
    return c.json(data);
  } catch (error) {
    console.error("Error updating delivery batch:", error);
    return c.json({ error: "Failed to update delivery batch", details: error }, 500);
  }
});

// ========== DELIVERY CONFIRMATIONS ==========
app.get("/make-server-46b247d8/delivery-confirmations", async (c) => {
  try {
    const { data, error } = await supabase
      .from("delivery_confirmations")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw error;

    // Convert dates and parse JSON fields
    const confirmations = data.map(conf => ({
      ...conf,
      batchId: conf.batch_id,
      confirmedByUserId: conf.confirmed_by_user_id,
      photoUrl: conf.photo_url,
      timestamp: new Date(conf.timestamp),
      location: conf.location ? JSON.parse(conf.location) : undefined,
    }));

    return c.json(confirmations);
  } catch (error) {
    console.error("Error fetching delivery confirmations:", error);
    return c.json({ error: "Failed to fetch delivery confirmations" }, 500);
  }
});

app.post("/make-server-46b247d8/delivery-confirmations", async (c) => {
  try {
    const body = await c.req.json();
    
    console.log('📦 Criando confirmação de entrega:', body);
    
    const { data, error } = await supabase
      .from("delivery_confirmations")
      .insert({
        id: body.id,
        batch_id: body.batchId,
        type: body.type,
        confirmed_by_user_id: body.confirmedByUserId,
        photo_url: body.photoUrl || '',
        timestamp: body.timestamp || new Date().toISOString(),
        location: body.location ? JSON.stringify(body.location) : null,
        signature: body.signature,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro do Supabase ao criar confirmação:', error);
      throw error;
    }
    
    console.log('✅ Confirmação criada com sucesso:', data);
    return c.json(data);
  } catch (error) {
    console.error("❌ Error creating delivery confirmation:", error);
    return c.json({ 
      error: "Failed to create delivery confirmation", 
      details: error.message || error 
    }, 500);
  }
});

// ========== IMAGE UPLOAD ==========
// Create bucket on first upload if it doesn't exist
const ensureBucketExists = async () => {
  const bucketName = 'make-46b247d8-items';
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make bucket public so images are accessible
    });
    if (error) {
      console.error('Error creating bucket:', error);
      throw error;
    }
  }
  return bucketName;
};

app.post("/make-server-46b247d8/upload-image", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Ensure bucket exists
    const bucketName = await ensureBucketExists();

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `items/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return c.json({ url: publicUrl }, 201);
  } catch (error) {
    console.error('Error in upload-image:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

Deno.serve(app.fetch);