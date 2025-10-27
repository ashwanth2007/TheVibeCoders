import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmpewngjcyykfjkdfakk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcGV3bmdqY3l5a2Zqa2RmYWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcxMzIsImV4cCI6MjA3NjU3MzEzMn0.Qb4Lg47ey5UokstyEqYsW_PGgyJrPkYNfmZvUTLvPWI';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or anonymous key is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
