// ============================================================
// СОСТОЯНИЕ
// ============================================================

let state = {
    messages: [],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
    step: 0,
    opening: '',
    actions: ['Осмотреть место', 'Искать улики', 'Спросить']
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
const quickActions = $('quick-actions');

const finalTitle = $('final-title');
const finalStory = $('final-story');
const finalSteps = $('final-steps');
const copyBtn = $('copy-btn');
const restartBtn = $('restart-btn');

// ============================================================
// РАБОТА С КЛЮЧОМ
// ============================================================

function getApiKey() {
    const input = document.getElementById('api-key');
    const key = input ? input.value.trim() : '';
    if (key) {
        localStorage.setItem('groq_api_key', key);
        return key;
    }
    return localStorage.getItem('groq_api_key') || '';
}

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('groq_api_key');
    if (saved) {
        const input = document.getElementById('api-key');
        if (input) input.value = saved;
    }
});

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function addMessage(type, text, isTyping = false) {
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    
    // Если это сообщение ИИ и нужно печатать
    if (type === 'ai' && !isTyping) {
        msg.textContent = '';
        chatMessages.appendChild(msg);
        typeMessage(msg, text, () => {
            // После печати — обновляем кнопки
            if (state.actions && state.actions.length > 0) {
                updateActions(state.actions);
            }
        });
        state.messages.push({ type, text, timestamp: new Date().toISOString() });
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msg;
    }
    
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    state.messages.push({ type, text, timestamp: new Date().toISOString() });
    return msg;
}

function addMessageInstant(type, text) {
    const msg = document.createElement('div');
    msg.className = `message message-${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    state.messages.push({ type, text, timestamp: new Date().toISOString() });
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
// АНИМАЦИЯ ПЕЧАТИ
// ============================================================

function typeMessage(element, text, callback) {
    let index = 0;
    const speed = 15; // мс на символ
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            setTimeout(type, speed);
        } else {
            if (callback) callback();
        }
    }
    
    type();
}

// ============================================================
// ДИНАМИЧЕСКИЕ КНОПКИ
// ============================================================

function updateActions(actions) {
    quickActions.innerHTML = '';
    
    if (!actions || actions.length === 0) {
        actions = ['Осмотреть место', 'Искать улики', 'Спросить'];
    }
    
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn';
        btn.textContent = action;
        btn.title = action;
        btn.dataset.action = action;
        btn.addEventListener('click', () => {
            chatInput.value = action;
            sendMessage();
        });
        quickActions.appendChild(btn);
    });
    
    state.actions = actions;
}

// ============================================================
// ЗАПРОС К GROQ
// ============================================================

async function callGroq(messages, systemPrompt, callback) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        callback('❌ Ошибка: API-ключ не найден. Введите ключ на стартовом экране.', []);
        return;
    }

    const fullContext = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало расследования';

    const userPrompt = `
Ты — ведущий детективной игры для двух игроков, которые гуляют по улице.

Вот ЗАВЯЗКА дела:
${state.opening || 'Вы находите загадочный предмет на скамейке в парке.'}

Вот что уже произошло:
${fullContext}

Сейчас игроки написали: "${userInput}"

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Твой ответ игрокам (2-4 предложения, атмосферно, с деталями)",
  "actions": ["Действие 1", "Действие 2", "Действие 3", "Действие 4"]
}

ПРАВИЛА ДЛЯ ACTIONS:
1. Действия должны ЛОГИЧНО вытекать из твоего ответа
2. Действия должны быть КОНКРЕТНЫМИ (не "Спросить", а "Спросить у кассирши")
3. 3-4 действия, не больше
4. Если игроки уже близки к разгадке — добавь действие "Выдвинуть версию"

ОТВЕТЬ ТОЛЬКО JSON. Без лишнего текста.
`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt || 'Ты — ведущий детективной игры. Отвечай ТОЛЬКО В ФОРМАТЕ JSON. Будь атмосферным, но кратким.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.85,
                max_tokens: 300,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
            callback(`❌ Ошибка Groq: ${errorMsg}`, []);
            return;
        }

        const data = await response.json();
        console.log('Groq ответ:', data);
        
        let rawText = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!rawText) {
            callback('❌ Ошибка: Groq вернул пустой ответ', []);
            return;
        }
        
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            console.error('Ошибка парсинга JSON:', e);
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    callback('❌ Ошибка: Не удалось распарсить ответ ИИ', []);
                    return;
                }
            } else {
                callback('❌ Ошибка: Не удалось распарсить ответ ИИ', []);
                return;
            }
        }
        
        let text = parsed.text || 'Продолжайте расследование.';
        let actions = parsed.actions || ['Осмотреть место', 'Искать улики', 'Спросить'];
        
        // Обрезаем длинный текст, если надо
        if (text.length > 300) {
            text = text.slice(0, 297) + '...';
        }
        
        callback(text, actions);
    } catch (error) {
        console.error('Groq ошибка:', error);
        callback(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`, []);
    }
}

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

