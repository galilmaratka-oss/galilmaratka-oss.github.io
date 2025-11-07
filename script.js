// Telegram WebApp API
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Состояние приложения
let state = {
    instructionCompleted: false,
    dnsList: [],
    vpnList: []
};

// Элементы DOM
const mainScreen = document.getElementById('mainScreen');
const instructionScreen = document.getElementById('instructionScreen');
const vpnListScreen = document.getElementById('vpnListScreen');
const instructionBtn = document.getElementById('instructionBtn');
const bypassBtn = document.getElementById('bypassBtn');
const continueBtn = document.getElementById('continueBtn');
const backFromInstruction = document.getElementById('backFromInstruction');
const backFromVpnList = document.getElementById('backFromVpnList');
const randomDns = document.getElementById('randomDns');
const copyDnsBtn = document.getElementById('copyDnsBtn');
const vpnList = document.getElementById('vpnList');

// Загрузка данных
async function loadData() {
    try {
        // Загрузка DNS списка
        const dnsResponse = await fetch('dnslist');
        const dnsText = await dnsResponse.text();
        state.dnsList = dnsText.split('\n').filter(line => line.trim() !== '');
        
        // Загрузка VPN списка
        const vpnResponse = await fetch('davpninfo.json');
        const vpnData = await vpnResponse.json();
        state.vpnList = vpnData.vpn_list;
        
        // Восстановление состояния из localStorage
        const savedState = localStorage.getItem('bypassState');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            state.instructionCompleted = parsed.instructionCompleted || false;
        }
        
        updateUI();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        tg.showAlert('Ошибка загрузки данных. Проверьте подключение к интернету.');
    }
}

// Получение Telegram User ID
function getTelegramUserId() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return tg.initDataUnsafe.user.id.toString();
    }
    // Fallback для тестирования
    return '123456789';
}

// Получение случайного DNS
function getRandomDns() {
    if (state.dnsList.length === 0) return '';
    
    const randomIndex = Math.floor(Math.random() * state.dnsList.length);
    let dns = state.dnsList[randomIndex];
    
    // Замена плейсхолдера на реальный Telegram User ID
    const userId = getTelegramUserId();
    dns = dns.replace(/<telegram-user-id>/g, userId);
    
    return dns;
}

// Обновление UI
function updateUI() {
    // Обновление состояния кнопки "Бесплатный обход"
    bypassBtn.disabled = !state.instructionCompleted;
    
    // Отображение случайного DNS
    const dns = getRandomDns();
    randomDns.textContent = dns;
    
    // Отображение списка VPN
    renderVpnList();
}

// Рендеринг списка VPN
function renderVpnList() {
    vpnList.innerHTML = '';
    
    if (state.vpnList.length === 0) {
        vpnList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Список VPN пуст</p>';
        return;
    }
    
    state.vpnList.forEach(vpn => {
        const card = document.createElement('div');
        card.className = 'vpn-card';
        
        const operatorsWithBypass = Array.isArray(vpn.operators_with_bypass) 
            ? vpn.operators_with_bypass 
            : [];
        const operatorsWithout = Array.isArray(vpn.operators_without) 
            ? vpn.operators_without 
            : [];
        const programs = Array.isArray(vpn.programs) 
            ? vpn.programs.join(', ') 
            : vpn.programs || 'Не указано';
        
        card.innerHTML = `
            <div class="vpn-header">
                <div class="vpn-name">${escapeHtml(vpn.name)}</div>
                <div class="vpn-success-rate">${escapeHtml(vpn.success_rate)}</div>
            </div>
            <div class="vpn-info">
                <div class="vpn-info-item">
                    <strong>Программы:</strong> ${escapeHtml(programs)}
                </div>
                <div class="vpn-info-item">
                    <strong>Бесплатный период:</strong> ${escapeHtml(vpn.free_period || 'Не указано')}
                </div>
                ${operatorsWithBypass.length > 0 ? `
                    <div class="vpn-info-item">
                        <strong>Операторы с обходом:</strong>
                        <div class="vpn-operators">
                            ${operatorsWithBypass.map(op => 
                                `<span class="operator-tag success">${escapeHtml(op)}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                ${operatorsWithout.length > 0 ? `
                    <div class="vpn-info-item">
                        <strong>Операторы без обхода:</strong>
                        <div class="vpn-operators">
                            ${operatorsWithout.map(op => 
                                `<span class="operator-tag fail">${escapeHtml(op)}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                ${vpn.tariffs && vpn.tariffs.length > 0 ? `
                    <div class="vpn-tariffs">
                        <div class="vpn-tariffs-title">Тарифы:</div>
                        <div class="vpn-tariffs-list">
                            ${vpn.tariffs.map(tariff => 
                                `<span class="tariff-item">${escapeHtml(tariff.period)}: ${escapeHtml(tariff.price)}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                ${vpn.comment ? `
                    <div class="vpn-comment">${escapeHtml(vpn.comment)}</div>
                ` : ''}
            </div>
            <button class="vpn-link-btn" data-ref-link="${escapeHtml(vpn['ref-link'] || '')}">
                Перейти по ссылке
            </button>
        `;
        
        // Обработчик клика на карточку и кнопку
        const linkBtn = card.querySelector('.vpn-link-btn');
        linkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const refLink = linkBtn.getAttribute('data-ref-link');
            if (refLink) {
                window.open(refLink, '_blank');
            } else {
                tg.showAlert('Ссылка не указана');
            }
        });
        
        vpnList.appendChild(card);
    });
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Переключение экранов
function showScreen(screen) {
    mainScreen.classList.remove('active');
    instructionScreen.classList.remove('active');
    vpnListScreen.classList.remove('active');
    
    screen.classList.add('active');
}

// Обработчики событий
instructionBtn.addEventListener('click', () => {
    showScreen(instructionScreen);
});

bypassBtn.addEventListener('click', () => {
    if (state.instructionCompleted) {
        showScreen(vpnListScreen);
    }
});

continueBtn.addEventListener('click', () => {
    state.instructionCompleted = true;
    localStorage.setItem('bypassState', JSON.stringify({
        instructionCompleted: true
    }));
    updateUI();
    showScreen(vpnListScreen);
});

backFromInstruction.addEventListener('click', () => {
    showScreen(mainScreen);
});

backFromVpnList.addEventListener('click', () => {
    showScreen(mainScreen);
});

copyDnsBtn.addEventListener('click', () => {
    const dns = randomDns.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dns).then(() => {
            copyDnsBtn.textContent = 'Скопировано!';
            setTimeout(() => {
                copyDnsBtn.textContent = 'Копировать';
            }, 2000);
        }).catch(() => {
            tg.showAlert('Не удалось скопировать DNS');
        });
    } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = dns;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copyDnsBtn.textContent = 'Скопировано!';
            setTimeout(() => {
                copyDnsBtn.textContent = 'Копировать';
            }, 2000);
        } catch (err) {
            tg.showAlert('Не удалось скопировать DNS');
        }
        document.body.removeChild(textArea);
    }
});

// Инициализация при загрузке
loadData();

// Обработка изменения темы Telegram
if (tg.colorScheme === 'dark') {
    document.body.classList.add('dark-theme');
} else {
    document.body.classList.add('light-theme');
}
