import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://adxyxtqulbdwpfnjpvrc.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function backfill() {
  console.log("Starting backfill for user roles and profiles...");

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} users in auth.users`);

  for (const user of users) {
    const existingRole = user.user_metadata?.role || user.app_metadata?.role;
    const roleToSet = existingRole || 'customer';

    // Update user metadata if role missing
    if (!user.user_metadata?.role) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, role: roleToSet },
      });
      if (updateError) {
        console.error(`Failed to update metadata for user ${user.id}:`, updateError.message);
      } else {
        console.log(`Set user_metadata.role = '${roleToSet}' for ${user.email}`);
      }
    }

    // Upsert into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role: roleToSet,
        phone: user.phone || user.user_metadata?.phone || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn(`Could not upsert profile for ${user.email} (table might not exist yet if migration not applied):`, profileError.message);
    } else {
      console.log(`Upserted profile for ${user.email}`);
    }
  }

  console.log("Backfill completed!");
}

backfill();
