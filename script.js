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
    clues: [],
    journal: []
};

// ============================================================
// API — ЗАПРОСЫ К GROQ
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

async function callGroq(messages, systemPrompt, callback) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        callback('❌ Ошибка: API-ключ не найден.', '');
        return;
    }

    const fullContext = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало расследования';

    const userPrompt = `
Ты — ведущий детективной игры.

Вот ЗАВЯЗКА:
${state.opening || 'Вы находите загадочный предмет на скамейке в парке.'}

Вот что уже произошло:
${fullContext}

Сейчас игроки написали: "${userInput}"

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Твой ответ (2 предложения, коротко, по делу)",
  "clue": "Если игрок нашёл улику — напиши её сюда (одна фраза). Если улики нет — оставь пустым"
}

ПРАВИЛА:
- Отвечай коротко (2 предложения), по делу
- Не расписывай, пиши как живой человек
- Если игрок нашёл улику — укажи её в поле clue
- Без воды
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
                    { role: 'system', content: systemPrompt || 'Ты — ведущий детективной игры. Отвечай коротко (2 предложения), по делу, без воды. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.75,
                max_tokens: 200,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
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
        
        let text = parsed.text || 'Продолжайте расследование.';
        let clue = parsed.clue || '';
        
        if (text.length > 250) {
            text = text.slice(0, 247) + '...';
        }
        
        callback(text, clue);
    } catch (error) {
        console.error('Groq ошибка:', error);
        callback(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`, '');
    }
}

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

