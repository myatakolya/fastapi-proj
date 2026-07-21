
from fastapi import HTTPException
from app.repository import wallets as wallets_repository
from app.schemas import CreateWalletRequest


def get_balance(wallet_name: str | None = None):
    if wallet_name is None:
        wallets = wallets_repository.get_all_wallets()
        return {'total_balance': sum(wallets.values())}
        
    if not wallets_repository.is_wallet_exist(wallet_name):
        raise HTTPException(
            status_code=404,
            detail=f'Кошелек "{wallet_name}" не найден'
        )
    
    balance = wallets_repository.get_wallet_balance_by_name(wallet_name)
    
    return {
        'Wallet': wallet_name,
        'Balance': balance
    }

 
def create_wallet(wallet: CreateWalletRequest):
    if wallets_repository.is_wallet_exist(wallet.wallet_name):
        raise HTTPException(
            status_code=400,
            detail=f"Кошелек '{wallet.wallet_name}' уже существуе"
        )
    
    new_balance = wallets_repository.create_wallet(wallet.wallet_name, wallet.initial_balance)
    
    return {
        'message': f'Кошелек "{wallet.wallet_name}" создан',
        'wallet': wallet.wallet_name,
        'balance': new_balance
    }