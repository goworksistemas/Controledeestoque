/**
 * GOWORK - App Context
 * 
 * Context principal que gerencia estado global, autenticação, CRUD operations,
 * sistema de códigos diários e confirmação de entregas
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Unit, Item, UnitStock, Movement, SimpleMovement, Loan, Category, Request, FurnitureTransfer, FurnitureRemovalRequest, FurnitureRequestToDesigner, DeliveryBatch, DeliveryConfirmation } from '../types';
import { api } from '../utils/api';
import { generateDailyCode, isDailyCodeValid } from '../utils/dailyCode';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AppContextType {
  currentUser: User | null;
  currentUnit: Unit | null;
  users: User[];
  units: Unit[];
  items: Item[];
  categories: Category[];
  unitStocks: UnitStock[];
  movements: SimpleMovement[];
  loans: Loan[];
  requests: Request[];
  furnitureTransfers: FurnitureTransfer[];
  furnitureRemovalRequests: FurnitureRemovalRequest[];
  furnitureRequestsToDesigner: FurnitureRequestToDesigner[];
  deliveryBatches: DeliveryBatch[];
  deliveryConfirmations: DeliveryConfirmation[];
  isLoading: boolean;
  login: (userId: string) => void;
  logout: () => void;
  setCurrentUnit: (unitId: string) => void;
  addMovement: (movement: Omit<SimpleMovement, 'id' | 'timestamp' | 'createdAt'>) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'withdrawalDate'>) => void;
  updateLoan: (loanId: string, updates: Partial<Loan>) => void;
  updateStock: (stockId: string, quantity: number) => void;
  updateStockWithLocation: (stockId: string, quantity: number, location: string) => void;
  addItemWithStock: (item: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }, unitId: string, quantity: number, location: string) => string;
  addItem: (item: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }) => void;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  addStock: (stock: Omit<UnitStock, 'id'>) => void;
  addRequest: (request: Omit<Request, 'id' | 'createdAt'>) => void;
  updateRequest: (requestId: string, updates: Partial<Request>) => void;
  addFurnitureTransfer: (transfer: Omit<FurnitureTransfer, 'id' | 'createdAt'>) => void;
  updateFurnitureTransfer: (transferId: string, updates: Partial<FurnitureTransfer>) => void;
  addFurnitureRemovalRequest: (request: Omit<FurnitureRemovalRequest, 'id' | 'createdAt'>) => void;
  updateFurnitureRemovalRequest: (requestId: string, updates: Partial<FurnitureRemovalRequest>) => void;
  addFurnitureRequestToDesigner: (request: Omit<FurnitureRequestToDesigner, 'id' | 'createdAt'>) => void;
  updateFurnitureRequestToDesigner: (requestId: string, updates: Partial<FurnitureRequestToDesigner>) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (unitId: string, updates: Partial<Unit>) => void;
  deleteUnit: (unitId: string) => void;
  getAvailableUnits: () => Unit[];
  getWarehouseUnitId: () => string | undefined;
  getStockForItem: (itemId: string, unitId: string) => UnitStock | undefined;
  getItemById: (itemId: string) => Item | undefined;
  getCategoryById: (categoryId: string) => Category | undefined;
  getUnitById: (unitId: string) => Unit | undefined;
  getUserById: (userId: string) => User | undefined;
  createDeliveryBatch: (requestIds: string[], furnitureRequestIds: string[], targetUnitId: string, driverUserId: string) => string;
  confirmDelivery: (batchId: string, confirmation: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>, receiverDailyCode: string) => Promise<void>;
  confirmReceipt: (batchId: string, confirmation: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>) => Promise<void>;
  getDeliveryBatchById: (batchId: string) => DeliveryBatch | undefined;
  getConfirmationsForBatch: (batchId: string) => DeliveryConfirmation[];
  separateItemInBatch: (requestId: string, batchId: string) => Promise<void>;
  getUserDailyCode: (userId: string) => string;
  validateUserDailyCode: (userId: string, code: string) => boolean;
  markDeliveryAsPendingConfirmation: (batchId: string, notes?: string) => Promise<void>;
  confirmDeliveryByRequester: (
    batchId: string, 
    confirmationData: { userId: string; userName: string; notes?: string; dailyCode: string }
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUnit, setCurrentUnitState] = useState<Unit | null>(null);
  const [appUsers, setAppUsers] = useState<User[]>([]);
  const [appUnits, setAppUnits] = useState<Unit[]>([]);
  const [appItems, setAppItems] = useState<Item[]>([]);
  const [appCategories, setAppCategories] = useState<Category[]>([]);
  const [appUnitStocks, setAppUnitStocks] = useState<UnitStock[]>([]);
  const [appMovements, setAppMovements] = useState<SimpleMovement[]>([]);
  const [appLoans, setAppLoans] = useState<Loan[]>([]);
  const [appRequests, setAppRequests] = useState<Request[]>([]);
  const [appFurnitureTransfers, setAppFurnitureTransfers] = useState<FurnitureTransfer[]>([]);
  const [appFurnitureRemovalRequests, setAppFurnitureRemovalRequests] = useState<FurnitureRemovalRequest[]>([]);
  const [appFurnitureRequestsToDesigner, setAppFurnitureRequestsToDesigner] = useState<FurnitureRequestToDesigner[]>([]);
  const [appDeliveryBatches, setAppDeliveryBatches] = useState<DeliveryBatch[]>([]);
  const [appDeliveryConfirmations, setAppDeliveryConfirmations] = useState<DeliveryConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = () => {
      const token = localStorage.getItem('gowork_auth_token');
      const userStr = localStorage.getItem('gowork_current_user');
      
      if (token && userStr) {
        try {
          const storedUser = JSON.parse(userStr);
          console.log('🔄 Restaurando sessão do localStorage:', storedUser.name);
          // Will set currentUser after data is loaded
          localStorage.setItem('gowork_pending_user_id', storedUser.id);
        } catch (error) {
          console.error('❌ Erro ao restaurar sessão:', error);
          localStorage.removeItem('gowork_auth_token');
          localStorage.removeItem('gowork_current_user');
        }
      }
    };

    restoreSession();
  }, []);

  // Fetch all data from backend on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Carregando dados do backend...');
        
        const [
          usersData,
          unitsData,
          categoriesData,
          itemsData,
          unitStocksData,
          movementsData,
          loansData,
          requestsData,
          furnitureTransfersData,
          furnitureRemovalRequestsData,
          furnitureRequestsToDesignerData,
          deliveryBatchesData,
          deliveryConfirmationsData,
        ] = await Promise.all([
          api.users.getAll(),
          api.units.getAll(),
          api.categories.getAll(),
          api.items.getAll(),
          api.unitStocks.getAll(),
          api.movements.getAll(),
          api.loans.getAll(),
          api.requests.getAll(),
          api.furnitureTransfers.getAll(),
          api.furnitureRemovalRequests.getAll(),
          api.furnitureRequestsToDesigner.getAll(),
          api.deliveryBatches.getAll(),
          api.deliveryConfirmations.getAll(),
        ]);

        setAppUsers(usersData || []);
        
        // Ensure units always have floors as array
        const unitsWithFloors = (unitsData || []).map(unit => ({
          ...unit,
          floors: Array.isArray(unit.floors) ? unit.floors : []
        }));
        setAppUnits(unitsWithFloors);
        
        setAppCategories(categoriesData || []);
        setAppItems(itemsData || []);
        setAppUnitStocks(unitStocksData || []);
        setAppMovements(movementsData || []);
        setAppLoans(loansData || []);
        setAppRequests(requestsData || []);
        setAppFurnitureTransfers(furnitureTransfersData || []);
        setAppFurnitureRemovalRequests(furnitureRemovalRequestsData || []);
        setAppFurnitureRequestsToDesigner(furnitureRequestsToDesignerData || []);
        setAppDeliveryBatches(deliveryBatchesData || []);
        setAppDeliveryConfirmations(deliveryConfirmationsData || []);

        console.log('✅ Dados carregados com sucesso!');
        console.log('📊 Items:', itemsData?.length || 0);
        console.log('📦 Stocks:', unitStocksData?.length || 0);
        console.log('📝 Movements:', movementsData?.length || 0);
        console.log('🏢 Units:', unitsData?.length || 0);
        console.log('🏢 Units floors check:', unitsData?.map(u => ({ id: u.id, name: u.name, floors: u.floors, isArray: Array.isArray(u.floors) })));
        
        // Restore user session after data is loaded
        const pendingUserId = localStorage.getItem('gowork_pending_user_id');
        if (pendingUserId && usersData) {
          const userToRestore = usersData.find((u: User) => u.id === pendingUserId);
          if (userToRestore) {
            console.log('✅ Sessão restaurada:', userToRestore.name);
            setCurrentUser(userToRestore);
            
            // Set primary unit if exists
            if (userToRestore.role !== 'designer' && userToRestore.primaryUnitId && unitsData) {
              const primaryUnit = unitsData.find((u: Unit) => u.id === userToRestore.primaryUnitId);
              if (primaryUnit) {
                setCurrentUnitState(primaryUnit);
              }
            }
            
            // Clean up pending flag
            localStorage.removeItem('gowork_pending_user_id');
          } else {
            console.log('⚠️ Usuário não encontrado no banco, limpando sessão');
            localStorage.removeItem('gowork_auth_token');
            localStorage.removeItem('gowork_current_user');
            localStorage.removeItem('gowork_pending_user_id');
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const login = (userId: string) => {
    const user = appUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      // Designers e Developers são volantes e não têm unidade fixa
      if (user.role === 'designer' || user.role === 'developer' || !user.primaryUnitId) {
        setCurrentUnitState(null);
      } else {
        const primaryUnit = appUnits.find(u => u.id === user.primaryUnitId);
        setCurrentUnitState(primaryUnit || null);
      }
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentUnitState(null);
    
    // Clear localStorage
    localStorage.removeItem('gowork_auth_token');
    localStorage.removeItem('gowork_current_user');
    localStorage.removeItem('gowork_pending_user_id');
  };

  const setCurrentUnit = (unitId: string) => {
    const unit = appUnits.find(u => u.id === unitId);
    if (unit && currentUser) {
      // Check if user has access to this unit
      const hasAccess = 
        currentUser.role === 'admin' ||
        currentUser.role === 'designer' || // Designers podem acessar todas as unidades
        currentUser.role === 'developer' || // Developers podem acessar todas as unidades
        currentUser.primaryUnitId === unitId ||
        currentUser.additionalUnitIds?.includes(unitId);
      
      if (hasAccess) {
        setCurrentUnitState(unit);
      }
    }
  };

  const addMovement = async (movementData: Omit<SimpleMovement, 'id' | 'timestamp' | 'createdAt'>) => {
    console.log('🚀 addMovement chamado com:', movementData);
    console.log('🔍 unitId tipo:', typeof movementData.unitId);
    console.log('🔍 unitId valor:', movementData.unitId);
    const now = new Date();
    
    try {
      console.log('💾 Tentando persistir no backend...');
      
      // NÃO enviar id - deixar o banco gerar o UUID
      const dataToSend = {
        type: movementData.type,
        itemId: movementData.itemId,
        unitId: movementData.unitId,
        userId: movementData.userId,
        quantity: movementData.quantity,
        timestamp: now.toISOString(),
        notes: movementData.notes,
      };
      
      console.log('📤 Enviando para backend:', dataToSend);
      console.log('📤 unitId no payload:', dataToSend.unitId);
      
      // Persistir no backend e receber o movimento com ID gerado pelo banco
      const createdMovement = await api.movements.create(dataToSend);
      console.log('✅ Movimento persistido no backend com ID:', createdMovement.id);
      
      // Adicionar ao estado com o ID real do banco
      setAppMovements(prev => [...prev, createdMovement]);

      // IMPORTANTE: Recarregar os stocks do backend pois o stock pode ter sido criado
      console.log('🔄 Recarregando stocks do backend...');
      const updatedStocks = await api.unitStocks.getAll();
      console.log('📊 Stocks ANTES de atualizar estado:', appUnitStocks.length);
      console.log('📊 Stocks RECEBIDOS do backend:', updatedStocks.length);
      console.log('🔍 Stock ANTES da movimentação:', 
        appUnitStocks.find(s => s.itemId === movementData.itemId && s.unitId === movementData.unitId)
      );
      console.log('🔍 Stock DEPOIS da movimentação (do backend):', 
        updatedStocks.find(s => s.itemId === movementData.itemId && s.unitId === movementData.unitId)
      );
      setAppUnitStocks(updatedStocks);
      console.log('✅ Stocks recarregados e estado atualizado!');
      
    } catch (error) {
      console.error('❌ Erro ao criar movimento:', error);
      console.error('❌ Erro DETALHADO:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: (error as any).details,
        movementData: movementData,
      });
      throw error;
    }
  };

  const addLoan = async (loan: Omit<Loan, 'id' | 'withdrawalDate'>) => {
    // Create temporary loan in frontend
    const tempId = `loan-temp-${Date.now()}`;
    const newLoan: Loan = {
      ...loan,
      id: tempId,
      withdrawalDate: new Date(),
    };
    setAppLoans(prev => [...prev, newLoan]);

    // Save to backend
    try {
      const createdLoan = await api.loans.create({
        ...loan,
        withdrawalDate: new Date().toISOString(),
      });
      
      // Replace temp loan with real loan from backend
      setAppLoans(prev => prev.map(l => 
        l.id === tempId ? createdLoan : l
      ));

      console.log('✅ Empréstimo criado no backend:', createdLoan);
    } catch (error) {
      console.error('❌ Erro ao criar empréstimo no backend:', error);
      // Rollback: remove temp loan
      setAppLoans(prev => prev.filter(l => l.id !== tempId));
      throw error;
    }
  };

  const updateLoan = (loanId: string, updates: Partial<Loan>) => {
    setAppLoans(prev => prev.map(loan => 
      loan.id === loanId ? { ...loan, ...updates } : loan
    ));
  };

  const updateStock = async (stockId: string, quantity: number) => {
    const stock = appUnitStocks.find(s => s.id === stockId);
    if (stock) {
      const updatedStock: UnitStock = {
        ...stock,
        quantity,
      };
      try {
        await api.unitStocks.update(stockId, updatedStock);
        setAppUnitStocks(prev => prev.map(s =>
          s.id === stockId ? updatedStock : s
        ));
      } catch (error) {
        console.error('❌ Erro ao atualizar estoque:', error);
        throw error;
      }
    }
  };

  const updateStockWithLocation = (stockId: string, quantity: number, location: string) => {
    setAppUnitStocks(prev => prev.map(stock =>
      stock.id === stockId ? { ...stock, quantity, location } : stock
    ));
  };

  const addItemWithStock = (itemData: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }, unitId: string, quantity: number, location: string): string => {
    // Gerar UUID real ao invés de string customizada
    const itemId = crypto.randomUUID();
    const newItem: Item = {
      ...itemData,
      id: itemId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAppItems(prev => [...prev, newItem]);

    // Create initial stock entries
    // Se for móvel, não cria estoque no almoxarifado central
    const warehouseId = getWarehouseUnitId();
    const unitsToCreateStock = itemData.isFurniture 
      ? appUnits.filter(u => u.id !== warehouseId)
      : appUnits;
    
    const newStocks = unitsToCreateStock.map(unit => ({
      id: crypto.randomUUID(), // UUID para cada stock
      itemId: itemId,
      unitId: unit.id,
      quantity: unit.id === unitId ? quantity : 0,
      minimumQuantity: itemData.defaultMinimumQuantity || 5,
      location: unit.id === unitId ? location : '',
    }));
    setAppUnitStocks(prev => [...prev, ...newStocks]);
    
    return itemId;
  };

  const addItem = async (itemData: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }) => {
    // Create temporary item in frontend com UUID
    const tempId = crypto.randomUUID();
    const tempItem: Item = {
      ...itemData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAppItems(prev => [...prev, tempItem]);

    // Save to backend
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: itemData.name,
          category_id: itemData.categoryId,
          description: itemData.description,
          unit_of_measure: itemData.unitOfMeasure,
          is_consumable: itemData.isConsumable,
          requires_responsibility_term: itemData.requiresResponsibilityTerm,
          default_loan_days: itemData.defaultLoanDays,
          default_minimum_quantity: itemData.defaultMinimumQuantity,
          serial_number: itemData.serialNumber,
          image_url: itemData.imageUrl,
          is_unique_product: itemData.isUniqueProduct,
          is_furniture: itemData.isFurniture,
          active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create item in backend');
      }

      const createdItem = await response.json();
      
      // Replace temp item with real item from backend
      setAppItems(prev => prev.map(item => 
        item.id === tempId ? { 
          ...tempItem, 
          id: createdItem.id,
        } : item
      ));

      console.log('✅ Item criado no backend:', createdItem);
    } catch (error) {
      console.error('❌ Erro ao criar item no backend:', error);
      // Rollback: remove temp item
      setAppItems(prev => prev.filter(item => item.id !== tempId));
      throw error;
    }
  };

  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    // Update in frontend immediately
    setAppItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates, updatedAt: new Date() } : item
    ));

    // Save to backend
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          category_id: updates.categoryId,
          description: updates.description,
          unit_of_measure: updates.unitOfMeasure,
          is_consumable: updates.isConsumable,
          requires_responsibility_term: updates.requiresResponsibilityTerm,
          default_loan_days: updates.defaultLoanDays,
          default_minimum_quantity: updates.defaultMinimumQuantity,
          serial_number: updates.serialNumber,
          image_url: updates.imageUrl,
          is_unique_product: updates.isUniqueProduct,
          is_furniture: updates.isFurniture,
          active: updates.active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item in backend');
      }

      console.log('✅ Item atualizado no backend');
    } catch (error) {
      console.error('❌ Erro ao atualizar item no backend:', error);
      // Note: Frontend state is already updated, user can retry or refresh
    }
  };

  const addStock = async (stockData: Omit<UnitStock, 'id'>) => {
    // Create temporary stock in frontend
    const tempId = `stock-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newStock: UnitStock = {
      ...stockData,
      id: tempId,
    };
    setAppUnitStocks(prev => [...prev, newStock]);

    // Save to backend
    try {
      const createdStock = await api.unitStocks.create(stockData);
      
      // Replace temp stock with real stock from backend
      setAppUnitStocks(prev => prev.map(s => 
        s.id === tempId ? createdStock : s
      ));

      console.log('✅ Estoque criado no backend:', createdStock);
    } catch (error) {
      console.error('❌ Erro ao criar estoque no backend:', error);
      // Rollback: remove temp stock
      setAppUnitStocks(prev => prev.filter(s => s.id !== tempId));
      throw error;
    }
  };

  const getAvailableUnits = (): Unit[] => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'admin') {
      return appUnits;
    }
    
    // Designers e Developers são volantes e podem ver todas as unidades operacionais (exceto almoxarifado)
    if (currentUser.role === 'designer' || currentUser.role === 'developer') {
      const warehouseId = getWarehouseUnitId();
      return appUnits.filter(u => u.id !== warehouseId);
    }
    
    // Garantir que primaryUnitId existe antes de usar
    const unitIds = [
      ...(currentUser.primaryUnitId ? [currentUser.primaryUnitId] : []),
      ...(currentUser.additionalUnitIds || [])
    ];
    return appUnits.filter(u => unitIds.includes(u.id));
  };

  const getWarehouseUnitId = (): string | undefined => {
    const warehouse = appUnits.find(u => u.name === 'Almoxarifado Central');
    return warehouse?.id;
  };

  const getStockForItem = (itemId: string, unitId: string): UnitStock | undefined => {
    return appUnitStocks.find(s => s.itemId === itemId && s.unitId === unitId);
  };

  const getItemById = (itemId: string): Item | undefined => {
    return appItems.find(i => i.id === itemId);
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return appCategories.find(c => c.id === categoryId);
  };

  const getUnitById = (unitId: string): Unit | undefined => {
    return appUnits.find(u => u.id === unitId);
  };

  const getUserById = (userId: string): User | undefined => {
    return appUsers.find(u => u.id === userId);
  };

  const addRequest = async (requestData: Omit<Request, 'id' | 'createdAt'>) => {
    console.log('🚀 addRequest chamado com:', requestData);
    
    // Create temporary request in frontend
    const tempId = `req-temp-${Date.now()}`;
    const newRequest: Request = {
      ...requestData,
      id: tempId,
      createdAt: new Date(),
    };
    setAppRequests(prev => [...prev, newRequest]);
    console.log('✅ Request temporário criado no frontend:', tempId);

    // Save to backend
    try {
      console.log('💾 Tentando persistir request no backend...');
      // Don't send createdAt - Supabase will auto-generate created_at timestamp
      const createdRequest = await api.requests.create(requestData);
      
      // Replace temp request with real request from backend
      setAppRequests(prev => prev.map(r => 
        r.id === tempId ? createdRequest : r
      ));

      console.log('✅ Solicitação criada no backend:', createdRequest);
    } catch (error) {
      console.error('❌ Erro ao criar solicitação no backend:', error);
      console.error('❌ Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: (error as any).details,
        requestData: requestData,
      });
      // Rollback: remove temp request
      setAppRequests(prev => prev.filter(r => r.id !== tempId));
      throw error;
    }
  };

  const updateRequest = async (requestId: string, updates: Partial<Request>) => {
    // Update in frontend immediately for optimistic UI
    setAppRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updates } : req
    ));

    // Save to backend
    try {
      await api.requests.update(requestId, updates);
    } catch (error) {
      console.error('❌ Erro ao atualizar request no backend:', error);
      // Note: Frontend state is already updated, user can retry or refresh
    }
  };

  const addFurnitureTransfer = (transferData: Omit<FurnitureTransfer, 'id' | 'createdAt'>) => {
    const newTransfer: FurnitureTransfer = {
      ...transferData,
      id: `ft-${Date.now()}`,
      createdAt: new Date(),
    };
    setAppFurnitureTransfers(prev => [...prev, newTransfer]);
  };

  const updateFurnitureTransfer = (transferId: string, updates: Partial<FurnitureTransfer>) => {
    setAppFurnitureTransfers(prev => prev.map(transfer =>
      transfer.id === transferId ? { ...transfer, ...updates } : transfer
    ));
  };

  const addFurnitureRemovalRequest = async (requestData: Omit<FurnitureRemovalRequest, 'id' | 'createdAt'>) => {
    const newRequest: FurnitureRemovalRequest = {
      ...requestData,
      id: `frr-${Date.now()}`,
      createdAt: new Date(),
    };
    setAppFurnitureRemovalRequests(prev => [...prev, newRequest]);
    
    // Salvar no backend
    try {
      await api.furnitureRemovalRequests.create(newRequest);
      console.log('✅ Solicitação de retirada salva no backend:', newRequest.id);
    } catch (error) {
      console.error('❌ Erro ao salvar solicitação de retirada no backend:', error);
    }
  };

  const updateFurnitureRemovalRequest = async (requestId: string, updates: Partial<FurnitureRemovalRequest>) => {
    setAppFurnitureRemovalRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updates } : req
    ));
    
    // Atualizar no backend
    try {
      await api.furnitureRemovalRequests.update(requestId, updates);
      console.log('✅ Solicitação de retirada atualizada no backend:', requestId);
    } catch (error) {
      console.error('❌ Erro ao atualizar solicitação de retirada no backend:', error);
    }
  };

  const addFurnitureRequestToDesigner = async (requestData: Omit<FurnitureRequestToDesigner, 'id' | 'createdAt'>) => {
    const newRequest: FurnitureRequestToDesigner = {
      ...requestData,
      id: `frd-${Date.now()}`,
      createdAt: new Date(),
    };
    setAppFurnitureRequestsToDesigner(prev => [...prev, newRequest]);
    
    // Salvar no backend
    try {
      await api.furnitureRequestsToDesigner.create(newRequest);
      console.log('✅ Solicitação ao designer salva no backend:', newRequest.id);
    } catch (error) {
      console.error('❌ Erro ao salvar solicitação ao designer no backend:', error);
    }
  };

  const updateFurnitureRequestToDesigner = async (requestId: string, updates: Partial<FurnitureRequestToDesigner>) => {
    setAppFurnitureRequestsToDesigner(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updates } : req
    ));
    
    // Atualizar no backend
    try {
      await api.furnitureRequestsToDesigner.update(requestId, updates);
      console.log('✅ Solicitação ao designer atualizada no backend:', requestId);
    } catch (error) {
      console.error('❌ Erro ao atualizar solicitação ao designer no backend:', error);
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    // Create temporary user in frontend
    const tempId = `user-temp-${Date.now()}`;
    const newUser: User = {
      ...userData,
      id: tempId,
    };
    setAppUsers(prev => [...prev, newUser]);

    // Save to backend using signup endpoint (creates in auth.users and public.users)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/auth/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password || 'senha123', // Default password if not provided
          name: userData.name,
          role: userData.role,
          primaryUnitId: userData.primaryUnitId,
          additionalUnitIds: userData.additionalUnitIds,
          warehouseType: userData.warehouseType,
          jobTitle: userData.jobTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const createdUser = await response.json();
      
      // Replace temp user with real user from backend
      setAppUsers(prev => prev.map(u => 
        u.id === tempId ? createdUser.user : u
      ));

      console.log('✅ Usuário criado no backend:', createdUser.user);
    } catch (error) {
      console.error('❌ Erro ao criar usuário no backend:', error);
      // Rollback: remove temp user
      setAppUsers(prev => prev.filter(u => u.id !== tempId));
      throw error;
    }
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setAppUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const deleteUser = (userId: string) => {
    setAppUsers(prev => prev.filter(user => user.id !== userId));
    
    // Call API to delete user from backend
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      console.error('Error deleting user from backend:', error);
    });
  };

  const addUnit = async (unitData: Omit<Unit, 'id'>) => {
    // Criar unidade temporária no frontend
    const tempId = `unit-${Date.now()}`;
    const tempUnit: Unit = {
      ...unitData,
      id: tempId,
    };
    setAppUnits(prev => [...prev, tempUnit]);
    
    // Criar estoque zerado para todos os itens na nova unidade
    const newStocks = appItems
      .filter(item => item.categoryId !== 'cat-9') // Excluir móveis
      .map(item => ({
        id: `stock-${item.id}-${tempId}`,
        itemId: item.id,
        unitId: tempId,
        quantity: 0,
        minimumQuantity: item.defaultMinimumQuantity || 5,
        location: '',
      }));
    setAppUnitStocks(prev => [...prev, ...newStocks]);
    
    // Save to backend (backend will generate UUID)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/units`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(unitData), // Send without ID
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Supabase] Error creating unit:', errorData);
        throw new Error(errorData.error || 'Failed to create unit');
      }
      
      const savedUnit = await response.json();
      
      // Update frontend with real UUID from backend
      setAppUnits(prev => prev.map(u => u.id === tempId ? savedUnit : u));
      setAppUnitStocks(prev => prev.map(s => s.unitId === tempId ? { ...s, unitId: savedUnit.id } : s));
    } catch (error) {
      console.error('Error saving unit to backend:', error);
      // Remove from frontend if backend save failed
      setAppUnits(prev => prev.filter(u => u.id !== tempId));
      setAppUnitStocks(prev => prev.filter(s => s.unitId !== tempId));
      throw error;
    }
  };

  const updateUnit = async (unitId: string, updates: Partial<Unit>) => {
    setAppUnits(prev => prev.map(unit =>
      unit.id === unitId ? { ...unit, ...updates } : unit
    ));
    
    // Save to backend
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/units/${unitId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating unit in backend:', error);
    }
  };

  const deleteUnit = (unitId: string) => {
    // Não permitir deletar o almoxarifado
    const warehouseId = getWarehouseUnitId();
    if (unitId === warehouseId) {
      return;
    }
    setAppUnits(prev => prev.filter(unit => unit.id !== unitId));
    // Remover todos os estoques da unidade
    setAppUnitStocks(prev => prev.filter(stock => stock.unitId !== unitId));
  };

  // Criar lote de entrega
  const createDeliveryBatch = (
    requestIds: string[], 
    furnitureRequestIds: string[], 
    targetUnitId: string, 
    driverUserId: string
  ): string => {
    const qrCode = `DEL-${Date.now().toString().slice(-6)}`;
    
    const newBatch: DeliveryBatch = {
      id: `batch-${Date.now()}`,
      requestIds,
      furnitureRequestIds: furnitureRequestIds.length > 0 ? furnitureRequestIds : undefined,
      targetUnitId,
      driverUserId,
      qrCode,
      status: 'pending', // Lote criado, aguardando separação dos itens
      createdAt: new Date(),
    };

    // Persistir no backend
    api.deliveryBatches.create(newBatch).catch(error => {
      console.error('❌ Erro ao criar lote no backend:', error);
    });

    setAppDeliveryBatches(prev => [...prev, newBatch]);

    // Atualizar status das solicitações para 'processing' (fazem parte de um lote, mas ainda não separadas)
    requestIds.forEach(reqId => {
      updateRequest(reqId, { 
        status: 'processing',
      });
    });

    furnitureRequestIds.forEach(reqId => {
      updateFurnitureRequestToDesigner(reqId, { 
        status: 'in_transit',
        deliveredByUserId: driverUserId
      });
    });

    console.log('✅ Lote criado:', newBatch.id, 'QR:', qrCode);
    return newBatch.id;
  };

  // Confirmar entrega (motorista)
  const confirmDelivery = async (
    batchId: string, 
    confirmationData: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>,
    receiverDailyCode: string
  ) => {
    const newConfirmation: DeliveryConfirmation = {
      ...confirmationData,
      id: `conf-${Date.now()}`,
      batchId,
      timestamp: new Date(),
    };

    try {
      // Persistir confirmação no backend
      await api.deliveryConfirmations.create(newConfirmation);
      
      setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

      // Buscar o lote completo para enviar todos os dados ao backend
      const batch = appDeliveryBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error(`Lote ${batchId} não encontrado`);
      }

      // Atualizar status do lote no backend com dados completos
      await api.deliveryBatches.update(batchId, {
        status: 'delivery_confirmed',
        deliveryConfirmedAt: new Date().toISOString(),
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: batch.createdAt.toISOString(),
        dispatchedAt: batch.dispatchedAt?.toISOString(),
      });

      // Atualizar status do lote localmente
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'delivery_confirmed',
              deliveryConfirmedAt: new Date()
            }
          : b
      ));

      // Atualizar status das solicitações
      batch.requestIds.forEach(reqId => {
        updateRequest(reqId, { 
          status: 'delivery_confirmed'
        });
      });
      
      console.log('✅ Entrega confirmada com QR Code:', batchId);
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega:', error);
      throw error;
    }
  };

  // Confirmar recebimento (recebedor)
  const confirmReceipt = async (
    batchId: string, 
    confirmationData: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>
  ) => {
    console.log('🔍 confirmReceipt chamado:', { batchId, confirmationData });
    
    const newConfirmation: DeliveryConfirmation = {
      ...confirmationData,
      id: `conf-${Date.now()}`,
      batchId,
      timestamp: new Date(),
    };

    console.log('📦 Nova confirmação criada:', newConfirmation);

    // Atualizar estado local primeiro (otimistic update)
    setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

    // Atualizar status do lote
    setAppDeliveryBatches(prev => prev.map(batch =>
      batch.id === batchId 
        ? { 
            ...batch, 
            status: 'completed',
            receivedConfirmedAt: new Date(),
            completedAt: new Date()
          }
        : batch
    ));

    // Atualizar status das solicitações para 'completed'
    const batch = appDeliveryBatches.find(b => b.id === batchId);
    if (batch) {
      batch.requestIds.forEach(reqId => {
        updateRequest(reqId, { 
          status: 'completed',
          completedByUserId: confirmationData.confirmedByUserId,
          completedAt: new Date()
        });
      });

      // Atualizar móveis se houver
      batch.furnitureRequestIds?.forEach(reqId => {
        updateFurnitureRequestToDesigner(reqId, { 
          status: 'completed',
          completedAt: new Date()
        });
      });
    }

    // Salvar no backend
    try {
      console.log('🚀 Enviando confirmação para o backend...');
      
      // Converter Date para ISO string para enviar ao backend
      const confirmationForBackend = {
        ...newConfirmation,
        timestamp: newConfirmation.timestamp.toISOString(),
      };
      
      await api.deliveryConfirmations.create(confirmationForBackend);
      
      console.log('🚀 Atualizando status do lote no backend...');
      // Atualizar batch no backend
      await api.deliveryBatches.update(batchId, {
        status: 'completed',
        receivedConfirmedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      console.log('✅ Confirmação de recebimento salva no backend:', newConfirmation);
    } catch (error) {
      console.error('❌ Erro ao salvar confirmação no backend:', error);
      // Rollback em caso de erro
      setAppDeliveryConfirmations(prev => prev.filter(c => c.id !== newConfirmation.id));
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId ? { ...b, status: 'pending_confirmation' } : b
      ));
      throw error;
    }
  };

  const getDeliveryBatchById = (batchId: string) => {
    return appDeliveryBatches.find(b => b.id === batchId);
  };

  const getConfirmationsForBatch = (batchId: string) => {
    return appDeliveryConfirmations.filter(c => c.batchId === batchId);
  };

  const separateItemInBatch = async (requestId: string, batchId: string) => {
    console.log('🔍 separateItemInBatch chamado:', { requestId, batchId });
    
    if (!currentUser) {
      console.log('❌ currentUser não existe!');
      return;
    }
    
    console.log('✅ currentUser:', currentUser.name, currentUser.id);
    
    // Buscar o pedido para pegar informações do item
    const request = appRequests.find(r => r.id === requestId);
    if (!request) {
      console.log('❌ Request não encontrado:', requestId);
      return;
    }
    
    console.log('✅ Request encontrado:', request);
    
    // Buscar o item para verificar se é material regular
    const item = appItems.find(i => i.id === request.itemId);
    if (!item) {
      console.log('❌ Item não encontrado:', request.itemId);
      return;
    }
    
    console.log('✅ Item encontrado:', item.name, 'isFurniture:', item.isFurniture);
    
    // Criar movimentação de SAÍDA do almoxarifado (apenas para materiais regulares)
    // IMPORTANTE: Se isFurniture for undefined ou false, é material regular
    if (item.isFurniture !== true) {
      console.log('📦 É material regular, criando movimentação de saída...');
      
      const warehouseId = getWarehouseUnitId();
      if (!warehouseId) {
        console.error('❌ Almoxarifado Central não encontrado!');
        throw new Error('Almoxarifado Central não encontrado');
      }
      
      console.log('✅ Almoxarifado ID:', warehouseId);
      
      try {
        console.log('📤 Criando movimentação de SAÍDA...');
        await addMovement({
          type: 'consumption',
          itemId: request.itemId,
          unitId: warehouseId, // Almoxarifado Central (ID dinâmico)
          userId: currentUser.id,
          quantity: request.quantity,
          notes: `Separação do lote para entrega - Destino: ${request.requestingUnitId}`,
        });
        console.log('✅ Movimentação de saída criada:', request.itemId, request.quantity, 'do almoxarifado', warehouseId);
      } catch (error) {
        console.error('❌ Erro ao criar movimentação de saída:', error);
        throw error;
      }
    } else {
      console.log('🪑 É móvel (isFurniture=true), pulando criação de movimentação');
    }
    
    // Marcar o item como separado (awaiting_pickup)
    updateRequest(requestId, { 
      status: 'awaiting_pickup',
      pickupReadyByUserId: currentUser.id,
      pickupReadyAt: new Date(),
    });

    // Verificar se todos os itens do lote foram separados
    const batch = appDeliveryBatches.find(b => b.id === batchId);
    if (!batch) return;

    // Verificar o status de todos os requests do lote
    const allSeparated = batch.requestIds.every(reqId => {
      const req = appRequests.find(r => r.id === reqId);
      return req && (req.status === 'awaiting_pickup' || reqId === requestId);
    });

    // Se todos os itens foram separados, liberar o lote para o motorista
    if (allSeparated) {
      // Persistir mudança de status no backend
      api.deliveryBatches.update(batchId, {
        status: 'in_transit',
        dispatchedAt: new Date().toISOString(),
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: batch.createdAt.toISOString(),
      }).catch(error => {
        console.error('❌ Erro ao atualizar status do lote para in_transit:', error);
      });

      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'in_transit',
              dispatchedAt: new Date()
            }
          : b
      ));

      // Atualizar todos os requests para out_for_delivery
      batch.requestIds.forEach(reqId => {
        updateRequest(reqId, { 
          status: 'out_for_delivery',
          pickedUpByUserId: batch.driverUserId,
          pickedUpAt: new Date()
        });
      });
      
      console.log('✅ Lote liberado para motorista:', batchId);
    }
  };

  const getUserDailyCode = (userId: string) => {
    const user = appUsers.find(u => u.id === userId);
    if (user) {
      return generateDailyCode(user.id);
    }
    return '';
  };

  const validateUserDailyCode = (userId: string, code: string) => {
    const user = appUsers.find(u => u.id === userId);
    if (user) {
      return isDailyCodeValid(user.id, code);
    }
    return false;
  };

  const markDeliveryAsPendingConfirmation = async (batchId: string, notes?: string) => {
    try {
      // Buscar o lote completo para enviar todos os dados ao backend
      const batch = appDeliveryBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error(`Lote ${batchId} não encontrado`);
      }

      // Persistir no backend com TODOS os dados do lote (para auto-criação se necessário)
      await api.deliveryBatches.update(batchId, { 
        status: 'pending_confirmation',
        notes,
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: batch.createdAt.toISOString(),
        dispatchedAt: batch.dispatchedAt?.toISOString(),
      });
      
      // Atualizar estado local
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'pending_confirmation',
              notes
            }
          : b
      ));
      
      console.log('✅ Lote marcado como pendente de confirmação:', batchId);
    } catch (error) {
      console.error('❌ Erro ao marcar lote como pendente:', error);
      throw error;
    }
  };

  const confirmDeliveryByRequester = async (
    batchId: string, 
    confirmationData: { userId: string; userName: string; notes?: string; dailyCode: string }
  ) => {
    const newConfirmation: DeliveryConfirmation = {
      id: `conf-${Date.now()}`,
      batchId,
      type: 'requester',
      confirmedByUserId: confirmationData.userId,
      photoUrl: '', // Não tem foto neste fluxo
      timestamp: new Date(),
      notes: confirmationData.notes,
    };

    try {
      // Persistir confirmação no backend
      await api.deliveryConfirmations.create(newConfirmation);
      
      // Atualizar estado local
      setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

      // Buscar o lote completo para enviar todos os dados ao backend
      const batch = appDeliveryBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error(`Lote ${batchId} não encontrado`);
      }

      // Persistir mudança de status do lote no backend com dados completos
      await api.deliveryBatches.update(batchId, { 
        status: 'confirmed_by_requester',
        confirmedByRequesterAt: new Date().toISOString(),
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: batch.createdAt.toISOString(),
        dispatchedAt: batch.dispatchedAt?.toISOString(),
        deliveryConfirmedAt: batch.deliveryConfirmedAt?.toISOString(),
      });

      // Atualizar status do lote no estado local
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'confirmed_by_requester',
              confirmedByRequesterAt: new Date()
            }
          : b
      ));

      // Atualizar status das solicitações para 'completed' e criar movimentações de saída do almoxarifado
      if (batch) {
        console.log('📦 Processando', batch.requestIds.length, 'pedidos do lote...');
        
        // Processar cada pedido
        for (const reqId of batch.requestIds) {
          const request = appRequests.find(r => r.id === reqId);
          if (request) {
            console.log('🔍 Processando pedido:', reqId, 'Item:', request.itemId, 'Qty:', request.quantity);
            
            // Buscar o item para verificar se é material regular
            const item = appItems.find(i => i.id === request.itemId);
            
            // Criar movimentação de SAÍDA do almoxarifado (apenas para materiais regulares)
            // IMPORTANTE: As unidades NÃO controlam estoque, apenas o almoxarifado
            if (item && item.isFurniture === false) {
              const warehouseId = getWarehouseUnitId();
              if (warehouseId) {
                console.log('📤 Criando movimentação de SAÍDA do almoxarifado...');
                console.log('   ├─ Item:', request.itemId);
                console.log('   ├─ Quantidade:', request.quantity);
                console.log('   ├─ Almoxarifado ID:', warehouseId);
                console.log('   └─ Lote:', batch.qrCode);
                
                // Verificar se já existe uma movimentação de saída para este pedido/lote
                const existingOutMovement = appMovements.find(m => 
                  m.type === 'out' && 
                  m.itemId === request.itemId && 
                  m.unitId === warehouseId &&
                  m.notes?.includes(batch.qrCode)
                );

                // Se não existe, criar a movimentação de saída
                if (!existingOutMovement) {
                  try {
                    await addMovement({
                      type: 'out',
                      itemId: request.itemId,
                      unitId: warehouseId,
                      userId: confirmationData.userId,
                      quantity: request.quantity,
                      notes: `Baixa do lote ${batch.qrCode} - Entrega confirmada para ${request.requestingUnitId}`,
                    });
                    console.log('✅ Movimentação de SAÍDA criada do almoxarifado');
                  } catch (error) {
                    console.error('❌ Erro ao criar movimentação de saída do almoxarifado:', error);
                    throw error;
                  }
                } else {
                  console.log('⚠️ Movimentação de saída já existe para este item/lote');
                }
              } else {
                console.error('❌ Almoxarifado não encontrado!');
              }
            } else if (item?.isFurniture === true) {
              console.log('🪑 Item é móvel, não cria movimentação de estoque');
            }
            
            // Atualizar status do pedido
            updateRequest(reqId, { 
              status: 'completed',
              completedByUserId: confirmationData.userId,
              completedAt: new Date()
            });
            console.log('✅ Pedido marcado como completed:', reqId);
          }
        }

        // Atualizar móveis se houver
        batch.furnitureRequestIds?.forEach(reqId => {
          updateFurnitureRequestToDesigner(reqId, { 
            status: 'completed',
            completedAt: new Date()
          });
        });
      }
      
      console.log('✅ Confirmação do solicitante registrada:', batchId);
      console.log('📊 RESUMO DA CONFIRMAÇÃO:');
      console.log('   ├─ Lote ID:', batchId);
      console.log('   ├─ Lote QR:', batch?.qrCode);
      console.log('   ├─ Total de pedidos:', batch?.requestIds.length);
      console.log('   ├─ Movimentações criadas: SAÍDA do almoxarifado + ENTRADA na unidade');
      console.log('   └─ Status: confirmed_by_requester');
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega pelo solicitante:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentUnit,
        users: appUsers,
        units: appUnits,
        items: appItems,
        categories: appCategories,
        unitStocks: appUnitStocks,
        movements: appMovements,
        loans: appLoans,
        requests: appRequests,
        furnitureTransfers: appFurnitureTransfers,
        furnitureRemovalRequests: appFurnitureRemovalRequests,
        furnitureRequestsToDesigner: appFurnitureRequestsToDesigner,
        deliveryBatches: appDeliveryBatches,
        deliveryConfirmations: appDeliveryConfirmations,
        isLoading,
        login,
        logout,
        setCurrentUnit,
        addMovement,
        addLoan,
        updateLoan,
        updateStock,
        updateStockWithLocation,
        addItemWithStock,
        addItem,
        updateItem,
        addStock,
        addRequest,
        updateRequest,
        addFurnitureTransfer,
        updateFurnitureTransfer,
        addFurnitureRemovalRequest,
        updateFurnitureRemovalRequest,
        addFurnitureRequestToDesigner,
        updateFurnitureRequestToDesigner,
        addUser,
        updateUser,
        deleteUser,
        addUnit,
        updateUnit,
        deleteUnit,
        getAvailableUnits,
        getWarehouseUnitId,
        getStockForItem,
        getItemById,
        getCategoryById,
        getUnitById,
        getUserById,
        createDeliveryBatch,
        confirmDelivery,
        confirmReceipt,
        getDeliveryBatchById,
        getConfirmationsForBatch,
        separateItemInBatch,
        getUserDailyCode,
        validateUserDailyCode,
        markDeliveryAsPendingConfirmation,
        confirmDeliveryByRequester,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}