from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from sqlalchemy.orm import Session

from app.dependency import get_current_user, get_db
from app.models import User
from app.schemas import ExportCsvParams, OperationRequest, OperationResponse, TransferCreateSchema
from app.service import operations as operations_service

router = APIRouter()

@router.post('/operations/income', response_model=OperationResponse)
def add_income(operation: OperationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return operations_service.add_income(db, current_user, operation)


@router.post('/operations/expense', response_model=OperationResponse)
def add_expense(operation: OperationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return operations_service.add_expense(db, current_user, operation)


@router.get('/operations', response_model=list[OperationResponse])
def get_operations_list(wallet_id: int | None = Query(None), date_from: datetime | None = Query(None), date_to: datetime | None = Query(None), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return operations_service.get_operations_list(db, user, wallet_id, date_from, date_to)


@router.post('/operations/transfer', response_model=OperationResponse)
async def create_transfer(payload: TransferCreateSchema, user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    return await operations_service.transfer_between_wallets(db, user.id, payload.from_wallet_id, payload.to_wallet_id, payload.amount)

@router.get('/export/csv')
def get_operations_csv(params: ExportCsvParams = Depends(), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return operations_service.get_operations_csv(db=db, user=user, date_from=params.date_from, date_to=params.date_to, filename=params.filename)