function initGame() {
    console.log('🕵️ Детектив запускается...');
    
    const apiKey = getApiKey();
    if (!apiKey) {
        alert('❌ Введите API-ключ Groq');
        return;
    }
    
    state.messages = [];
    state.storyId = Date.now();
    state.isGenerating = false;
    state.isFinished = false;
    state.step = 0;
    state.opening = '';
    state.clues = [];
    state.journal = [];

    document.getElementById('chat-messages').innerHTML = '';
    updateUI(0, 'завязка', '#fbbf24');
    showGameScreen();

    addSystemMessage('ИИ-сыщик готовит дело...');
    setLoading(true);

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай коротко (2 предложения), по делу, без воды. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.';
    const userPrompt = `
Придумай ЗАВЯЗКУ для детективной игры.

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Завязка (2-3 предложения, коротко, по делу)",
  "clue": "Первая улика (одна фраза)"
}

ПРАВИЛА:
- Опиши место, что нашли, первую зацепку
- Коротко, без воды
- Не используй слово "ПЕРО" и "кинотеатр"
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
            temperature: 0.75,
            max_tokens: 200,
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
        if (!rawText) throw new Error('Пустой ответ');
        
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            else throw new Error('Не удалось распарсить JSON');
        }
        
        let text = parsed.text || 'Вы находите загадочный предмет на скамейке в парке.';
        let clue = parsed.clue || '';
        
        state.opening = text;
        if (clue) {
            state.clues.push(clue);
            state.journal.push({ type: '🔍 Улика', text: clue });
        }
        state.journal.push({ type: '📖 Завязка', text: text });
        
        removeLastSystemMessage();
        addMessage('ai', text);
        updateUI(0, 'расследование', '#34d399');
        setLoading(false);
        state.step++;
        saveState();
    })
    .catch(error => {
        console.error('Ошибка завязки:', error);
        removeLastSystemMessage();
        addSystemMessage(`❌ Ошибка: ${error.message}`);
        updateUI(0, 'ошибка', '#ef4444');
        setLoading(false);
    });
}

function sendMessage() {
    if (state.isGenerating || state.isFinished) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    addMessageInstant('user', text);
    input.value = '';
    setLoading(true);
    state.isGenerating = true;
    updateUI(state.step, 'думает...', '#fbbf24');

    const lower = text.toLowerCase();
    if (lower.includes('закончить') || lower.includes('конец') || lower.includes('сдаюсь')) {
        setTimeout(() => finishStory(), 500);
        return;
    }

    state.journal.push({ type: '💬 Действие', text: text });

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай коротко (2 предложения), по делу, без воды. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.';

    callGroq(state.messages, systemPrompt, (response, clue) => {
        if (response.startsWith('❌')) {
            addSystemMessage(response);
            setLoading(false);
            state.isGenerating = false;
            updateUI(state.step, 'ошибка', '#ef4444');
            return;
        }
        
        if (clue) {
            state.clues.push(clue);
            state.journal.push({ type: '🔍 Улика', text: clue });
        }
        
        addMessage('ai', response);
        setLoading(false);
        state.isGenerating = false;
        updateUI(state.step, 'расследование', '#34d399');
        state.step++;
        saveState();
    });
}

function finishStory() {
    if (state.isFinished) return;
    state.isFinished = true;
    updateUI(state.step, 'завершение', '#f59e0b');
    setLoading(true);

    addSystemMessage('ИИ-сыщик подводит итоги...');

    const context = state.messages
        .filter(m => m.type === 'ai' || m.type === 'user')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай коротко (3-4 предложения), по делу, без воды.';
    const userPrompt = `
Детективное расследование завершено. Вот всё, что произошло:
${context}

Напиши ФИНАЛ:
1. Что на самом деле произошло
2. Кто был преступником
3. Что игроки угадали или упустили

Ответь ТОЛЬКО текстом (3-4 предложения). Без воды.
`;

    const apiKey = getApiKey();
    if (!apiKey) {
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = 'Ошибка';
        document.getElementById('final-story').textContent = '❌ API-ключ не найден';
        document.getElementById('final-steps').textContent = state.step;
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
            temperature: 0.75,
            max_tokens: 180
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
        if (!text) throw new Error('Пустой ответ');
        
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = 'Дело раскрыто';
        document.getElementById('final-story').textContent = text;
        document.getElementById('final-steps').textContent = state.step;
        setLoading(false);
        showFinalScreen();
    })
    .catch(error => {
        console.error('Финальная ошибка:', error);
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = 'Ошибка';
        document.getElementById('final-story').textContent = `❌ ${error.message}`;
        document.getElementById('final-steps').textContent = state.step;
        setLoading(false);
        showFinalScreen();
    });
}

function saveState() {
    try {
        const data = {
            messages: state.messages,
            storyId: state.storyId,
            step: state.step,
            isFinished: state.isFinished,
            opening: state.opening,
            clues: state.clues,
            journal: state.journal
        };
        localStorage.setItem('detective_chat_state', JSON.stringify(data));
        document.getElementById('load-btn').style.display = 'block';
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
        state.clues = data.clues || [];
        state.journal = data.journal || [];
        state.isGenerating = false;

        if (state.isFinished) {
            const lastMessages = state.messages.filter(m => m.type === 'ai');
            if (lastMessages.length > 0) {
                document.getElementById('final-title').textContent = 'Дело раскрыто';
                document.getElementById('final-story').textContent = lastMessages[lastMessages.length - 1].text;
                document.getElementById('final-steps').textContent = state.step;
                showFinalScreen();
                return true;
            }
            return false;
        }

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        state.messages.forEach(m => {
            const msg = document.createElement('div');
            msg.className = `message message-${m.type}`;
            msg.textContent = m.text;
            chatMessages.appendChild(msg);
        });

        updateUI(state.step, 'расследование', '#34d399');
        showGameScreen();
        return true;
    } catch (e) {
        return false;
    }
}

// Восстановление ключа
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('groq_api_key');
    if (saved) {
        const input = document.getElementById('api-key');
        if (input) input.value = saved;
    }
});

// ============================================================
// ПОДКЛЮЧЕНИЕ КНОПОК (после загрузки UI)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Кнопка старта
    document.getElementById('start-btn').addEventListener('click', initGame);
    
    // Кнопка загрузки
    document.getElementById('load-btn').addEventListener('click', () => {
        if (!loadState()) {
            alert('Нет сохранённой игры');
        }
    });
    
    // Кнопка отправки
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Enter
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Рестарт
    document.getElementById('restart-btn').addEventListener('click', showStartScreen);
    
    // Копирование
    document.getElementById('copy-btn').addEventListener('click', async () => {
        const title = document.getElementById('final-title').textContent;
        const story = document.getElementById('final-story').textContent;
        const text = `${title}\n\n${story}`;
        try {
            await navigator.clipboard.writeText(text);
            const btn = document.getElementById('copy-btn');
            btn.textContent = 'Скопировано!';
            setTimeout(() => btn.textContent = 'Скопировать', 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            const btn = document.getElementById('copy-btn');
            btn.textContent = 'Скопировано!';
            setTimeout(() => btn.textContent = 'Скопировать', 2000);
        }
    });
});

// Автозагрузка
if (localStorage.getItem('detective_chat_state')) {
    document.getElementById('load-btn').style.display = 'block';
}

console.log('🕵️ Детектив на прогулке загружен');
console.log('🤖 Использует Groq');
