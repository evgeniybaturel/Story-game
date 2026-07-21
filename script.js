// ============================================================
// СОСТОЯНИЕ
// ============================================================

let state = {
    messages: [],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
    step: 0
};

// ============================================================
// DOM
// ============================================================

const $ = (id) => document.getElementById(id);

const startScreen = $('start-screen');
const gameScreen = $('game-screen');
const finalScreen = $('final-screen');

const startBtn = $('start-btn');
const loadBtn = $('load-btn');
const chatMessages = $('chat-messages');
const chatInput = $('chat-input');
const sendBtn = $('send-btn');
const chatStatus = $('chat-status');

const finalTitle = $('final-title');
const finalStory = $('final-story');
const finalSteps = $('final-steps');
const copyBtn = $('copy-btn');
const restartBtn = $('restart-btn');

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function addMessage(type, text) {
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    state.messages.push({ type, text, timestamp: new Date().toISOString() });
}

function addSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'message message-system';
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function callAI(messages, callback) {
    const prompt = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const fullPrompt = `
        Ты — ведущий детективной игры для двух игроков, которые гуляют по улице.

        Это ЧАТ-расследование. Игроки пишут свои действия и вопросы, а ты отвечаешь.

        Важные правила:
        1. Ты — ведущий и рассказчик. Игроки — сыщики.
        2. Игроки могут делать ЧТО УГОДНО: осматривать, идти, спрашивать, разговаривать.
        3. Ты должен логично реагировать на их действия.
        4. Если игроки ошибаются — дай подсказку.
        5. Если игроки близки к разгадке — подтверди или дай последнюю улику.
        6. История должна быть увлекательной и логичной.
        7. Никогда не говори «я не знаю». Всегда придумывай ответ.
        8. Отвечай кратко (1-3 предложения). Будь атмосферным, но без эмодзи.

        Вот история диалога:
        ${prompt}

        Текущий запрос игроков (последнее сообщение): ${messages[messages.length - 1]?.text || 'Начало'}

        ОТВЕТЬ ТОЛЬКО ТЕКСТОМ. Не используй эмодзи.
    `;

    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'openai',
            messages: [
                { role: 'system', content: 'Ты — ведущий детективной игры. Отвечай только текстом, без эмодзи, без форматирования. Будь кратким, но атмосферным.' },
                { role: 'user', content: fullPrompt }
            ],
            temperature: 0.85,
            max_tokens: 150
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('API error');
        return response.json();
    })
    .then(data => {
        const text = data.choices?.[0]?.message?.content?.trim() || 'Извините, не удалось ответить. Попробуйте ещё раз.';
        callback(text);
    })
    .catch(error => {
        console.error('AI Error:', error);
        const fallback = getFallback();
        callback(fallback);
    });
}

function getFallback() {
    const fallbacks = [
        'Вы замечаете что-то странное на земле. Следы ведут к старому фонарю.',
        'В кармане вы находите клочок бумаги с непонятным словом.',
        'Вдалеке вы видите человека, который наблюдает за вами.',
        'На скамейке лежит забытый блокнот с записями.',
        'Из кафе доносится разговор, который привлекает ваше внимание.'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

function initGame() {
    console.log('🕵️ Детектив запускается...');
    
    state.messages = [];
    state.storyId = Date.now();
    state.isGenerating = false;
    state.isFinished = false;
    state.step = 0;

    chatMessages.innerHTML = '';
    chatStatus.textContent = '● завязка';
    chatStatus.style.color = '#fbbf24';

    showGameScreen();

    // Первое сообщение от ИИ (завязка)
    addSystemMessage('ИИ-сыщик готовит дело...');
    chatStatus.textContent = '● готовим дело';
    sendBtn.disabled = true;
    chatInput.disabled = true;

    const openingPrompt = `
        Ты — ведущий детективной игры.

        Напиши ЗАВЯЗКУ для расследования.
        1. Опиши место, где находятся игроки (парк, улица, набережная)
        2. Что они обнаружили (тело, пропажа, странный предмет)
        3. Первая зацепка или странность

        Ответь ТОЛЬКО текстом (2-4 предложения). Без эмодзи.
    `;

    callAI([{ type: 'system', text: openingPrompt }], (text) => {
        // Убираем системное сообщение
        chatMessages.removeChild(chatMessages.lastChild);
        
        addMessage('ai', text);
        chatStatus.textContent = '● расследование';
        chatStatus.style.color = '#34d399';
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();

        state.step++;
        saveState();
    });
}

function sendMessage() {
    if (state.isGenerating || state.isFinished) return;

    const text = chatInput.value.trim();
    if (!text) return;

    // Добавляем сообщение игрока
    addMessage('user', text);
    chatInput.value = '';
    sendBtn.disabled = true;
    chatInput.disabled = true;
    state.isGenerating = true;
    chatStatus.textContent = '● думает...';
    chatStatus.style.color = '#fbbf24';

    // Проверяем, не хочет ли игрок завершить
    const lower = text.toLowerCase();
    if (lower.includes('закончить') || lower.includes('конец') || lower.includes('сдаюсь')) {
        setTimeout(() => {
            finishStory();
        }, 500);
        return;
    }

    // Проверяем, не хочет ли игрок выдвинуть версию
    if (lower.includes('версия') || lower.includes('предположение') || lower.includes('кажется')) {
        // Добавляем системное сообщение
        addSystemMessage('ИИ-сыщик анализирует вашу версию...');
    }

    // Отправляем запрос к ИИ
    callAI(state.messages, (response) => {
        addMessage('ai', response);
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
        state.isGenerating = false;
        chatStatus.textContent = '● расследование';
        chatStatus.style.color = '#34d399';
        state.step++;
        saveState();
    });
}

// ============================================================
// БЫСТРЫЕ КНОПКИ
// ============================================================

document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'Закончить расследование') {
            chatInput.value = 'Закончить расследование';
            sendMessage();
            return;
        }
        if (action === 'Выдвинуть версию') {
            chatInput.value = 'Выдвигаю версию...';
            sendMessage();
            return;
        }
        chatInput.value = action;
        sendMessage();
    });
});

