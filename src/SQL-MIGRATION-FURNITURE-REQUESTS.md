# SQL Migration - Tabela furniture_requests_to_designer

Execute este SQL no **Supabase SQL Editor**:

```sql
-- Criar tabela furniture_requests_to_designer
CREATE TABLE IF NOT EXISTS furniture_requests_to_designer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  requesting_unit_id UUID NOT NULL,
  floor_id UUID,
  requested_by_user_id UUID NOT NULL,
  approved_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_status_valid CHECK (status IN (
    'pending',
    'approved', 
    'rejected',
    'processing',
    'awaiting_pickup',
    'in_transit',
    'delivered',
    'awaiting_confirmation'
  ))
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_furniture_requests_to_designer_status 
  ON furniture_requests_to_designer(status);
  
CREATE INDEX IF NOT EXISTS idx_furniture_requests_to_designer_requesting_unit 
  ON furniture_requests_to_designer(requesting_unit_id);
  
CREATE INDEX IF NOT EXISTS idx_furniture_requests_to_designer_requested_by 
  ON furniture_requests_to_designer(requested_by_user_id);
  
CREATE INDEX IF NOT EXISTS idx_furniture_requests_to_designer_created_at 
  ON furniture_requests_to_designer(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE furniture_requests_to_designer IS 'Solicitações de móveis feitas ao designer para aprovação';
COMMENT ON COLUMN furniture_requests_to_designer.item_id IS 'ID do móvel solicitado';
COMMENT ON COLUMN furniture_requests_to_designer.quantity IS 'Quantidade solicitada';
COMMENT ON COLUMN furniture_requests_to_designer.requesting_unit_id IS 'Unidade que está solicitando';
COMMENT ON COLUMN furniture_requests_to_designer.floor_id IS 'Andar de destino na unidade';
COMMENT ON COLUMN furniture_requests_to_designer.requested_by_user_id IS 'Usuário que fez a solicitação';
COMMENT ON COLUMN furniture_requests_to_designer.approved_by_user_id IS 'Designer que aprovou/rejeitou';
COMMENT ON COLUMN furniture_requests_to_designer.status IS 'Status da solicitação';
COMMENT ON COLUMN furniture_requests_to_designer.rejection_reason IS 'Motivo da rejeição (se aplicável)';
COMMENT ON COLUMN furniture_requests_to_designer.qr_code IS 'QR Code para entrega/rastreamento';
COMMENT ON COLUMN furniture_requests_to_designer.created_at IS 'Data de criação da solicitação';
COMMENT ON COLUMN furniture_requests_to_designer.approved_at IS 'Data de aprovação/rejeição';
COMMENT ON COLUMN furniture_requests_to_designer.delivered_at IS 'Data de entrega';
```

## ✅ Após executar o SQL:

1. Verifique se a tabela foi criada:
```sql
SELECT * FROM furniture_requests_to_designer LIMIT 1;
```

2. Verifique as colunas:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'furniture_requests_to_designer'
ORDER BY ordinal_position;
```

## 🔄 Se a tabela já existe mas está com erro:

Execute este SQL para adicionar a coluna qr_code:
```sql
ALTER TABLE furniture_requests_to_designer 
ADD COLUMN IF NOT EXISTS qr_code TEXT;
```

## 📊 Status válidos:

- `pending` - Aguardando aprovação do designer
- `approved` - Aprovado pelo designer
- `rejected` - Rejeitado pelo designer
- `processing` - Em preparação (almoxarifado)
- `awaiting_pickup` - Aguardando coleta
- `in_transit` - Em trânsito (motorista)
- `delivered` - Entregue
- `awaiting_confirmation` - Aguardando confirmação manual

## 🗑️ Se precisar recriar do zero:

```sql
-- CUIDADO: Isso apaga todos os dados!
DROP TABLE IF EXISTS furniture_requests_to_designer CASCADE;

-- Depois execute o CREATE TABLE acima
```
