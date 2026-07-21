// ============================================================
// СОСТОЯНИЕ
// ============================================================

let state = {
    messages: [],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
    step: 0,
    opening: ''
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
// УНИКАЛЬНЫЕ ЗАВЯЗКИ (запасные, если API не отвечает)
// ============================================================

const FALLBACK_OPENINGS = [
    "Вы находите тело на скамейке в парке. В руке мужчины — клочок бумаги со словом 'ПЕРО'. Рядом — следы, ведущие в сторону старого кинотеатра.",
    "На набережной вы замечаете странный свет. Подойдя ближе, вы видите открытый чемодан, полный старых фотографий. На одной из них — дата: сегодняшний день, но 50 лет назад.",
    "Вход в парк перекрыт полицейской лентой. Охранник шепчет: 'Не ходите к фонтану. Там что-то нашли'. Вы слышите, как кто-то плачет в кустах.",
    "Вы гуляете по пустынной улочке и замечаете, что все фонари на ней погасли. Кроме одного — под ним стоит человек в плаще и держит конверт с вашим именем.",
    "В кафе официант случайно роняет записку: 'Они уже близко. Сожги это'. Вы поднимаете её и замечаете, что написана она вашим почерком.",
    "Вы находите старую карту в книге, которую взяли в уличной библиотеке. На ней отмечено место, которого не существует, но вы точно знаете, где оно находится.",
    "Ночью вам звонит неизвестный номер. Голос говорит: 'Ты должен прийти на стадион. Времени мало'. Когда вы приходите, стадион пуст, но на трибуне лежит ключ.",
    "В новой квартире вы находите тайную комнату. Стены покрыты иероглифами, а на полу — свежие следы. Кто-то был здесь до вас.",
    "На пляже волны выносят бутылку с запиской. Язык вам незнаком, но подпись — ваша. И дата — завтрашний день.",
    "В метро незнакомец передаёт вам ключ и шепчет: 'Откроешь — изменишь всё'. Ключ подходит к ячейке камеры хранения на вокзале."
];

function getRandomOpening() {
    return FALLBACK_OPENINGS[Math.floor(Math.random() * FALLBACK_OPENINGS.length)];
}

function getFallback() {
    const fallbacks = [
        'Вы замечаете что-то странное на земле. Следы ведут к старому фонарю, и там вы находите обрывок ткани с вышитой буквой "М".',
        'Из кафе доносится разговор. Вы слышите голос, который говорит: "Она знала слишком много". Заходите внутрь и видите человека в красном пальто.',
        'На земле вы находите ключ. Он подходит к двери старого особняка, который стоит на краю парка. Внутри слышны шаги.',
        'Кинотеатр закрыт, но за углом вы видите открытое окно. На подоконнике лежит старый билет, и на нём есть отпечаток пальца.',
        'Вдалеке вы видите фигуру, которая наблюдает за вами. Когда вы подходите ближе, она исчезает за углом.'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

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

function removeLastSystemMessage() {
    const msgs = chatMessages.querySelectorAll('.message-system');
    if (msgs.length > 0) {
        chatMessages.removeChild(msgs[msgs.length - 1]);
    }
}

// ============================================================
// ОТПРАВКА ЗАПРОСА К POLLINATIONS (ИСПРАВЛЕННАЯ)
// ============================================================

function callAI(messages, callback) {
    // Собираем контекст
    const fullContext = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало расследования';

    const systemPrompt = `Ты — ведущий детективной игры. Отвечай ТОЛЬКО ПОЛНЫМИ ПРЕДЛОЖЕНИЯМИ (2-4 предложения). Никогда не обрывай мысль. Добавляй детали: звуки, запахи, погоду. Не используй эмодзи.`;

    const userPrompt = `
Ты — ведущий детективной игры для двух игроков.

Вот ЗАВЯЗКА дела:
${state.opening || 'Вы находите загадочный предмет на скамейке в парке.'}

Вот что уже произошло:
${fullContext}

Сейчас игроки написали: "${userInput}"

Ответь КРАТКО (2-4 предложения), но ПОЛНО. Развивай историю. Не обрывай мысль.
`;

    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'openai'
        })
    })
    .then(response => {
        console.log('Статус ответа:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Ответ ИИ:', data);
        let text = data.choices?.[0]?.message?.content?.trim();
        
        if (!text) {
            throw new Error('Пустой ответ');
        }
        
        // Проверяем, не обрывается ли текст
        if (text.length > 0 && !text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
            text += ' Продолжайте расследование.';
        }
        
        callback(text);
    })
    .catch(error => {
        console.error('Ошибка:', error);
        callback(getFallback());
    });
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
    state.opening = '';

    chatMessages.innerHTML = '';
    chatStatus.textContent = '● завязка';
    chatStatus.style.color = '#fbbf24';

    showGameScreen();

    addSystemMessage('ИИ-сыщик готовит дело...');
    chatStatus.textContent = '● готовим дело';
    sendBtn.disabled = true;
    chatInput.disabled = true;

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай только текстом, без эмодзи. Будь атмосферным. Придумывай НОВЫЕ, НЕПОВТОРЯЮЩИЕСЯ завязки.';
    const userPrompt = `
Придумай УНИКАЛЬНУЮ ЗАВЯЗКУ для детективной игры.
Опиши место, что нашли, и первую зацепку.
НЕ используй слово "ПЕРО" и "кинотеатр".
Ответь ТОЛЬКО текстом (3-4 предложения).
`;

    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'openai'
        })
    })
    .then(response => {
        console.log('Статус завязки:', response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(data => {
        let text = data.choices?.[0]?.message?.content?.trim();
        
        if (!text || text.length < 20) {
            throw new Error('Пустой ответ');
        }
        
        state.opening = text;
        removeLastSystemMessage();
        addMessage('ai', text);
        chatStatus.textContent = '● расследование';
        chatStatus.style.color = '#34d399';
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
        state.step++;
        saveState();
    })
    .catch(error => {
        console.error('Ошибка завязки:', error);
        // Используем случайную запасную завязку
        const fallback = getRandomOpening();
        state.opening = fallback;
        removeLastSystemMessage();
        addMessage('ai', fallback);
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

    addMessage('user', text);
    chatInput.value = '';
    sendBtn.disabled = true;
    chatInput.disabled = true;
    state.isGenerating = true;
    chatStatus.textContent = '● думает...';
    chatStatus.style.color = '#fbbf24';

    const lower = text.toLowerCase();
    if (lower.includes('закончить') || lower.includes('конец') || lower.includes('сдаюсь')) {
        setTimeout(() => {
            finishStory();
        }, 500);
        return;
    }

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

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай только текстом, без эмодзи. Будь атмосферным.';
    const userPrompt = `
Детективное расследование завершено. Вот всё, что произошло:
${context}

Напиши ФИНАЛ:
1. Что на самом деле произошло
2. Кто был преступником (если тайна была)
3. Что игроки угадали или упустили
4. Добавь атмосферную концовку

Ответь ТОЛЬКО текстом (3-5 предложений). Без эмодзи.
`;

    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'openai'
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('API error');
        return response.json();
    })
    .then(data => {
        let text = data.choices?.[0]?.message?.content?.trim() || 'Дело остаётся нераскрытым. Но вы сделали всё, что могли.';
        
        if (text.length > 0 && !text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
            text += ' Возможно, в другой раз вам повезёт больше.';
        }
        
        removeLastSystemMessage();
        finalTitle.textContent = 'Дело раскрыто';
        finalStory.textContent = text;
        finalSteps.textContent = state.step;
        showFinalScreen();
    })
    .catch(error => {
        console.error('Error:', error);
        removeLastSystemMessage();
        finalTitle.textContent = 'Дело раскрыто';
        finalStory.textContent = 'Дело остаётся нераскрытым. Но вы сделали всё, что могли.';
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
            isFinished: state.isFinished,
            opening: state.opening
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
        state.opening = data.opening || '';
        state.isGenerating = false;

        if (state.isFinished) {
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
// ОБРАБОТЧИКИ
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

console.log('🕵️ Детектив на прогулке загружен');
console.log('🌐 Использует Pollinations.ai (модель: openai)');