// ============================================================
// ФИНАЛ
// ============================================================

function finishStory() {
    if (state.isFinished) return;
    state.isFinished = true;
    chatStatus.textContent = '● завершение';
    chatStatus.style.color = '#f59e0b';
    sendBtn.disabled = true;
    chatInput.disabled = true;

    addSystemMessage('ИИ-сыщик подводит итоги...');

    const context = state.messages
        .filter(m => m.type === 'ai' || m.type === 'user')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const prompt = `
        Детективное расследование завершено. Вот всё, что произошло:
        ${context}

        Напиши ФИНАЛ:
        1. Что на самом деле произошло
        2. Кто был преступником (если тайна была)
        3. Что игроки угадали или упустили

        Ответь ТОЛЬКО текстом (3-5 предложений). Без эмодзи.
    `;

    callAI([{ type: 'system', text: prompt }], (text) => {
        // Убираем системное сообщение
        const msgs = chatMessages.querySelectorAll('.message-system');
        if (msgs.length > 0) {
            chatMessages.removeChild(msgs[msgs.length - 1]);
        }

        finalTitle.textContent = 'Дело раскрыто';
        finalStory.textContent = text;
        finalSteps.textContent = state.step;

        showFinalScreen();
    });
}

// ============================================================
// НАВИГАЦИЯ
// ============================================================

function showGameScreen() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    finalScreen.classList.add('hidden');
}

function showFinalScreen() {
    startScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    finalScreen.classList.remove('hidden');
}

function showStartScreen() {
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    finalScreen.classList.add('hidden');
}

// ============================================================
// СОХРАНЕНИЕ
// ============================================================

function saveState() {
    try {
        const data = {
            messages: state.messages,
            storyId: state.storyId,
            step: state.step,
            isFinished: state.isFinished
        };
        localStorage.setItem('detective_chat_state', JSON.stringify(data));
        loadBtn.style.display = 'block';
    } catch (e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem('detective_chat_state');
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.messages || data.messages.length === 0) return false;

        state.messages = data.messages || [];
        state.storyId = data.storyId || Date.now();
        state.step = data.step || 0;
        state.isFinished = data.isFinished || false;
        state.isGenerating = false;

        if (state.isFinished) {
            // Показываем финал
            const lastMessages = state.messages.filter(m => m.type === 'ai');
            if (lastMessages.length > 0) {
                finalTitle.textContent = 'Дело раскрыто';
                finalStory.textContent = lastMessages[lastMessages.length - 1].text;
                finalSteps.textContent = state.step;
                showFinalScreen();
                return true;
            }
            return false;
        }

        // Восстанавливаем чат
        chatMessages.innerHTML = '';
        state.messages.forEach(m => {
            const msg = document.createElement('div');
            msg.className = `message message-${m.type}`;
            msg.textContent = m.text;
            chatMessages.appendChild(msg);
        });

        chatStatus.textContent = '● расследование';
        chatStatus.style.color = '#34d399';
        sendBtn.disabled = false;
        chatInput.disabled = false;

        showGameScreen();
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
// КОПИРОВАНИЕ
// ============================================================

copyBtn.addEventListener('click', async () => {
    const text = `${finalTitle.textContent}\n\n${finalStory.textContent}`;
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => copyBtn.textContent = 'Скопировать', 2000);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => copyBtn.textContent = 'Скопировать', 2000);
    }
});

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

startBtn.addEventListener('click', initGame);

loadBtn.addEventListener('click', () => {
    if (!loadState()) {
        alert('Нет сохранённой игры');
    }
});

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

restartBtn.addEventListener('click', showStartScreen);

// ============================================================
// АВТОЗАГРУЗКА
// ============================================================

if (localStorage.getItem('detective_chat_state')) {
    loadBtn.style.display = 'block';
}

console.log('🕵️ Детектив с чатом загружен');
console.log('Пишите действия и вопросы, ИИ будет отвечать');
