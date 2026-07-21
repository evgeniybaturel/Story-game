// ============================================================
// UI — ИНТЕРФЕЙС, СООБЩЕНИЯ, МОДАЛКА, ФИЧИ
// ============================================================

// ============================================================
// НАВИГАЦИЯ
// ============================================================

function showGameScreen() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('final-screen').classList.add('hidden');
}

function showFinalScreen() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.remove('hidden');
}

function showStartScreen() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.add('hidden');
}

// ============================================================
// ОБНОВЛЕНИЕ UI
// ============================================================

function updateUI(step, status, color) {
    document.getElementById('chat-step').textContent = `Шаг ${step}`;
    document.getElementById('chat-status').textContent = `● ${status}`;
    document.getElementById('chat-status').style.color = color;
}

function setLoading(loading) {
    document.getElementById('send-btn').disabled = loading;
    document.getElementById('chat-input').disabled = loading;
}

// ============================================================
// СООБЩЕНИЯ
// ============================================================

const chatMessages = document.getElementById('chat-messages');

function typeMessage(element, text) {
    let index = 0;
    const speed = 12;
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            setTimeout(type, speed);
        }
    }
    
    type();
}

function addMessage(type, text) {
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    msg.textContent = '';
    chatMessages.appendChild(msg);
    typeMessage(msg, text);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
}

function addMessageInstant(type, text) {
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
}

function addSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'message message-system';
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLastSystemMessage() {
    const msgs = chatMessages.querySelectorAll('.message-system');
    if (msgs.length > 0) {
        chatMessages.removeChild(msgs[msgs.length - 1]);
    }
}

// ============================================================
// МОДАЛЬНОЕ ОКНО
// ============================================================

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(title, content) {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// ============================================================
// РЕНДЕРИНГ ИНВЕНТАРЯ И ЖУРНАЛА
// ============================================================

function renderInventory() {
    if (state.clues.length === 0) {
        return '<div class="empty">Улики пока не найдены</div>';
    }
    
    return state.clues.map((clue, i) => `
        <div class="clue-item">
            <div class="clue-text">${i + 1}. ${clue}</div>
            <div class="clue-meta">Найдено на шаге ${state.step}</div>
        </div>
    `).join('');
}

function renderJournal() {
    if (state.journal.length === 0) {
        return '<div class="empty">История пуста</div>';
    }
    
    return state.journal.map(item => `
        <div class="journal-item">
            <div class="j-type">${item.type}</div>
            <div class="j-text">${item.text}</div>
        </div>
    `).join('');
}

// ============================================================
// 3 ФИЧИ
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Подсказка
    document.getElementById('hint-btn').addEventListener('click', () => {
        if (state.isGenerating || state.isFinished) return;
        document.getElementById('chat-input').value = 'Подскажи, что мне делать дальше';
        sendMessage();
    });

    // Инвентарь
    document.getElementById('inventory-btn').addEventListener('click', () => {
        openModal('📦 Инвентарь', renderInventory());
    });

    // Журнал
    document.getElementById('journal-btn').addEventListener('click', () => {
        openModal('📜 Журнал', renderJournal());
    });
});

console.log('🎨 UI загружен');
