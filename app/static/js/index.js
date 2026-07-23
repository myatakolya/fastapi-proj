(function() {
    const API_BASE = '/api/v1';
    const TOKEN_KEY = 'fastapi_login';

    function formatNumber(value) {
        let num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toFixed(2);
    }

    // ===== ЭЛЕМЕНТЫ =====
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');
    const authModalTitle = document.getElementById('authModalTitle');
    const authModalDesc = document.getElementById('authModalDesc');
    const authForm = document.getElementById('authForm');
    const authLogin = document.getElementById('authLogin');
    const authMessage = document.getElementById('authMessage');
    const authBtn = document.getElementById('authBtn');

    const authStatus = document.getElementById('authStatus');
    const authLoginBtn = document.getElementById('authLoginBtn');
    const authRegisterBtn = document.getElementById('authRegisterBtn');
    const authLogoutBtn = document.getElementById('authLogoutBtn');

    const actionButtons = document.getElementById('actionButtons');
    const transferBtn = document.getElementById('transferBtn');

    const toast = document.getElementById('toast');
    let toastTimeout = null;

    function showToast(message, duration = 3000) {
        if (!toast) {
            alert(message);
            return;
        }
        if (toastTimeout) clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    let currentAuthMode = 'login';
    let appInitialized = false;

    async function rawRequest(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (!response.ok) {
            let errorText = await response.text();
            try {
                const json = JSON.parse(errorText);
                errorText = json.detail || errorText;
            } catch (e) {}
            throw new Error(errorText || `Ошибка ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        return null;
    }

    async function authenticate(login) {
        try {
            await rawRequest('/users/me', {
                headers: { 'Authorization': `Bearer ${login}` }
            });
            return true;
        } catch (err) {
            throw new Error('Неверный логин или пользователь не существует');
        }
    }

    async function register(login) {
        try {
            await rawRequest('/users', {
                method: 'POST',
                body: JSON.stringify({ login: login })
            });
            return true;
        } catch (err) {
            throw new Error('Не удалось зарегистрироваться: ' + err.message);
        }
    }

    function isAuthorized() {
        return !!localStorage.getItem(TOKEN_KEY);
    }

    function updateUI(isLoggedIn, login = '') {
        if (isLoggedIn) {
            authStatus.textContent = login;
            authLoginBtn.style.display = 'none';
            authRegisterBtn.style.display = 'none';
            authLogoutBtn.style.display = 'inline-block';
            if (actionButtons) actionButtons.classList.remove('disabled');
            if (transferBtn) transferBtn.classList.remove('disabled');
        } else {
            authStatus.textContent = 'Гость';
            authLoginBtn.style.display = 'inline-block';
            authRegisterBtn.style.display = 'inline-block';
            authLogoutBtn.style.display = 'none';
            if (actionButtons) actionButtons.classList.add('disabled');
            if (transferBtn) transferBtn.classList.add('disabled');
        }
    }

    function openAuthModal(mode) {
        currentAuthMode = mode;
        if (mode === 'login') {
            authModalTitle.textContent = '🔐 Вход';
            authModalDesc.textContent = 'Введите ваш логин для входа.';
            authBtn.textContent = 'Войти';
        } else {
            authModalTitle.textContent = '📝 Регистрация';
            authModalDesc.textContent = 'Создайте нового пользователя.';
            authBtn.textContent = 'Зарегистрироваться';
        }
        authLogin.value = '';
        authMessage.textContent = '';
        authMessage.className = 'message';
        authModal.style.display = 'block';
    }

    function closeAuthModal() {
        authModal.style.display = 'none';
    }

    authLoginBtn.addEventListener('click', () => openAuthModal('login'));
    authRegisterBtn.addEventListener('click', () => openAuthModal('register'));
    authModalClose.addEventListener('click', closeAuthModal);
    window.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const login = authLogin.value.trim();
        if (!login) {
            authMessage.textContent = 'Введите логин';
            authMessage.className = 'message error';
            return;
        }
        authBtn.disabled = true;
        authBtn.textContent = 'Загрузка...';
        try {
            if (currentAuthMode === 'login') {
                await authenticate(login);
            } else {
                await register(login);
                await authenticate(login);
            }
            localStorage.setItem(TOKEN_KEY, login);
            authMessage.textContent = '✅ Успешно!';
            authMessage.className = 'message success';
            updateUI(true, login);
            closeAuthModal();
            window.location.reload();
        } catch (err) {
            authMessage.textContent = '❌ ' + err.message;
            authMessage.className = 'message error';
        } finally {
            authBtn.disabled = false;
            authBtn.textContent = currentAuthMode === 'login' ? 'Войти' : 'Зарегистрироваться';
        }
    });

    authLogoutBtn.addEventListener('click', function() {
        localStorage.removeItem(TOKEN_KEY);
        updateUI(false);
        window.location.reload();
    });

    // ===== ОСНОВНОЕ ПРИЛОЖЕНИЕ =====
    let currentPage = 1;
    const itemsPerPage = 3;
    let allWallets = [];
    let filteredWallets = [];

    function initApp() {
        if (appInitialized) return;
        appInitialized = true;

        async function apiRequest(endpoint, options = {}) {
            const login = localStorage.getItem(TOKEN_KEY);
            if (!login) {
                throw new Error('Требуется авторизация');
            }
            const url = `${API_BASE}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${login}`,
                    ...options.headers,
                },
                ...options,
            });
            if (!response.ok) {
                let errorText = await response.text();
                try {
                    const json = JSON.parse(errorText);
                    errorText = json.detail || errorText;
                } catch (e) {}
                if (response.status === 401) {
                    localStorage.removeItem(TOKEN_KEY);
                    updateUI(false);
                    appInitialized = false;
                    showToast('⚠️ Сессия истекла, войдите заново');
                    window.location.reload();
                    throw new Error('Сессия истекла');
                }
                throw new Error(errorText || `Ошибка ${response.status}`);
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            return null;
        }

        // ===== DOM =====
        const cardsContainer = document.getElementById('walletCards');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        const createForm = document.getElementById('createForm');
        const createMsg = document.getElementById('createMessage');
        const totalBalanceBtn = document.getElementById('totalBalanceBtn');
        const modalTotal = document.getElementById('totalModal');
        const modalCloseTotal = document.querySelector('#totalModal .modal-close');
        const modalTotalDisplay = document.getElementById('modalTotalDisplay');

        const overlay = document.getElementById('walletDetailOverlay');
        const closeOverlayBtn = document.getElementById('closeDetailOverlay');
        const detailName = document.getElementById('detailWalletName');
        const detailId = document.getElementById('detailWalletId');
        const detailBalance = document.getElementById('detailWalletBalance');
        const operationsBody = document.getElementById('operationsBody');
        const noOpsMsg = document.getElementById('noOperationsMessage');
        const filterCategory = document.getElementById('filterCategory');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');
        const filterBtn = document.getElementById('filterBtn');
        const resetFilterBtn = document.getElementById('resetFilterBtn');

        const addOpForm = document.getElementById('addOperationForm');
        const opType = document.getElementById('opType');
        const opAmount = document.getElementById('opAmount');
        const opDesc = document.getElementById('opDesc');
        const addOpMsg = document.getElementById('addOpMessage');

        const globalFilterCategory = document.getElementById('globalFilterCategory');
        const globalFilterDateFrom = document.getElementById('globalFilterDateFrom');
        const globalFilterDateTo = document.getElementById('globalFilterDateTo');
        const globalFilterBtn = document.getElementById('globalFilterBtn');
        const globalResetFilterBtn = document.getElementById('globalResetFilterBtn');
        const globalOperationsBody = document.getElementById('globalOperationsBody');
        const globalNoOpsMsg = document.getElementById('globalNoOperationsMessage');

        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');

        const exportCsvModal = document.getElementById('exportCsvModal');
        const exportCsvModalClose = document.getElementById('exportCsvModalClose');
        const exportCsvForm = document.getElementById('exportCsvForm');
        const exportDateFrom = document.getElementById('exportDateFrom');
        const exportDateTo = document.getElementById('exportDateTo');
        const exportFileName = document.getElementById('exportFileName');
        const exportCsvCancel = document.getElementById('exportCsvCancel');
        const exportCsvMessage = document.getElementById('exportCsvMessage');

        // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
        function openExportCsvModal() {
            if (!isAuthorized()) {
                showToast('⚠️ Для экспорта необходимо авторизоваться.');
                openAuthModal('login');
                return;
            }
            const now = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            exportDateFrom.value = oneMonthAgo.toISOString().split('T')[0];
            exportDateTo.value = now.toISOString().split('T')[0];
            exportFileName.value = 'operations.csv';
            exportCsvMessage.textContent = '';
            exportCsvMessage.className = 'message';
            exportCsvModal.style.display = 'block';
        }

        function closeExportCsvModal() {
            exportCsvModal.style.display = 'none';
        }

        // ===== ОБРАБОТЧИКИ =====
        const createToggleLabel = document.querySelector('.create-toggle-btn');
        if (createToggleLabel) {
            createToggleLabel.removeEventListener('click', createToggleLabel._clickHandler);
            createToggleLabel._clickHandler = function(e) {
                if (!isAuthorized()) {
                    e.preventDefault();
                    showToast('⚠️ Для создания кошелька необходимо авторизоваться.');
                    openAuthModal('login');
                    return;
                }
            };
            createToggleLabel.addEventListener('click', createToggleLabel._clickHandler);
        }

        // ===== ПАГИНАЦИЯ =====
        function renderWalletCards(wallets) {
            if (!cardsContainer) return;
            cardsContainer.innerHTML = '';
            const paginationEl = document.getElementById('pagination');
            if (!wallets || wallets.length === 0) {
                cardsContainer.innerHTML = '<p class="empty">Кошельков пока нет</p>';
                if (paginationEl) paginationEl.style.display = 'none';
                return;
            }
            if (paginationEl) paginationEl.style.display = 'flex';
            wallets.forEach(w => {
                const card = document.createElement('div');
                card.className = 'wallet-card';
                card.dataset.id = w.id;
                card.dataset.name = w.name;
                card.dataset.balance = w.balance;
                card.style.cursor = 'pointer';
                const formattedBalance = formatNumber(w.balance);
                card.innerHTML = `
                    <div class="wallet-name">${w.name}</div>
                    <div class="wallet-id">ID: ${w.id}</div>
                    <div class="wallet-balance">${formattedBalance} ${w.currency.toUpperCase()}</div>
                `;
                card.removeEventListener('click', card._clickHandler);
                card._clickHandler = function(e) {
                    if (!isAuthorized()) {
                        showToast('⚠️ Для просмотра деталей необходимо авторизоваться.');
                        openAuthModal('login');
                        return;
                    }
                    e.stopPropagation();
                    openDetail(this);
                };
                card.addEventListener('click', card._clickHandler);
                cardsContainer.appendChild(card);
            });
            filteredWallets = wallets;
            const totalPages = Math.ceil(wallets.length / itemsPerPage);
            currentPage = 1;
            showPage(1, wallets);
        }

        function showPage(page, wallets) {
            const totalPages = Math.ceil(wallets.length / itemsPerPage);
            if (page < 1) page = 1;
            if (page > totalPages) page = totalPages;
            currentPage = page;
            const start = (page - 1) * itemsPerPage;
            const end = Math.min(start + itemsPerPage, wallets.length);
            if (!cardsContainer) return;
            const cards = cardsContainer.querySelectorAll('.wallet-card');
            cards.forEach((c, idx) => {
                c.style.display = (idx >= start && idx < end) ? 'flex' : 'none';
            });
            if (pageInfo) pageInfo.textContent = `Страница ${page} из ${totalPages || 1}`;
            if (prevBtn) {
                prevBtn.disabled = (page <= 1);
                prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '1';
                prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
            }
            if (nextBtn) {
                nextBtn.disabled = (page >= totalPages);
                nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '1';
                nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
            }
        }

        // ===== ЗАГРУЗКА КОШЕЛЬКОВ =====
        async function loadWallets() {
            try {
                const wallets = await apiRequest('/wallets');
                allWallets = wallets;
                renderWalletCards(wallets);
                populateSelects(wallets);
                if (document.getElementById('tabOperations').checked && isAuthorized()) {
                    loadGlobalOperations();
                }
            } catch (err) {
                console.error('Ошибка загрузки кошельков:', err);
                if (cardsContainer) cardsContainer.innerHTML = `<p class="error">Не удалось загрузить кошельки: ${err.message}</p>`;
            }
        }

        // ===== СОЗДАНИЕ КОШЕЛЬКА =====
        if (createForm) {
            createForm.removeEventListener('submit', createForm._submitHandler);
            createForm._submitHandler = async function(e) {
                e.preventDefault();
                if (!isAuthorized()) {
                    showToast('⚠️ Для создания кошелька необходимо авторизоваться.');
                    openAuthModal('login');
                    return;
                }
                const nameInput = document.getElementById('walletName');
                const balanceInput = document.getElementById('walletBalance');
                const currencySelect = document.getElementById('walletCurrency');
                const name = nameInput ? nameInput.value.trim().slice(0, 50) : '';
                const balance = balanceInput ? parseFloat(balanceInput.value) || 0 : 0;
                const currency = currencySelect ? currencySelect.value : 'rub';
                if (balance > 999999999.99) {
                    showMessage(createMsg, 'Сумма не может превышать 999 999 999.99', true);
                    return;
                }
                if (!name) {
                    showMessage(createMsg, 'Введите название кошелька', true);
                    return;
                }
                try {
                    await apiRequest('/wallets', {
                        method: 'POST',
                        body: JSON.stringify({
                            wallet_name: name,
                            initial_balance: balance,
                            currency: currency,
                        }),
                    });
                    showMessage(createMsg, `Кошелёк "${name}" создан!`, false);
                    if (nameInput) nameInput.value = '';
                    if (balanceInput) balanceInput.value = '';
                    await loadWallets();
                    if (isAuthorized()) loadGlobalOperations();
                } catch (err) {
                    showMessage(createMsg, err.message, true);
                }
            };
            createForm.addEventListener('submit', createForm._submitHandler);
        }

        function showMessage(el, text, isError = false) {
            if (!el) return;
            el.textContent = text;
            el.className = 'message' + (isError ? ' error' : ' success');
            setTimeout(() => { el.textContent = ''; el.className = 'message'; }, 5000);
        }

        // ===== ОБЩИЙ БАЛАНС =====
        if (totalBalanceBtn) {
            totalBalanceBtn.removeEventListener('click', totalBalanceBtn._clickHandler);
            totalBalanceBtn._clickHandler = async function() {
                if (!isAuthorized()) {
                    showToast('⚠️ Для просмотра общего баланса необходимо авторизоваться.');
                    openAuthModal('login');
                    return;
                }
                try {
                    const data = await apiRequest('/balance');
                    const total = parseFloat(data.total_balance);
                    if (modalTotalDisplay) modalTotalDisplay.textContent = `${formatNumber(total)} ${data.currency.toUpperCase()}`;
                    if (modalTotal) modalTotal.style.display = 'block';
                } catch (err) {
                    showToast('❌ Ошибка: ' + err.message);
                }
            };
            totalBalanceBtn.addEventListener('click', totalBalanceBtn._clickHandler);
        }
        if (modalCloseTotal) {
            modalCloseTotal.addEventListener('click', () => {
                if (modalTotal) modalTotal.style.display = 'none';
            });
        }
        window.addEventListener('click', (e) => {
            if (e.target === modalTotal) {
                if (modalTotal) modalTotal.style.display = 'none';
            }
        });

        // ===== ОВЕРЛЕЙ =====
        let currentWalletId = null;
        let currentWalletName = null;

        function openDetail(card) {
            const id = parseInt(card.dataset.id);
            const name = card.dataset.name;
            const balance = parseFloat(card.dataset.balance);
            currentWalletId = id;
            currentWalletName = name;
            if (detailName) detailName.textContent = name;
            if (detailId) detailId.textContent = id;
            if (detailBalance) detailBalance.textContent = formatNumber(balance) + ' ₽';
            if (filterCategory) filterCategory.value = 'all';
            if (filterDateFrom) filterDateFrom.value = '';
            if (filterDateTo) filterDateTo.value = '';
            if (opType) opType.value = 'income';
            if (opAmount) opAmount.value = '';
            if (opDesc) opDesc.value = '';
            if (addOpMsg) { addOpMsg.textContent = ''; addOpMsg.className = 'message'; }
            loadOperations(id);
            if (overlay) {
                overlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeDetail() {
            if (overlay) overlay.style.display = 'none';
            document.body.style.overflow = '';
        }

        async function loadOperations(walletId) {
            try {
                const params = new URLSearchParams();
                params.append('wallet_id', walletId);
                const dateFrom = filterDateFrom ? filterDateFrom.value : '';
                const dateTo = filterDateTo ? filterDateTo.value : '';
                if (dateFrom) params.append('date_from', new Date(dateFrom).toISOString());
                if (dateTo) params.append('date_to', new Date(dateTo).toISOString());
                const ops = await apiRequest(`/operations?${params.toString()}`);
                updateCategoryFilter(ops);
                renderOperations(ops);
            } catch (err) {
                console.error('Ошибка загрузки операций:', err);
                if (operationsBody) operationsBody.innerHTML = `<tr><td colspan="4" class="error">${err.message}</td></tr>`;
            }
        }

        function updateCategoryFilter(ops) {
            const categories = new Set();
            ops.forEach(op => {
                if (op.category) categories.add(op.category);
            });
            const currentVal = filterCategory ? filterCategory.value : 'all';
            if (filterCategory) {
                filterCategory.innerHTML = '<option value="all">Все категории</option>';
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    filterCategory.appendChild(opt);
                });
                if (currentVal && categories.has(currentVal)) {
                    filterCategory.value = currentVal;
                }
            }
        }

        function renderOperations(ops) {
            const category = filterCategory ? filterCategory.value : 'all';
            let filtered = ops;
            if (category !== 'all') {
                filtered = filtered.filter(op => op.category === category);
            }
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            if (!operationsBody) return;
            if (filtered.length === 0) {
                operationsBody.innerHTML = '';
                if (noOpsMsg) noOpsMsg.style.display = 'block';
                return;
            }
            if (noOpsMsg) noOpsMsg.style.display = 'none';
            operationsBody.innerHTML = filtered.map(op => {
                const amount = parseFloat(op.amount);
                const sign = amount >= 0 ? '+' : '';
                const formatted = formatNumber(amount);
                const color = amount >= 0 ? '#0b6e4f' : '#b91c1c';
                return `
                    <tr>
                        <td>${new Date(op.created_at).toLocaleDateString()}</td>
                        <td>${op.category || '—'}</td>
                        <td style="color: ${color}">${sign}${formatted}</td>
                        <td>${op.description || '—'}</td>
                    </tr>
                `;
            }).join('');
        }

        // ===== ДОБАВЛЕНИЕ ОПЕРАЦИИ =====
        if (addOpForm) {
            addOpForm.removeEventListener('submit', addOpForm._submitHandler);
            addOpForm._submitHandler = async function(e) {
                e.preventDefault();
                if (!isAuthorized()) {
                    showToast('⚠️ Для добавления операции необходимо авторизоваться.');
                    openAuthModal('login');
                    return;
                }
                if (!currentWalletId || !currentWalletName) {
                    showAddMessage('Ошибка: кошелёк не выбран', true);
                    return;
                }
                const type = opType ? opType.value : 'income';
                const amount = opAmount ? parseFloat(opAmount.value) : 0;
                const description = opDesc ? opDesc.value.trim().slice(0, 255) : '';
                if (isNaN(amount) || amount <= 0) {
                    showAddMessage('Введите положительную сумму', true);
                    return;
                }
                if (amount > 999999999.99) {
                    showAddMessage('Сумма не может превышать 999 999 999.99', true);
                    return;
                }
                try {
                    const endpoint = type === 'income' ? '/operations/income' : '/operations/expense';
                    const body = {
                        wallet_name: currentWalletName,
                        amount: amount,
                        description: description,
                    };
                    await apiRequest(endpoint, {
                        method: 'POST',
                        body: JSON.stringify(body),
                    });
                    showAddMessage('✅ Операция добавлена', false);
                    await loadOperations(currentWalletId);
                    await loadWallets();
                    if (isAuthorized()) loadGlobalOperations();
                    const wallet = allWallets.find(w => w.id === currentWalletId);
                    if (wallet && detailBalance) {
                        detailBalance.textContent = formatNumber(wallet.balance) + ' ₽';
                    }
                    if (opAmount) opAmount.value = '';
                    if (opDesc) opDesc.value = '';
                } catch (err) {
                    showAddMessage(err.message, true);
                }
            };
            addOpForm.addEventListener('submit', addOpForm._submitHandler);
        }

        function showAddMessage(text, isError) {
            if (!addOpMsg) return;
            addOpMsg.textContent = text;
            addOpMsg.className = 'message' + (isError ? ' error' : ' success');
            setTimeout(() => { addOpMsg.textContent = ''; addOpMsg.className = 'message'; }, 3000);
        }

        // ===== ФИЛЬТРЫ =====
        if (filterBtn) {
            filterBtn.removeEventListener('click', filterBtn._clickHandler);
            filterBtn._clickHandler = function() {
                if (currentWalletId) loadOperations(currentWalletId);
            };
            filterBtn.addEventListener('click', filterBtn._clickHandler);
        }
        if (resetFilterBtn) {
            resetFilterBtn.removeEventListener('click', resetFilterBtn._clickHandler);
            resetFilterBtn._clickHandler = function() {
                if (filterCategory) filterCategory.value = 'all';
                if (filterDateFrom) filterDateFrom.value = '';
                if (filterDateTo) filterDateTo.value = '';
                if (currentWalletId) loadOperations(currentWalletId);
            };
            resetFilterBtn.addEventListener('click', resetFilterBtn._clickHandler);
        }

        // ===== ЗАКРЫТИЕ ОВЕРЛЕЯ =====
        if (closeOverlayBtn) {
            closeOverlayBtn.removeEventListener('click', closeOverlayBtn._clickHandler);
            closeOverlayBtn._clickHandler = closeDetail;
            closeOverlayBtn.addEventListener('click', closeOverlayBtn._clickHandler);
        }
        if (overlay) {
            overlay.removeEventListener('click', overlay._clickHandler);
            overlay._clickHandler = function(e) {
                if (e.target === overlay) closeDetail();
            };
            overlay.addEventListener('click', overlay._clickHandler);
        }

        // ===== ВЫПАДАЮЩИЕ СПИСКИ =====
        function populateSelects(wallets) {
            const from = document.getElementById('fromWallet');
            const to = document.getElementById('toWallet');
            if (!from || !to) return;
            const fromVal = from.value;
            const toVal = to.value;
            from.innerHTML = '<option value="">— Отправитель —</option>';
            to.innerHTML = '<option value="">— Получатель —</option>';
            wallets.forEach(w => {
                const opt1 = document.createElement('option');
                opt1.value = w.id;
                opt1.textContent = w.name;
                from.appendChild(opt1);
                const opt2 = document.createElement('option');
                opt2.value = w.id;
                opt2.textContent = w.name;
                to.appendChild(opt2);
            });
            if (fromVal) from.value = fromVal;
            if (toVal) to.value = toVal;
        }

        // ===== ПЕРЕВОД =====
        const transferForm = document.getElementById('transferForm');
        if (transferForm) {
            transferForm.removeEventListener('submit', transferForm._submitHandler);
            transferForm._submitHandler = async function(e) {
                e.preventDefault();
                if (!isAuthorized()) {
                    showToast('⚠️ Для выполнения перевода необходимо авторизоваться.');
                    openAuthModal('login');
                    return;
                }
                const fromId = parseInt(document.getElementById('fromWallet').value);
                const toId = parseInt(document.getElementById('toWallet').value);
                const amount = parseFloat(document.getElementById('transferAmount').value);
                const msg = document.getElementById('transferMessage');
                if (!fromId || !toId) {
                    showMessage(msg, 'Выберите отправителя и получателя', true);
                    return;
                }
                if (fromId === toId) {
                    showMessage(msg, 'Отправитель и получатель должны различаться', true);
                    return;
                }
                if (isNaN(amount) || amount <= 0) {
                    showMessage(msg, 'Введите положительную сумму', true);
                    return;
                }
                if (amount > 999999999.99) {
                    showMessage(msg, 'Сумма не может превышать 999 999 999.99', true);
                    return;
                }
                try {
                    await apiRequest('/operations/transfer', {
                        method: 'POST',
                        body: JSON.stringify({
                            from_wallet_id: fromId,
                            to_wallet_id: toId,
                            amount: amount,
                        }),
                    });
                    showMessage(msg, 'Перевод выполнен!', false);
                    document.getElementById('transferAmount').value = '';
                    await loadWallets();
                    if (isAuthorized()) loadGlobalOperations();
                } catch (err) {
                    showMessage(msg, err.message, true);
                }
            };
            transferForm.addEventListener('submit', transferForm._submitHandler);
        }

        // ===== ПАГИНАЦИЯ =====
        if (prevBtn) {
            prevBtn.removeEventListener('click', prevBtn._clickHandler);
            prevBtn._clickHandler = function() {
                if (currentPage > 1) {
                    showPage(currentPage - 1, filteredWallets);
                }
            };
            prevBtn.addEventListener('click', prevBtn._clickHandler);
        }
        if (nextBtn) {
            nextBtn.removeEventListener('click', nextBtn._clickHandler);
            nextBtn._clickHandler = function() {
                const totalPages = Math.ceil(filteredWallets.length / itemsPerPage);
                if (currentPage < totalPages) {
                    showPage(currentPage + 1, filteredWallets);
                }
            };
            nextBtn.addEventListener('click', nextBtn._clickHandler);
        }

        // ===== ГЛОБАЛЬНЫЕ ОПЕРАЦИИ =====
        async function loadGlobalOperations() {
            if (!isAuthorized()) {
                showToast('⚠️ Для просмотра операций необходимо авторизоваться.');
                openAuthModal('login');
                return;
            }
            try {
                const params = new URLSearchParams();
                const dateFrom = globalFilterDateFrom ? globalFilterDateFrom.value : '';
                const dateTo = globalFilterDateTo ? globalFilterDateTo.value : '';
                if (dateFrom) params.append('date_from', new Date(dateFrom).toISOString());
                if (dateTo) params.append('date_to', new Date(dateTo).toISOString());
                const ops = await apiRequest(`/operations?${params.toString()}`);
                updateGlobalCategoryFilter(ops);
                renderGlobalOperations(ops);
            } catch (err) {
                console.error('Ошибка загрузки операций:', err);
                if (globalOperationsBody) globalOperationsBody.innerHTML = `<tr><td colspan="4" class="error">${err.message}</td></tr>`;
            }
        }

        function updateGlobalCategoryFilter(ops) {
            const categories = new Set();
            ops.forEach(op => {
                if (op.category) categories.add(op.category);
            });
            const currentVal = globalFilterCategory ? globalFilterCategory.value : 'all';
            if (globalFilterCategory) {
                globalFilterCategory.innerHTML = '<option value="all">Все категории</option>';
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    globalFilterCategory.appendChild(opt);
                });
                if (currentVal && categories.has(currentVal)) {
                    globalFilterCategory.value = currentVal;
                }
            }
        }

        function renderGlobalOperations(ops) {
            const category = globalFilterCategory ? globalFilterCategory.value : 'all';
            let filtered = ops;
            if (category !== 'all') {
                filtered = filtered.filter(op => op.category === category);
            }
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            if (!globalOperationsBody) return;
            if (filtered.length === 0) {
                globalOperationsBody.innerHTML = '';
                if (globalNoOpsMsg) globalNoOpsMsg.style.display = 'block';
                return;
            }
            if (globalNoOpsMsg) globalNoOpsMsg.style.display = 'none';
            globalOperationsBody.innerHTML = filtered.map(op => {
                const amount = parseFloat(op.amount);
                const sign = amount >= 0 ? '+' : '';
                const formatted = formatNumber(amount);
                const color = amount >= 0 ? '#0b6e4f' : '#b91c1c';
                const wallet = allWallets.find(w => w.id === op.wallet_id);
                const walletName = wallet ? wallet.name : '—';
                return `
                    <tr>
                        <td>${new Date(op.created_at).toLocaleDateString()}</td>
                        <td>${walletName}</td>
                        <td>${op.category || '—'}</td>
                        <td style="color: ${color}">${sign}${formatted}</td>
                    </tr>
                `;
            }).join('');
        }

        if (globalFilterBtn) {
            globalFilterBtn.removeEventListener('click', globalFilterBtn._clickHandler);
            globalFilterBtn._clickHandler = function() {
                loadGlobalOperations();
            };
            globalFilterBtn.addEventListener('click', globalFilterBtn._clickHandler);
        }
        if (globalResetFilterBtn) {
            globalResetFilterBtn.removeEventListener('click', globalResetFilterBtn._clickHandler);
            globalResetFilterBtn._clickHandler = function() {
                if (globalFilterCategory) globalFilterCategory.value = 'all';
                if (globalFilterDateFrom) globalFilterDateFrom.value = '';
                if (globalFilterDateTo) globalFilterDateTo.value = '';
                loadGlobalOperations();
            };
            globalResetFilterBtn.addEventListener('click', globalResetFilterBtn._clickHandler);
        }

        // ===== КНОПКИ ЭКСПОРТА =====
        function handleExport(format) {
            if (!isAuthorized()) {
                showToast('⚠️ Для экспорта необходимо авторизоваться.');
                openAuthModal('login');
                return;
            }
            showToast(`📤 Экспорт в ${format} будет реализован в следующей версии.`);
        }

        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => handleExport('Excel'));
        }
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => handleExport('PDF'));
        }

        if (exportCsvBtn) {
            exportCsvBtn.removeEventListener('click', exportCsvBtn._clickHandler);
            exportCsvBtn._clickHandler = openExportCsvModal;
            exportCsvBtn.addEventListener('click', exportCsvBtn._clickHandler);
        }

        if (exportCsvModalClose) {
            exportCsvModalClose.addEventListener('click', closeExportCsvModal);
        }
        if (exportCsvCancel) {
            exportCsvCancel.addEventListener('click', closeExportCsvModal);
        }
        window.addEventListener('click', (e) => {
            if (e.target === exportCsvModal) closeExportCsvModal();
        });

        // ===== ЭКСПОРТ CSV – ИСПРАВЛЕННЫЙ ОБРАБОТЧИК =====
        if (exportCsvForm) {
            exportCsvForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                // Получаем значения
                let dateFrom = exportDateFrom.value;
                let dateTo = exportDateTo.value;
                const fileName = exportFileName.value.trim() || 'operations.csv';

                const token = localStorage.getItem(TOKEN_KEY);
                if (!token) {
                    showToast('⚠️ Требуется авторизация. Войдите в систему.');
                    openAuthModal('login');
                    return;
                }

                // Преобразуем дату из DD.MM.YYYY в YYYY-MM-DD (если введена вручную)
                function toISODate(str) {
                    if (!str) return '';
                    // Если уже YYYY-MM-DD, возвращаем как есть
                    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                    // Пробуем разобрать DD.MM.YYYY
                    const parts = str.split('.');
                    if (parts.length === 3) {
                        const [day, month, year] = parts;
                        if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
                            return `${year}-${month}-${day}`;
                        }
                    }
                    // Если ничего не подошло, возвращаем исходную строку (может, это уже ISO)
                    return str;
                }

                const dateFromISO = toISODate(dateFrom);
                const dateToISO = toISODate(dateTo);

                // Проверка корректности дат
                if (dateFromISO && !/^\d{4}-\d{2}-\d{2}$/.test(dateFromISO)) {
                    showToast('⚠️ Неверный формат даты "от". Используйте ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.');
                    return;
                }
                if (dateToISO && !/^\d{4}-\d{2}-\d{2}$/.test(dateToISO)) {
                    showToast('⚠️ Неверный формат даты "до". Используйте ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.');
                    return;
                }

                if (dateFromISO && dateToISO && dateFromISO > dateToISO) {
                    showToast('⚠️ Дата "от" не может быть позже даты "до".');
                    return;
                }

                try {
                    const params = new URLSearchParams();
                    if (dateFromISO) params.append('date_from', dateFromISO);
                    if (dateToISO) params.append('date_to', dateToISO);
                    params.append('filename', fileName);

                    const url = `/api/v1/export/csv?${params.toString()}`;
                    console.log('Sending request to:', url);

                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        let errorText = await response.text();
                        try {
                            const json = JSON.parse(errorText);
                            errorText = json.detail || errorText;
                        } catch (e) {}
                        throw new Error(errorText || 'Ошибка экспорта');
                    }

                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(downloadUrl);

                    closeExportCsvModal();
                    showToast(`✅ Файл "${fileName}" успешно скачан.`);
                } catch (err) {
                    showToast('❌ Ошибка: ' + err.message);
                }
            });
        }

        // ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДКИ =====
        const tabOperationsLabel = document.querySelector('label[for="tabOperations"]');
        if (tabOperationsLabel) {
            tabOperationsLabel.addEventListener('click', function() {
                setTimeout(() => {
                    if (document.getElementById('tabOperations').checked && isAuthorized()) {
                        loadGlobalOperations();
                    }
                }, 100);
            });
        }

        // ===== ЗАПУСК =====
        if (isAuthorized()) {
            loadWallets();
        } else {
            if (cardsContainer) cardsContainer.innerHTML = '<p class="empty">Войдите, чтобы увидеть кошельки</p>';
            const paginationEl = document.getElementById('pagination');
            if (paginationEl) paginationEl.style.display = 'none';
            if (globalOperationsBody) globalOperationsBody.innerHTML = '<tr><td colspan="4" class="empty">Войдите, чтобы увидеть операции</td></tr>';
        }
    }

    // ===== СТАРТ =====
    const savedLogin = localStorage.getItem(TOKEN_KEY);
    if (savedLogin) {
        (async function check() {
            try {
                await rawRequest('/users/me', {
                    headers: { 'Authorization': `Bearer ${savedLogin}` }
                });
                updateUI(true, savedLogin);
                initApp();
            } catch (err) {
                localStorage.removeItem(TOKEN_KEY);
                updateUI(false);
                initApp();
            }
        })();
    } else {
        updateUI(false);
        initApp();
    }
})();