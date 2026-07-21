WALLETS: dict[str, float] = {}

def is_wallet_exist(wallet_name: str) -> bool:
    return wallet_name in WALLETS

def add_income(wallet_name: str, amount: float) -> float:
    WALLETS[wallet_name] += amount
    return WALLETS[wallet_name]

def get_wallet_balance_by_name(wallet_name: str) -> float:
    return WALLETS[wallet_name]

def add_expense(wallet_name: str, amount: float) -> float:
    WALLETS[wallet_name] -= amount
    return WALLETS[wallet_name]

def get_all_wallets() -> dict[str, float]:
    return WALLETS.copy()

def create_wallet(wallet_name: str, amount: float) -> float:
    WALLETS[wallet_name] = amount
    return WALLETS[wallet_name]