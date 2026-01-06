# 🚀 Instruções Rápidas - Criar Tabela no Supabase

## ❌ Erro Atual:
```
Could not find the 'qr_code' column of 'furniture_requests_to_designer' in the schema cache
```

## ✅ Solução em 3 Passos:

### **Passo 1:** Acesse o Supabase Dashboard
1. Abra seu projeto no Supabase
2. No menu lateral, clique em **"SQL Editor"**
3. Clique em **"New Query"**

### **Passo 2:** Cole o SQL
1. Abra o arquivo `/CRIAR-TABELA-AQUI.sql`
2. **Copie TODO o conteúdo**
3. **Cole** no SQL Editor do Supabase

### **Passo 3:** Execute
1. Clique no botão **"Run"** (ou pressione `Ctrl + Enter`)
2. Aguarde a mensagem de sucesso ✅
3. Pronto! Tabela criada.

---

## 🔍 Verificar se funcionou:

Execute este SQL no SQL Editor:
```sql
SELECT * FROM furniture_requests_to_designer LIMIT 1;
```

Se retornar uma tabela vazia (sem erro), está funcionando! ✅

---

## 📊 Estrutura da Tabela Criada:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único (auto-gerado) |
| `item_id` | UUID | Móvel solicitado |
| `quantity` | INTEGER | Quantidade |
| `requesting_unit_id` | UUID | Unidade solicitante |
| `floor_id` | UUID | Andar destino |
| `requested_by_user_id` | UUID | Quem solicitou |
| `approved_by_user_id` | UUID | Designer que aprovou |
| `status` | TEXT | Status da solicitação |
| `rejection_reason` | TEXT | Motivo da rejeição |
| `qr_code` | TEXT | **⬅️ Campo que estava faltando** |
| `created_at` | TIMESTAMP | Data de criação |
| `approved_at` | TIMESTAMP | Data de aprovação |
| `delivered_at` | TIMESTAMP | Data de entrega |

---

## 🎯 Status Possíveis:

- ✅ `pending` - Aguardando aprovação
- ✅ `approved` - Aprovado pelo designer
- ✅ `rejected` - Rejeitado
- ✅ `processing` - Em preparação
- ✅ `awaiting_pickup` - Aguardando coleta
- ✅ `in_transit` - Em trânsito
- ✅ `delivered` - Entregue
- ✅ `awaiting_confirmation` - Aguardando confirmação

---

## ⚠️ Se a tabela já existe:

Execute apenas este SQL para adicionar a coluna faltante:
```sql
ALTER TABLE furniture_requests_to_designer 
ADD COLUMN IF NOT EXISTS qr_code TEXT;
```

---

## 🗑️ Para Recriar do Zero (cuidado!):

```sql
-- ⚠️ ISSO APAGA TODOS OS DADOS!
DROP TABLE IF EXISTS furniture_requests_to_designer CASCADE;

-- Depois execute o SQL do arquivo /CRIAR-TABELA-AQUI.sql
```

---

## 📞 Ainda com problemas?

1. Verifique se você tem permissões de administrador no Supabase
2. Certifique-se de estar no projeto correto
3. Tente recarregar o cache do schema:
   - No Supabase: Settings > Database > Reload Schema

---

**Após criar a tabela, teste novamente no sistema! O erro deve desaparecer.** ✅🚀
