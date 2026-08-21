import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
    return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleted() {
    const { data, error } = await supabase
      .from("orders")
      .update({
          status: "completed",
          completed_at: new Date().toISOString()
      })
      .eq("id", "e397bc5f-8b66-428c-a18d-63d91a85fbe2")
      .select();

    if (error) {
        console.error("Error updating completed:", error.message);
    } else {
        console.log("Success completed!");
    }
}

testCompleted();
