import { createClient } from '@supabase/supabase-js';

// 1. Pega os valores das variáveis de ambiente (do arquivo .env.local)
const supabaseUrl = import.meta.env.zybfzuoqhcuiaymjfwvi.supabase.co;
const supabaseKey = import.meta.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZ6dW9xaGN1aWF5bWpmd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTEyNTUsImV4cCI6MjA4Mjg4NzI1NX0.26e2NlQDGd6qcX4LtHScd0Xoe-hir7GmBViDc9GofRE;

// 2. Verificação de Segurança (Opcional, mas recomendada)
// Isso evita que o app tente rodar "quebrado" se você esquecer de configurar
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Erro: As variáveis de ambiente do Supabase não foram encontradas. ' +
    'Verifique se você criou o arquivo .env.local na raiz do projeto.'
  );
}

// 3. Cria e exporta a conexão
export const supabase = createClient(supabaseUrl, supabaseKey);