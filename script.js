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
// ОТПРАВКА ЗАПРОСА К POLLINATIONS (улучшенная)
// ============================================================

function callAI(messages, callback) {
    // Собираем ВСЮ историю целиком
    const fullContext = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    // Последнее сообщение пользователя
    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало расследования';

    const fullPrompt = `
Ты — ведущий детективной игры для двух игроков, которые гуляют по улице. Это ОДНА НЕПРЕРЫВНАЯ ИСТОРИЯ.

Вот ЗАВЯЗКА дела (это начало, от которого нельзя отходить):
${state.opening || 'Вы находите тело на скамейке в парке. В руке мужчины — клочок бумаги со словом "ПЕРО". Рядом — следы, ведущие в сторону старого кинотеатра.'}

Вот ВСЯ ИСТОРИЯ целиком (все сообщения):
${fullContext}

Сейчас игроки написали: "${userInput}"

ТВОЙ ОТВЕТ ДОЛЖЕН БЫТЬ:
1. Минимум 2 полных предложения
2. Развивать историю — каждая улика ведёт к следующей
3. Если игроки спросили про конкретное место — дай улику, связанную с ним
4. Добавляй атмосферные детали: звуки, запахи, свет, погоду, настроение
5. НЕ ОБРЫВАЙ мысль на полуслове

ЗАПРЕЩЕНО:
- Отвечать одним коротким предложением
- Говорить "вы видите" и останавливаться
- Повторять предыдущие улики
- Использовать эмодзи

ПРИМЕР ХОРОШЕГО ОТВЕТА:
"Человек стоит у старого фонаря, но когда вы подходите ближе, он исчезает. На земле вы замечаете следы, которые ведут в сторону кинотеатра. Внутри вы слышите голоса."

ПРИМЕР ПЛОХОГО ОТВЕТА (НИКОГДА ТАК НЕ ДЕЛАЙ):
"Вдалеке вы видите человека." — это слишком коротко и не развивает историю.

ОТВЕТЬ ТОЛЬКО ТЕКСТОМ (2-4 предложения). Без эмодзи.
`;

    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3', // попробуй также 'openai', 'qwen-7b', 'gpt-oss-20b'
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — ведущий детективной игры. Отвечай ТОЛЬКО ПОЛНЫМИ ПРЕДЛОЖЕНИЯМИ (2-4 предложения). Никогда не обрывай мысль на полуслове. Добавляй атмосферные детали: звуки, запахи, погоду. Не используй эмодзи. Если игроки спросили про конкретное место — дай улику, связанную с этим местом.`
                },
                { role: 'user', content: fullPrompt }
            ],
            temperature: 0.9,
            max_tokens: 300
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('API error');
        return response.json();
    })
    .then(data => {
        let text = data.choices?.[0]?.message?.content?.trim() || 'Извините, не удалось ответить. Попробуйте ещё раз.';
        
        // Проверяем, не обрывается ли текст
        if (text.length > 0 && !text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
            text += ' Продолжайте расследование.';
        }
        
        // Если ответ слишком короткий (< 50 символов) — добавляем развитие
        if (text.length < 50) {
            const continuations = [
                ' Вы замечаете что-то странное вокруг.',
                ' Это заставляет вас задуматься.',
                ' Возможно, это ключ к разгадке.'
            ];
            text += continuations[Math.floor(Math.random() * continuations.length)];
        }
        
        callback(text);
    })
    .catch(error => {
        console.error('AI Error:', error);
        const fallback = getFallback();
        callback(fallback);
    });
}

// ============================================================
// ЗАПАСНЫЕ ФРАЗЫ (если API не отвечает)
// ============================================================

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

    const openingPrompt = `
Ты — ведущий детективной игры для двух игроков, которые гуляют по улице.

Напиши ЗАВЯЗКУ для расследования.
1. Опиши место, где находятся игроки (парк, улица, набережная, сквер)
2. Что они обнаружили (тело, пропажа, странный предмет, следы)
3. Первая зацепка или странность

Важно: завязка должна быть ИНТРИГУЮЩЕЙ, но давать пространство для расследования. Добавь атмосферные детали (звуки, запахи, погоду).

Ответь ТОЛЬКО текстом (3-4 предложения). Без эмодзи.
`;

    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3',
            messages: [
                { role: 'system', content: 'Ты — ведущий детективной игры. Отвечай только текстом, без эмодзи, без форматирования. Будь атмосферным.' },
                { role: 'user', content: openingPrompt }
            ],
            temperature: 0.85,
            max_tokens: 200
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('API error');
        return response.json();
    })
    .then(data => {
        let text = data.choices?.[0]?.message?.content?.trim() || 'Вы находите тело на скамейке в парке. В руке мужчины — клочок бумаги со словом "ПЕРО". Рядом — следы, ведущие в сторону старого кинотеатра.';
        
        // Проверяем, не обрывается ли текст
        if (text.length > 0 && !text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
            text += ' Вы чувствуете, что это только начало.';
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
        console.error('Error:', error);
        const fallback = 'Вы находите тело на скамейке в парке. В руке мужчины — клочок бумаги со словом "ПЕРО". Рядом — следы, ведущие в сторону старого кинотеатра.';
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

    const prompt = `
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3',
            messages: [
                { role: 'system', content: 'Ты — ведущий детективной игры. Отвечай только текстом, без эмодзи, без форматирования. Будь атмосферным.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.85,
            max_tokens: 250
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
console.log('Использует Pollinations.ai (модель: llama-3)');
