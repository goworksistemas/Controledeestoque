-- ========================================
-- COPIE E COLE ESTE SQL NO SUPABASE
-- ========================================
-- Acesse: Supabase Dashboard > SQL Editor > New Query
-- Cole este código completo e clique em "Run"

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

-- ========================================
-- PRONTO! Tabela criada com sucesso ✅
-- ========================================
