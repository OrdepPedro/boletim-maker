import { createClient } from '@supabase/supabase-js';

// Substitua estas strings pelos valores que você copiou do painel do Supabase
const supabaseUrl = 'https://zybfzuoqhcuiaymjfwvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZ6dW9xaGN1aWF5bWpmd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTEyNTUsImV4cCI6MjA4Mjg4NzI1NX0.26e2NlQDGd6qcX4LtHScd0Xoe-hir7GmBViDc9GofRE';

export const supabase = createClient(supabaseUrl, supabaseKey);