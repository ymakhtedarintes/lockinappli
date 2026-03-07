import { supabase } from "./supabase";

// These mirror the old lget/lset API but hit Supabase instead.
// All data is stored as key-value pairs scoped to the logged-in user.

export async function dbGet(key) {
  const { data, error } = await supabase
    .from("user_data")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  return data.value;
}

export async function dbSet(key, value) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_data")
    .upsert({ user_id: user.id, key, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
}
