import { supabase } from "@/lib/supabase";

/**
 * Retries a Supabase insert up to maxRetries times with exponential backoff.
 * Returns { success: true } or { success: false, error }.
 */
export async function retryInsert(
  table: string,
  payload: Record<string, unknown>,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.from(table).insert([payload]);
    if (!error) return { success: true };
    console.warn(`Supabase insert attempt ${attempt}/${maxRetries} failed:`, error.message);
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    } else {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Unknown error" };
}

/**
 * Retries a Supabase upsert up to maxRetries times with exponential backoff.
 */
export async function retryUpsert(
  table: string,
  payload: Record<string, unknown>,
  maxRetries = 3,
  conflictTarget?: string
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.from(table).upsert(
      [payload],
      conflictTarget ? { onConflict: conflictTarget } : undefined
    );
    if (!error) return { success: true };
    console.warn(`Supabase upsert attempt ${attempt}/${maxRetries} failed:`, error.message);
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    } else {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Unknown error" };
}
