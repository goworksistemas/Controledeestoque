# Gowork - Sistema de Controle de Estoque

## Correção Técnica: Migração de TEXT para UUID

### Problema Identificado
As tabelas `units` e `floors` foram inicialmente criadas com colunas `id` do tipo TEXT ao invés de UUID:
- Isso permitiu que dados antigos fossem salvos com strings simples como 'unit-warehouse', 'unit-1', etc.
- O código frontend gera UUIDs reais com `crypto.randomUUID()`, mas o banco aceitava ambos porque era TEXT
- Isso causava inconsistências e problemas de validação

### Solução Implementada

1. **Atualização do Schema** (`/supabase/functions/server/index.tsx`):
   - Alterado `id TEXT PRIMARY KEY` para `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Aplicado nas tabelas `units` e `floors`
   - Isso garante que novas instalações usem o tipo correto

2. **Endpoint de Migração** (`POST /migrate-text-to-uuid`):
   - Valida se todos os IDs existentes são UUIDs válidos
   - Gera SQL para conversão das colunas TEXT para UUID
   - Fornece instruções para execução manual no Supabase SQL Editor
   
3. **Interface de Migração** (Developer Dashboard):
   - Botão "Validar IDs e Gerar SQL de Migração"
   - Exibe resultado da validação no console
   - Fornece SQL pronto para execução

### Como Executar a Migração (Para Instâncias Existentes)

1. Acesse o Developer Dashboard
2. Vá para a aba "Migração de Dados"
3. Clique em "Validar IDs e Gerar SQL de Migração"
4. Verifique o console do navegador para o SQL gerado
5. Execute o SQL manualmente no Supabase SQL Editor

### SQL de Migração (Executar Manualmente)

```sql
-- Converter coluna id da tabela units
ALTER TABLE units 
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- Converter coluna id e unit_id da tabela floors
ALTER TABLE floors 
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN unit_id TYPE UUID USING unit_id::uuid;

-- Recriar foreign key se necessário
-- ALTER TABLE floors DROP CONSTRAINT IF EXISTS floors_unit_id_fkey;
-- ALTER TABLE floors ADD CONSTRAINT floors_unit_id_fkey 
--   FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
```

### Pré-requisitos para Migração

⚠️ Antes de executar a migração:
1. Execute a migração de unit_stocks primeiro (se necessário)
2. Certifique-se de que todos os IDs são UUIDs válidos (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
3. Faça backup do banco de dados
4. A migração é irreversível

### Notas Técnicas

- UUIDs válidos usam caracteres hexadecimais (0-9, a-f) em lowercase ou uppercase
- O PostgreSQL converte automaticamente para lowercase
- Regex de validação: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Após a migração, o banco rejeitará qualquer tentativa de inserir strings não-UUID
