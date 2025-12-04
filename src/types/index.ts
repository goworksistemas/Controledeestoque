/**
 * GOWORK - Type Definitions
 * 
 * Sistema de tipos TypeScript para toda a aplicação
 */

/**
 * Perfis de usuário:
 * - controller: Controlador com acesso total (Almoxarifado + Admin)
 * - admin: Administrador (gerencia usuários e unidades)
 * - warehouse: Almoxarife (separa e entrega pedidos)
 * - designer: Designer (aprova/rejeita pedidos de móveis)
 * - developer: Developer (gerencia catálogo de itens e categorias)
 * - requester: Solicitante (faz pedidos de materiais)
 */
export type UserRole = 'controller' | 'admin' | 'warehouse' | 'designer' | 'developer' | 'requester';

export type MovementType = 'entrada' | 'saida' | 'emprestimo' | 'devolucao' | 'ajuste';

/**
 * Tipos de movimento de estoque:
 * - entry: Entrada (aumenta estoque)
 * - consumption: Consumo/Saída (diminui estoque)
 * - loan: Empréstimo (diminui estoque)
 * - return: Devolução (aumenta estoque)
 */
export type SimpleMovementType = 'entry' | 'consumption' | 'loan' | 'return';

/**
 * Fluxo de status de pedidos:
 * pending → approved → awaiting_pickup → out_for_delivery → completed
 *        ↓
 *     rejected
 */
export type RequestStatus = 'pending' | 'approved' | 'processing' | 'awaiting_pickup' | 'out_for_delivery' | 'delivery_confirmed' | 'received_confirmed' | 'completed' | 'rejected' | 'cancelled';

