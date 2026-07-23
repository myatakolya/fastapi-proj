import io

import csv

from datetime import datetime

from decimal import Decimal

from fastapi import HTTPException
from fastapi.responses import Response

from sqlalchemy.orm import Session

from app.enum import OperationType
from app.models import User
from app.schemas import OperationRequest, OperationResponse
from app.repository import wallets as wallets_repository
from app.repository import operations as operations_repository
from app.service.exchange_service import get_exchange_rate


def add_income(db: Session, current_user: User, operation: OperationRequest) -> OperationResponse:
    
    if not wallets_repository.is_wallet_exist(db, current_user.id, operation.wallet_name):
        raise HTTPException(
            status_code=404,
            detail=f'Кошелек "{operation.wallet_name}" не найден'
    )
        
    wallet = wallets_repository.add_income(db, current_user.id, operation.wallet_name, operation.amount)
    operation = operations_repository.create_operation(db=db, wallet_id=wallet.id, type=OperationType.INCOME, amount=operation.amount, currency=wallet.currency, category=operation.description)
    
    db.commit()
    
    return OperationResponse.model_validate(operation)
    
    
def add_expense(db: Session, current_user: User, operation: OperationRequest) -> OperationResponse:
    
    if not wallets_repository.is_wallet_exist(db, current_user.id, operation.wallet_name):
        raise HTTPException(
            status_code=404,
            detail=f'Кошелек "{operation.wallet_name}" не найден'
        )
    
    wallet = wallets_repository.get_wallet_balance_by_name(db, current_user.id, operation.wallet_name)
    if wallet.balance < operation.amount:
        raise HTTPException(
            status_code=400,
            detail=f'Недостаточно средств. Доступно: {wallet.balance:.2f}'
        )
    
    wallet = wallets_repository.add_expense(db, current_user.id, operation.wallet_name, operation.amount)
    operation = operations_repository.create_operation(db=db, wallet_id=wallet.id, type=OperationType.EXPENSE, amount=-operation.amount, currency=wallet.currency, category=operation.description)
    
    db.commit()
    
    return OperationResponse.model_validate(operation)


def get_operations_list(db: Session, current_user: User, wallet_id: int | None = None, date_from: datetime | None = None, date_to: datetime | None = None) -> list[OperationResponse]:

    if wallet_id:
        wallet = wallets_repository.get_wallet_by_id(db, current_user.id, wallet_id)
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail=f"Кошелек '{wallet_id}' не найден"
            )
        
        wallets_ids = [wallet_id]
    else:
        wallets = wallets_repository.get_all_wallets(db, current_user.id)
        wallets_ids = [wallet.id for wallet in wallets]
    
    operations = operations_repository.get_operations_list(db, wallets_ids, date_from, date_to)
    
    result = []
    for operation in operations:
        result.append(OperationResponse.model_validate(operation))
    return result


async def transfer_between_wallets(db: Session, user_id: int, from_wallet_id: int, to_wallet_id: int, amount: Decimal) -> OperationResponse:
    
    from_wallet = wallets_repository.get_wallet_by_id(db, user_id, from_wallet_id)
    to_wallet = wallets_repository.get_wallet_by_id(db, user_id, to_wallet_id)
    
    if not from_wallet or not to_wallet:
        raise HTTPException(
            status_code=404,
            detail="Кошелек не найден"
        )
    
    if from_wallet.balance < amount:
        raise HTTPException(
            status_code=400,
            detail=f'Недостаточно денег: {from_wallet.balance} {from_wallet.currency}'
        )
        
    target_amount = amount
    exchange_rate = 1.0
    if from_wallet.currency != to_wallet.currency:
        exchange_rate = await get_exchange_rate(from_wallet.currency, to_wallet.currency)
        target_amount = round(amount * exchange_rate, 2)
    
    from_wallet.balance = round(from_wallet.balance - amount, 2)
    to_wallet.balance = round(to_wallet.balance + target_amount, 2)
    
    operation_from = operations_repository.create_operation(
        db=db,
        wallet_id=from_wallet_id,
        type=OperationType.TRANSFER,
        amount=-amount,
        currency=from_wallet.currency,
        category='Перевод (списание)'
    )
    db.add(operation_from)
    
    operation_to = operations_repository.create_operation(
        db=db,
        wallet_id=to_wallet_id,
        type=OperationType.TRANSFER,
        amount=target_amount,
        currency=to_wallet.currency,
        category='Перевод (зачисление)'
    )
    db.add(operation_to)
    
    db.commit()
    
    return OperationResponse.model_validate(operation_to)

def get_operations_csv(db: Session, user: User, date_from: datetime | None, date_to: datetime | None, filename: str) -> Response:
    operations_list = get_operations_list(db, user, None, date_from, date_to)
    
    if not operations_list:
        raise HTTPException(
            status_code=404,
            detail='Нет данных для экспорта в заданный период'
        )
    
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['ID', 'Wallet ID', 'Type', 'Amount', 'Currency', 'Category', 'Subcategory', 'Created At'])
    
    for operation in operations_list:
        writer.writerow([
            operation.id,
            operation.wallet_id,
            operation.type,
            str(operation.amount),
            operation.currency,
            operation.category or '---',
            operation.subcategory or '---',
            operation.created_at.isoformat()
        ])
    
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    
    return Response(content=output.getvalue().encode('utf-8-sig'), media_type='text/csv', headers=headers)
    
    