import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

import("../src/data/menu-data.ts").then(async (mod) => {
  const items = mod.MENU_ITEMS;
  console.log(`Found ${items.length} items to sync into Supabase...`);

  const formatted = items.map((item) => {
    const copy = { ...item };
    delete copy.id;
    return copy;
  });

  const { data, error } = await supabase
    .from("items")
    .upsert(formatted, { onConflict: "slug" })
    .select();

  if (error) {
    console.error("Failed to sync items:", error);
    process.exit(1);
  }

  console.log(`Successfully synced ${data?.length} items into Supabase!`);
  process.exit(0);
}).catch((err) => {
  console.error("Failed loading menu data:", err);
  process.exit(1);
});
