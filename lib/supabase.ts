import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para o TypeScript
export interface Meeting {
  id: string;
  date: string;
  presentations: number;
  actions: number;
  completed: number;
  pending: number;
  csv_data?: string;
  created_at?: string;
}
```

### **5️⃣ Fazer o commit**

Role para baixo até o final da página onde tem:
- **Commit new file**
- Um campo de texto para a mensagem do commit
- Digite: `Adicionar configuração Supabase`
- Clique no botão verde **"Commit new file"**

---

## 🎯 **Resumo visual:**
```
1. Clicar em "Add file" → "Create new file"
2. Digitar: lib/supabase.ts
3. Colar o código
4. Commit: "Adicionar configuração Supabase"
