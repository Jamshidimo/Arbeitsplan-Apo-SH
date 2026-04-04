import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sikqwltnkawwyewjdqoc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpa3F3bHRua2F3d3lld2pkcW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDg0NDMsImV4cCI6MjA5MDg4NDQ0M30.CJb1OjlDwCP8a2uBqrYVzZkEoFUa7SeOwR7anaLG1PI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function cloudLoad<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('app_data')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) return null;
  return data.value as T;
}

export async function cloudSave<T>(key: string, value: T): Promise<void> {
  await supabase
    .from('app_data')
    .upsert(
      { key, value: value as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
}
