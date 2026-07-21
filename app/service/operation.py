from fastapi import HTTPException

from app.schemas import OperationRequest
from app.repository import wallets as wallets_repository


def add_income(operation: OperationRequest):
    if not wallets_repository.is_wallet_exist(operation.wallet_name):
        raise HTTPException(
            status_code=404,
            detail=f'Кошелек "{operation.wallet_name}" не найден'
    )
        
    new_balance = wallets_repository.add_income(operation.wallet_name, operation.amount)
    
    return {
        'message': 'Доход добавлен',
        'wallet': operation.wallet_name,
        'amount': operation.amount,
        'description': operation.description,
        'new_balance': new_balance
    }
    
    
def add_expense(operation: OperationRequest):
    if not wallets_repository.is_wallet_exist(operation.wallet_name):
        raise HTTPException(
            status_code=404,
            detail=f'Кошелек "{operation.wallet_name}" не найден'
        )
    
    balance = wallets_repository.get_wallet_balance_by_name(operation.wallet_name)
    if balance < operation.amount:
        raise HTTPException(
            status_code=400,
            detail=f'Недостаточно средств. Доступно: {balance}'
        )
    
    new_balance = wallets_repository.add_expense(operation.wallet_name, operation.amount)
    
    return {
        'message': 'Расход добавлен',
        'wallet': operation.wallet_name,
        'amount': operation.amount,
        'description': operation.description,
        'new_balance': new_balance
    }