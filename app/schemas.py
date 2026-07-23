from datetime import datetime

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.enum import CurrencyEnum


class OperationRequest(BaseModel):
    wallet_name: str = Field(..., max_length=27)
    amount: Decimal
    description: str | None = Field(None, max_length=255)
    
    @field_validator('amount')
    def amount_must_be_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError('Cумма должна быть положительной')
        if value > 999_999_999:
            raise ValueError('Слишком большая сумма')
        return value

    @field_validator('wallet_name')
    def wallet_name_not_empty(cls, value: str) -> str:
        if value := value.strip():
            return value
        raise ValueError('Имя кошелька не может быть пустым')

class OperationResponse(BaseModel):
    model_config = {'from_attributes': True}
    id: int
    wallet_id: int
    type: str
    amount: Decimal
    currency: CurrencyEnum
    category: str | None
    subcategory: str | None
    created_at: datetime


class CreateWalletRequest(BaseModel):
    wallet_name: str = Field(..., max_length=27)
    initial_balance: Decimal = 0
    currency: CurrencyEnum = CurrencyEnum.RUB
    
    @field_validator('wallet_name')
    def wallet_name_not_empty(cls, value: str) -> str:
        if value := value.strip():
            return value
        raise ValueError('Имя кошелька не может быть пустым')
    
    @field_validator('initial_balance')
    def initial_balance_not_negative(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError('Начальный баланс не может быть отрицательным')
        return value
    
class WalletResponse(BaseModel):
    model_config = {'from_attributes': True}
    id: int
    name: str
    balance: Decimal
    currency: CurrencyEnum
    
class UserRequest(BaseModel):
    login: str = Field(..., min_length=3, max_length=27)
    
class UserResponse(UserRequest):
    model_config = {'from_attributes': True}
    id: int
    
class TransferCreateSchema(BaseModel):
    from_wallet_id: int
    to_wallet_id: int
    amount: Decimal
    
    @field_validator('to_wallet_id')
    @classmethod
    def wallets_must_differ(cls, value:int, info) -> int:
        if 'from_wallet_id' in info.data and value == info.data['from_wallet_id']:
            raise ValueError('Один и тот же кошелек')
        return value
    
    @field_validator('amount')
    @classmethod
    def amount_gt_zero(cls, value:Decimal) -> Decimal:
        if value < 0:
            raise ValueError('Сумма перевода не может быть отрицательной')
        return value 
    
class TotalBalance(BaseModel):
    total_balance: Decimal
    currency: CurrencyEnum
    
class ExportCsvParams(BaseModel):
    date_from: Optional[datetime] = Field(None, description="Начало периода")
    date_to: Optional[datetime] = Field(None, description="Конец периода")
    filename: str = Field("operations.csv", description="Имя файла", max_length=255)

    @field_validator('filename')
    @classmethod
    def validate_filename(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Имя файла не может быть пустым')
        if any(char in value for char in '/\\:*?"<>|'):
            raise ValueError('Имя файла содержит недопустимые символы')
        return value

    @field_validator('date_from', 'date_to')
    @classmethod
    def validate_date_range(cls, value: Optional[datetime], info) -> Optional[datetime]:
        if info.field_name == 'date_to' and info.data.get('date_from') is not None:
            if value is not None and value < info.data['date_from']:
                raise ValueError('Дата "до" не может быть раньше даты "от"')
        return value