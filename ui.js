// ============================================================
// UI — ИНТЕРФЕЙС, СООБЩЕНИЯ, МОДАЛКА, ИНВЕНТАРЬ
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

function updateUI(status, color) {
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
    
    if (window.state && window.state.messages) {
        window.state.messages.push({ type, text, timestamp: new Date().toISOString() });
    }
    return msg;
}

function addMessageInstant(type, text) {
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (window.state && window.state.messages) {
        window.state.messages.push({ type, text, timestamp: new Date().toISOString() });
    }
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
// МОДАЛЬНОЕ ОКНО (ИНВЕНТАРЬ)
// ============================================================

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openInventory() {
    const clues = window.state && window.state.clues ? window.state.clues : [];
    
    if (clues.length === 0) {
        modalBody.innerHTML = '<div class="empty">Улики пока не найдены</div>';
    } else {
        modalBody.innerHTML = clues.map((clue, i) => `
            <div class="clue-item">
                <div class="clue-text">${i + 1}. ${clue}</div>
                <div class="clue-meta">Найдено во время расследования</div>
            </div>
        `).join('');
    }
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
// ПОДКЛЮЧЕНИЕ КНОПОК UI
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('inventory-toggle').addEventListener('click', openInventory);
});

console.log('🎨 UI загружен');
