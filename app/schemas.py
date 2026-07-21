from pydantic import BaseModel, Field, field_validator

class OperationRequest(BaseModel):
    wallet_name: str = Field(..., max_length=27)
    amount: float
    description: str | None = Field(None, max_length=255)
    
    @field_validator('amount')
    def amount_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError('Cумма должна быть позитивной')
        return value

    @field_validator('wallet_name')
    def wallet_name_not_empty(cls, value: str) -> str:
        if value := value.strip():
            return value
        raise ValueError('Имя кошелька не может быть пустым')
    
class CreateWalletRequest(BaseModel):
    wallet_name: str = Field(..., max_length=27)
    initial_balance: float = 0.0
    
    @field_validator('wallet_name')
    def wallet_name_not_empty(cls, value: str) -> str:
        if value := value.strip():
            return value
        raise ValueError('Имя кошелька не может быть пустым')
    
    @field_validator('initial_balance')
    def initial_balance_not_negative(cls, value: float) -> float:
        if value < 0:
            raise ValueError('Начальный баланс не может быть отрицательным')
        return value