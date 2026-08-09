import { createClient } from '@supabase/supabase-js';

const url = "https://adxyxtqulbdwpfnjpvrc.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeHl4dHF1bGJkd3BmbmpwdnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NzY4NjQsImV4cCI6MjEwMDU1Mjg2NH0._TzmJUgwAwCWwG5nQf3cDajrwOIEdBAiWbSKOxhzeWU";

const supabase = createClient(url, key);

async function main() {
  const email = "azlanfastfood@gmail.com";
  const password = "AzlanAdmin123!";

  console.log("Attempting sign in first...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError && signInData.user) {
    console.log("SUCCESS: Account already exists and password is set to:", password);
    return;
  }

  console.log("Sign in result:", signInError ? signInError.message : "Not signed in");
  console.log("Attempting to sign up or create account...");

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "admin",
      },
    },
  });

  if (signUpError) {
    console.error("SignUp error:", signUpError.message);
  } else {
    console.log("SignUp response:", signUpData);
  }
}

main();