function initGame() {
    console.log('🕵️ Детектив запускается...');
    
    const apiKey = getApiKey();
    if (!apiKey) {
        alert('❌ Введите API-ключ Groq в поле на стартовом экране.\nПолучить ключ можно на console.groq.com');
        return;
    }
    
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

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай ТОЛЬКО В ФОРМАТЕ JSON. Будь атмосферным, но кратким.';
    const userPrompt = `
Придумай УНИКАЛЬНУЮ ЗАВЯЗКУ для детективной игры.

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Завязка (3-4 предложения, атмосферно, с деталями)",
  "actions": ["Действие 1", "Действие 2", "Действие 3"]
}

ПРАВИЛА:
- Опиши место, что нашли, первую зацепку
- НЕ используй слово "ПЕРО" и "кинотеатр"
- Действия должны логично вытекать из завязки
`;

    fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.85,
            max_tokens: 250,
            response_format: { type: 'json_object' }
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error?.message || `HTTP ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        let rawText = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!rawText) {
            throw new Error('Пустой ответ');
        }
        
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Не удалось распарсить JSON');
            }
        }
        
        let text = parsed.text || 'Вы находите загадочный предмет на скамейке в парке.';
        let actions = parsed.actions || ['Осмотреть место', 'Искать улики', 'Спросить'];
        
        state.opening = text;
        removeLastSystemMessage();
        // Используем addMessage с печатью
        const msg = document.createElement('div');
        msg.className = 'message message-ai';
        msg.textContent = '';
        chatMessages.appendChild(msg);
        typeMessage(msg, text, () => {
            updateActions(actions);
        });
        state.messages.push({ type: 'ai', text, timestamp: new Date().toISOString() });
        
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
        removeLastSystemMessage();
        addSystemMessage(`❌ Ошибка: ${error.message}`);
        chatStatus.textContent = '● ошибка';
        chatStatus.style.color = '#ef4444';
        sendBtn.disabled = false;
        chatInput.disabled = false;
    });
}

function sendMessage() {
    if (state.isGenerating || state.isFinished) return;

    const text = chatInput.value.trim();
    if (!text) return;

    addMessageInstant('user', text);
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

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай ТОЛЬКО В ФОРМАТЕ JSON. Будь атмосферным, но кратким.';

    callGroq(state.messages, systemPrompt, (response, actions) => {
        if (response.startsWith('❌')) {
            addSystemMessage(response);
            sendBtn.disabled = false;
            chatInput.disabled = false;
            state.isGenerating = false;
            chatStatus.textContent = '● ошибка';
            chatStatus.style.color = '#ef4444';
            return;
        }
        
        // Печатаем ответ ИИ
        const msg = document.createElement('div');
        msg.className = 'message message-ai';
        msg.textContent = '';
        chatMessages.appendChild(msg);
        state.messages.push({ type: 'ai', text: response, timestamp: new Date().toISOString() });
        
        typeMessage(msg, response, () => {
            if (actions && actions.length > 0) {
                updateActions(actions);
            }
        });
        
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

    const apiKey = getApiKey();
    if (!apiKey) {
        removeLastSystemMessage();
        finalTitle.textContent = 'Ошибка';
        finalStory.textContent = '❌ API-ключ не найден';
        finalSteps.textContent = state.step;
        showFinalScreen();
        return;
    }

    fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.85,
            max_tokens: 250
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error?.message || `HTTP ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        let text = data.choices?.[0]?.message?.content?.trim();
        
        if (!text) {
            throw new Error('Пустой ответ');
        }
        
        removeLastSystemMessage();
        finalTitle.textContent = 'Дело раскрыто';
        finalStory.textContent = text;
        finalSteps.textContent = state.step;
        showFinalScreen();
    })
    .catch(error => {
        console.error('Финальная ошибка:', error);
        removeLastSystemMessage();
        finalTitle.textContent = 'Ошибка';
        finalStory.textContent = `❌ ${error.message}`;
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
            opening: state.opening,
            actions: state.actions
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
        state.actions = data.actions || ['Осмотреть место', 'Искать улики', 'Спросить'];
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

        updateActions(state.actions);
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
console.log('🤖 Использует Groq с печатью текста');
