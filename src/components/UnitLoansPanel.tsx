import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Package, Calendar, AlertCircle, CheckCircle, User, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { SimpleLoanDialog } from './SimpleLoanDialog';

export function UnitLoansPanel() {
  const { currentUnit, currentUser, loans, getItemById, getUserById, updateLoan, addMovement, updateStock, getStockForItem } = useApp();
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);

  if (!currentUnit) return null;

  const unitLoans = loans.filter(
    loan => loan.unitId === currentUnit.id && (loan.status === 'active' || loan.status === 'overdue')
  );

  const handleReturn = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const item = getItemById(loan.itemId);
    const stock = getStockForItem(loan.itemId, loan.unitId);
    if (!item || !stock || !currentUser) return;

    // Add return movement
    addMovement({
      type: 'devolucao',
      itemId: loan.itemId,
      unitId: loan.unitId,
      quantity: 1,
      executorUserId: currentUser.id,
      reason: 'Devolução de empréstimo',
      observations: `Devolução do empréstimo ${loanId} - Processado por controlador`,
    });

    // Update loan status
    updateLoan(loanId, {
      status: 'returned',
      returnDate: new Date(),
    });

    // Update stock
    updateStock(stock.id, stock.quantity + 1);

    toast.success(`Item "${item.name}" devolvido com sucesso`);
  };

  const getLoanStatus = (loan: typeof unitLoans[0]) => {
    const now = new Date();
    const expectedReturn = new Date(loan.expectedReturnDate);
    const diffDays = Math.ceil((expectedReturn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (loan.status === 'overdue' || diffDays < 0) {
      return { label: 'Atrasado', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    } else if (diffDays === 0) {
      return { label: 'Vence hoje', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
    } else if (diffDays <= 2) {
      return { label: `Vence em ${diffDays}d`, color: 'bg-yellow-100 text-yellow-800', icon: Calendar };
    } else {
      return { label: 'No prazo', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  if (unitLoans.length === 0) {
    return (
      <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Empréstimos Ativos da Unidade</CardTitle>
              <CardDescription>Nenhum empréstimo ativo no momento</CardDescription>
            </div>
            <Button 
              onClick={() => setLoanDialogOpen(true)}
              size="sm"
              variant="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              Emprestar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Dialog de Empréstimo Simples */}
      <SimpleLoanDialog
        open={loanDialogOpen}
        onOpenChange={setLoanDialogOpen}
      />
      </>
    );
  }

  // Sort by status (overdue first, then by expected return date)
  const sortedLoans = [...unitLoans].sort((a, b) => {
    const aOverdue = new Date(a.expectedReturnDate) < new Date();
    const bOverdue = new Date(b.expectedReturnDate) < new Date();
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    return new Date(a.expectedReturnDate).getTime() - new Date(b.expectedReturnDate).getTime();
  });

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Empréstimos Ativos da Unidade</CardTitle>
            <CardDescription>{unitLoans.length} item(ns) emprestado(s) em {currentUnit.name}</CardDescription>
          </div>
          <Button 
            onClick={() => setLoanDialogOpen(true)}
            size="sm"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Emprestar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedLoans.map(loan => {
            const item = getItemById(loan.itemId);
            const responsible = getUserById(loan.responsibleUserId);
            const status = getLoanStatus(loan);
            const StatusIcon = status.icon;

            if (!item) return null;
            
            // Usar responsibleName se disponível, senão buscar usuário
            const responsibleDisplayName = loan.responsibleName || responsible?.name || 'Não informado';

            return (
              <div
                key={loan.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-slate-900 dark:text-slate-100 mb-1 text-sm sm:text-base">{item.name}</h4>
                      
                      <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{responsibleDisplayName}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={`${status.color} text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        {loan.serialNumber && (
                          <Badge variant="outline" className="text-xs">
                            Serial: {loan.serialNumber}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                        <p>
                          Retirada: {new Date(loan.withdrawalDate).toLocaleDateString('pt-BR')} às {new Date(loan.withdrawalDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p>
                          Devolução prevista: {new Date(loan.expectedReturnDate).toLocaleDateString('pt-BR')}
                        </p>
                        {loan.observations && (
                          <p className="text-xs italic text-slate-500 break-words">{loan.observations}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto sm:flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleReturn(loan.id)}
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      Registrar Devolução
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* Dialog de Empréstimo Simples */}
    <SimpleLoanDialog
      open={loanDialogOpen}
      onOpenChange={setLoanDialogOpen}
    />
    </>
  );
}