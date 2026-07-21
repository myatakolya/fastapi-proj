
from fastapi import APIRouter, HTTPException
from app.schemas import OperationRequest
from app.service import operation as operations_sercice

router = APIRouter()

@router.post('/operations/income')
def add_income(operation: OperationRequest):
    return operations_sercice.add_income(operation)


@router.post('/operations/expense')
def add_expense(operation: OperationRequest):
    return operations_sercice.add_expense(operation)