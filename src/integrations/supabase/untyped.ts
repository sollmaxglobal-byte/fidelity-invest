/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./client";

/**
 * Escape hatch for tables / RPCs that are not present in the generated types yet.
 * Use sparingly — prefer the typed `supabase` client.
 */
export const dbUntyped = supabase as any;
