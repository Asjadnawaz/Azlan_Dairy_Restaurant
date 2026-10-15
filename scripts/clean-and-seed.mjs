import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envFile = fs.readFileSync(path.resolve(".env.local"), "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

import("../src/data/menu/index.ts").then(async (mod) => {
  const items = mod.MENU_ITEMS;
  console.log(`Starting clean sync of ${items.length} items...`);

  // Delete all old rows from items table
  const { error: delError } = await supabase
    .from("items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all

  if (delError) {
    console.error("Delete error:", delError);
  } else {
    console.log("Cleared old items table entries.");
  }

  const formatted = items.map((item) => {
    const copy = { ...item };
    delete copy.id;
    return copy;
  });

  const { data, error: insertError } = await supabase
    .from("items")
    .insert(formatted)
    .select();

  if (insertError) {
    console.error("Insert error:", insertError);
    process.exit(1);
  }

  console.log(`Successfully inserted ${data?.length} fresh clean items into Supabase!`);
  console.log("Categories:", [...new Set(data?.map(i => i.category))]);
  process.exit(0);
}).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
