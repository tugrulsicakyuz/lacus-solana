import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Determines if an error is transient and should be retried.
 * Transient errors: network timeouts, 5xx server errors, connection issues
 * Permanent errors: 401/403 (auth), 404 (not found), 400/422 (schema/validation)
 */
function isTransientError(error: PostgrestError): boolean {
  // Permanent error codes that should NOT be retried
  const permanentCodes = [
    '401', // Unauthorized
    '403', // Forbidden
    '404', // Not Found
    '400', // Bad Request (schema issues)
    '422', // Unprocessable Entity (validation)
    'PGRST116', // Schema cache error
    '42P01', // Undefined table
    '42703', // Undefined column
    '23505', // Unique violation
    '23503', // Foreign key violation
  ];

  // Check if error code matches permanent errors
  if (error.code && permanentCodes.includes(error.code)) {
    return false;
  }

  // Check error message for schema/auth issues
  const permanentPatterns = [
    /column.*does not exist/i,
    /table.*does not exist/i,
    /permission denied/i,
    /authentication failed/i,
    /invalid.*token/i,
    /schema/i,
  ];

  if (permanentPatterns.some(pattern => pattern.test(error.message))) {
    return false;
  }

  // Network/timeout errors are transient
  const transientPatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /500/,
    /502/,
    /503/,
    /504/,
  ];

  if (transientPatterns.some(pattern => pattern.test(error.message))) {
    return true;
  }

  // Default: assume transient for unknown errors
  return true;
}

/**
 * Retries a Supabase insert up to maxRetries times with exponential backoff.
 * Only retries transient errors (network, 5xx). Does NOT retry permanent errors (auth, schema).
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

    // Check if error is permanent - don't retry
    if (!isTransientError(error)) {
      console.error(`Supabase insert failed with permanent error:`, error.message);
      return { success: false, error: error.message };
    }

    console.warn(`Supabase insert attempt ${attempt}/${maxRetries} failed:`, error.message);
    
    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } else {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Unknown error" };
}

/**
 * Retries a Supabase upsert up to maxRetries times with exponential backoff.
 * Only retries transient errors (network, 5xx). Does NOT retry permanent errors (auth, schema).
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

    // Check if error is permanent - don't retry
    if (!isTransientError(error)) {
      console.error(`Supabase upsert failed with permanent error:`, error.message);
      return { success: false, error: error.message };
    }

    console.warn(`Supabase upsert attempt ${attempt}/${maxRetries} failed:`, error.message);
    
    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } else {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Unknown error" };
}