export interface Unit {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  floors?: string[]; // Andares disponíveis na unidade
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Item {
  id: string;
  productId?: number; // ID numérico do produto (ex: Cadeado = 1, Cabo HDMI = 2)
  name: string;
  categoryId: string;
  description: string;
  unitOfMeasure: string;
  isConsumable: boolean;
  requiresResponsibilityTerm: boolean;
  defaultLoanDays: number;
  active: boolean;
  serialNumber?: string;
  imageUrl?: string;
  defaultMinimumQuantity?: number;
  brand?: string;
  model?: string;
  isFurniture?: boolean; // Móveis de unidade (não passam pelo almoxarifado)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UnitStock {
  id: string;
  itemId: string;
  unitId: string;
  quantity: number;
  minimumQuantity: number;
  location: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  itemId: string;
  unitId: string;
  quantity: number;
  executorUserId: string;
  approverUserId?: string;
  timestamp: Date;
  reason: string;
  observations?: string;
  documentNumber?: string;
  serviceOrder?: string; // Ordem de serviço para consumos de executores
}

// Simplified movement tracking for modern UI
export interface SimpleMovement {
  id: string;
  type: SimpleMovementType;
  itemId: string;
  unitId: string;
  userId: string; // User who performed the action
  quantity: number;
  timestamp: Date;
  createdAt: Date; // For compatibility
  workOrder?: string; // For consumptions
  borrowerUnitId?: string; // For loans
  notes?: string;
}

export interface Loan {
  id: string;
  itemId: string;
  unitId: string;
  responsibleUserId: string;
  responsibleName?: string; // Nome da pessoa que pegou emprestado (para controle simples)
  withdrawalDate: Date;
  expectedReturnDate: Date;
  returnDate?: Date;
  status: 'active' | 'overdue' | 'returned' | 'lost';
  observations?: string;
  serialNumber?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  primaryUnitId?: string; // Opcional para designers e solicitantes volantes
  additionalUnitIds?: string[];
  warehouseType?: 'storage' | 'delivery'; // Para diferenciar almoxarifado direto de motorista
  jobTitle?: string; // Cargo do usuário (ex: Community Leader, Assistente, etc)
  adminType?: 'units' | 'warehouse'; // Para diferenciar tipo de admin
  dailyCode?: string; // Código único diário para confirmações
  dailyCodeGeneratedAt?: Date; // Timestamp da geração do código
  requirePasswordChange?: boolean; // Usuário deve alterar senha no próximo login
  firstLogin?: boolean; // Indica se é o primeiro acesso do usuário
  resetToken?: string; // Token de recuperação de senha (6 dígitos)
  resetTokenExpiry?: string; // Data de expiração do token de recuperação
}

export interface Request {
  id: string;
  itemId: string;
  requestingUnitId: string;
  requestedByUserId: string;
  quantity: number;
  status: RequestStatus;
  createdAt: Date;
  approvedByUserId?: string;
  approvedAt?: Date;
  pickupReadyByUserId?: string;
  pickupReadyAt?: Date;
  pickedUpByUserId?: string;
  pickedUpAt?: Date;
  completedByUserId?: string;
  completedAt?: Date;
  rejectedReason?: string;
  observations?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface FurnitureTransfer {
  id: string;
  itemId: string;
  fromUnitId: string;
  toUnitId: string;
  requestedByUserId: string;
  approvedByUserId?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdAt: Date;
  completedAt?: Date;
  observations?: string;
}

export interface FurnitureRemovalRequest {
  id: string;
  itemId: string;
  unitId: string;
  requestedByUserId: string;
  quantity: number;
  reason: string;
  status: 'pending' | 'approved_storage' | 'approved_disposal' | 'awaiting_pickup' | 'in_transit' | 'completed' | 'rejected';
  createdAt: Date;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  pickedUpByUserId?: string;
  pickedUpAt?: Date;
  receivedByUserId?: string;
  receivedAt?: Date;
  completedAt?: Date;
  observations?: string;
  disposalJustification?: string; // Justificativa do designer para descarte
}

// Solicitação de móveis do controlador para o designer
export interface FurnitureRequestToDesigner {
  id: string;
  itemId: string; // ID do item de móvel solicitado
  requestingUnitId: string; // Unidade que está solicitando
  requestedByUserId: string; // Controlador que fez a solicitação
  quantity: number;
  location: string; // Onde será colocado na unidade
  justification: string; // Por que precisa do móvel
  status: 'pending_designer' | 'approved_designer' | 'awaiting_delivery' | 'in_transit' | 'completed' | 'rejected';
  createdAt: Date;
  reviewedByDesignerId?: string; // Designer que aprovou/rejeitou
  reviewedAt?: Date;
  assignedToWarehouseUserId?: string; // Almoxarifado/motorista responsável
  assignedAt?: Date;
  deliveredByUserId?: string;
  deliveredAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  observations?: string;
}

// Lote de entregas (múltiplos itens entregues juntos)
export interface DeliveryBatch {
  id: string;
  requestIds: string[]; // IDs das solicitações agrupadas
  furnitureRequestIds?: string[]; // IDs das solicitações de móveis agrupadas
  targetUnitId: string; // Unidade de destino
  driverUserId: string; // Motorista responsável
  qrCode: string; // Código único para confirmação
  status: 'pending' | 'in_transit' | 'delivery_confirmed' | 'received_confirmed' | 'completed' | 'pending_confirmation' | 'confirmed_by_requester';
  createdAt: Date;
  dispatchedAt?: Date;
  deliveryConfirmedAt?: Date;
  receivedConfirmedAt?: Date;
  completedAt?: Date;
  confirmedByRequesterAt?: Date;
  notes?: string;
}

// Confirmação de entrega com foto
export interface DeliveryConfirmation {
  id: string;
  batchId: string; // Referência ao lote
  type: 'delivery' | 'receipt' | 'requester'; // Entrega (motorista), Recebimento (recebedor), ou Confirmação do Solicitante
  confirmedByUserId: string;
  photoUrl: string; // Base64 ou URL da foto
  timestamp: Date;
  location?: { // Geolocalização opcional
    latitude: number;
    longitude: number;
  };
  signature?: string; // Assinatura digital opcional (base64)
  notes?: string;
}