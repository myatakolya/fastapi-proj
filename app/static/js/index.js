(function() {
    // ========== ДЕМО-ДАННЫЕ ОПЕРАЦИЙ ==========
    const demoOperations = {
        1: [
            { date: '2026-07-20', category: 'Пополнение', amount: 500, desc: 'Зарплата' },
            { date: '2026-07-18', category: 'Покупка', amount: -150, desc: 'Продукты' },
            { date: '2026-07-15', category: 'Перевод', amount: -200, desc: 'Другу' },
        ],
        2: [
            { date: '2026-07-21', category: 'Пополнение', amount: 1000, desc: 'Бонус' },
            { date: '2026-07-19', category: 'Покупка', amount: -50, desc: 'Кофе' },
        ],
        3: [
            { date: '2026-07-22', category: 'Снятие', amount: -300, desc: 'Наличные' },
        ],
        4: [
            { date: '2026-07-20', category: 'Пополнение', amount: 2000, desc: 'Дивиденды' },
            { date: '2026-07-17', category: 'Покупка', amount: -500, desc: 'Акции' },
        ],
        5: [
            { date: '2026-07-19', category: 'Пополнение', amount: 700, desc: 'Подарок' },
        ],
        6: [],
        7: [
            { date: '2026-07-21', category: 'Покупка', amount: -1200, desc: 'Билеты' },
            { date: '2026-07-16', category: 'Пополнение', amount: 1500, desc: 'Кэшбэк' },
        ],
        8: [
            { date: '2026-07-18', category: 'Пополнение', amount: 300, desc: 'Стипендия' },
        ],
        9: [
            { date: '2026-07-20', category: 'Покупка', amount: -80, desc: 'Аптека' },
        ],
        10: [
            { date: '2026-07-22', category: 'Покупка', amount: -2500, desc: 'Ремонт' },
        ],
        11: [
            { date: '2026-07-21', category: 'Пополнение', amount: 1000, desc: 'Аренда' },
        ]
    };

    // ========== ПАГИНАЦИЯ ==========
    const cards = document.querySelectorAll('#walletCards .wallet-card');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    const itemsPerPage = 3;
    let currentPage = 1;
    const totalPages = Math.ceil(cards.length / itemsPerPage);

    function showPage(page) {
        cards.forEach(c => c.style.display = 'none');
        const start = (page - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, cards.length);
        for (let i = start; i < end; i++) {
            cards[i].style.display = 'flex';
        }
        pageInfo.textContent = `Страница ${page} из ${totalPages}`;
        prevBtn.disabled = (page === 1);
        nextBtn.disabled = (page === totalPages);
        prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '1';
        nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '1';
        prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
        nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
    }

    prevBtn.addEventListener('click', function() {
        if (currentPage > 1) { currentPage--; showPage(currentPage); }
    });
    nextBtn.addEventListener('click', function() {
        if (currentPage < totalPages) { currentPage++; showPage(currentPage); }
    });
    if (cards.length > 0) showPage(1);
    else { pageInfo.textContent = 'Страница 0 из 0'; prevBtn.disabled = true; nextBtn.disabled = true; }

    // ========== ОБЩИЙ БАЛАНС (МОДАЛКА) ==========
    const modalTotal = document.getElementById('totalModal');
    const modalCloseTotal = document.querySelector('#totalModal .modal-close');
    const totalBalanceBtn = document.getElementById('totalBalanceBtn');
    const modalTotalDisplay = document.getElementById('modalTotalDisplay');

    function calcTotal() {
        let total = 0;
        document.querySelectorAll('.wallet-balance').forEach(el => {
            const text = el.textContent.trim();
            const num = parseFloat(text.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(num)) total += num;
        });
        return total;
    }
    totalBalanceBtn.addEventListener('click', function() {
        modalTotalDisplay.textContent = calcTotal().toFixed(2) + ' ₽';
        modalTotal.style.display = 'block';
    });
    modalCloseTotal.addEventListener('click', function() { modalTotal.style.display = 'none'; });
    window.addEventListener('click', function(e) { if (e.target === modalTotal) modalTotal.style.display = 'none'; });

    // ========== ПОЛНОЭКРАННЫЙ ОВЕРЛЕЙ ДЕТАЛЕЙ ==========
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

    // Элементы формы добавления
    const addOpForm = document.getElementById('addOperationForm');
    const opType = document.getElementById('opType');
    const opAmount = document.getElementById('opAmount');
    const opCategory = document.getElementById('opCategory');
    const opDate = document.getElementById('opDate');
    const opDesc = document.getElementById('opDesc');
    const addOpMsg = document.getElementById('addOpMessage');

    let currentWalletId = null;

    // Функция пересчёта баланса кошелька
    function calculateBalance(walletId) {
        const ops = demoOperations[walletId] || [];
        let balance = 0;
        ops.forEach(op => { balance += op.amount; });
        return balance;
    }

    // Функция отображения операций
    function renderOperations(walletId) {
        const ops = demoOperations[walletId] || [];
        const category = filterCategory.value;
        const dateFrom = filterDateFrom.value;
        const dateTo = filterDateTo.value;

        let filtered = ops;
        if (category !== 'all') {
            filtered = filtered.filter(op => op.category === category);
        }
        if (dateFrom) {
            filtered = filtered.filter(op => op.date >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(op => op.date <= dateTo);
        }
        filtered.sort((a, b) => b.date.localeCompare(a.date));

        if (filtered.length === 0) {
            operationsBody.innerHTML = '';
            noOpsMsg.style.display = 'block';
        } else {
            noOpsMsg.style.display = 'none';
            operationsBody.innerHTML = filtered.map(op => `
                <tr>
                    <td>${op.date}</td>
                    <td>${op.category}</td>
                    <td style="color: ${op.amount >= 0 ? '#0b6e4f' : '#b91c1c'}">${op.amount >= 0 ? '+' : ''}${op.amount.toFixed(2)}</td>
                    <td>${op.desc}</td>
                </tr>
            `).join('');
        }

        const newBalance = calculateBalance(walletId);
        detailBalance.textContent = newBalance.toFixed(2) + ' ₽';
        const card = document.querySelector(`.wallet-card[data-id="${walletId}"]`);
        if (card) {
            const balanceEl = card.querySelector('.wallet-balance');
            if (balanceEl) {
                balanceEl.textContent = newBalance.toFixed(2) + ' ₽';
                card.dataset.balance = newBalance.toFixed(2);
            }
        }
    }

    function openDetail(walletCard) {
        const id = walletCard.dataset.id;
        const name = walletCard.dataset.name;
        currentWalletId = id;
        detailName.textContent = name;
        detailId.textContent = id;
        const today = new Date().toISOString().split('T')[0];
        opDate.value = today;
        opType.value = 'income';
        opAmount.value = '';
        opCategory.value = '';
        opDesc.value = '';
        addOpMsg.textContent = '';
        addOpMsg.className = 'message';
        filterCategory.value = 'all';
        filterDateFrom.value = '';
        filterDateTo.value = '';
        renderOperations(id);
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeDetail() {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Клик по карточке
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            openDetail(this);
        });
    });

    closeOverlayBtn.addEventListener('click', closeDetail);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeDetail();
    });

    // Фильтры
    filterBtn.addEventListener('click', function() {
        if (currentWalletId) renderOperations(currentWalletId);
    });
    resetFilterBtn.addEventListener('click', function() {
        filterCategory.value = 'all';
        filterDateFrom.value = '';
        filterDateTo.value = '';
        if (currentWalletId) renderOperations(currentWalletId);
    });

    // ========== ДОБАВЛЕНИЕ ОПЕРАЦИИ ==========
    addOpForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!currentWalletId) {
            showAddMessage('Ошибка: кошелёк не выбран', true);
            return;
        }
        const type = opType.value;
        const amount = parseFloat(opAmount.value);
        const category = opCategory.value.trim() || (type === 'income' ? 'Пополнение' : 'Покупка');
        const date = opDate.value;
        const desc = opDesc.value.trim() || 'Без описания';

        if (isNaN(amount) || amount <= 0) {
            showAddMessage('Введите положительную сумму', true);
            return;
        }
        if (!date) {
            showAddMessage('Выберите дату', true);
            return;
        }

        let operation = {
            date: date,
            category: category,
            desc: desc,
        };
        if (type === 'income') {
            operation.amount = amount;
        } else {
            operation.amount = -amount;
        }

        if (!demoOperations[currentWalletId]) {
            demoOperations[currentWalletId] = [];
        }
        demoOperations[currentWalletId].push(operation);

        renderOperations(currentWalletId);
        showAddMessage('✅ Операция добавлена', false);
        opAmount.value = '';
        opCategory.value = '';
        opDesc.value = '';
        setTimeout(() => { addOpMsg.textContent = ''; addOpMsg.className = 'message'; }, 3000);
    });

    function showAddMessage(text, isError) {
        addOpMsg.textContent = text;
        addOpMsg.className = 'message' + (isError ? ' error' : ' success');
    }

    // ========== ФОРМА СОЗДАНИЯ (ДЕМО) ==========
    document.getElementById('createForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const msg = document.getElementById('createMessage');
        msg.textContent = '✅ Кошелёк создан (демо)';
        msg.className = 'message success';
        setTimeout(() => { msg.textContent = ''; msg.className = 'message'; }, 3000);
    });

    // ========== ЗАПОЛНЕНИЕ ВЫПАДАЮЩИХ СПИСКОВ ==========
    function populateSelects() {
        const from = document.getElementById('fromWallet');
        const to = document.getElementById('toWallet');
        from.innerHTML = '<option value="">— Отправитель —</option>';
        to.innerHTML = '<option value="">— Получатель —</option>';
        cards.forEach(card => {
            const id = card.dataset.id;
            const name = card.dataset.name;
            const option1 = document.createElement('option');
            option1.value = id;
            option1.textContent = `${name} (${id})`;
            from.appendChild(option1.cloneNode(true));
            to.appendChild(option1);
        });
    }
    populateSelects();
})();