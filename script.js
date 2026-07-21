// ============================================================
// СОСТОЯНИЕ
// ============================================================

window.state = {
    messages: [],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
    step: 0,
    opening: '',
    clues: [],
    mystery: ''
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

    const fullHistory = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало расследования';

    const allClues = window.state.clues.length > 0 
        ? `\nУЖЕ НАЙДЕННЫЕ УЛИКИ (НЕ ПОВТОРЯЙ ИХ):\n${window.state.clues.map((c, i) => `${i+1}. ${c}`).join('\n')}`
        : '';

    const summary = `
КРАТКАЯ СВОДКА:
- Завязка: ${window.state.opening || 'нет'}
- Тайна: ${window.state.mystery || 'неизвестна'}
- Улик найдено: ${window.state.clues.length}
`;

    const userPrompt = `
Ты — ведущий детективной игры.

${summary}

Вот ПОЛНАЯ ИСТОРИЯ:
${fullHistory}

Сейчас игроки написали: "${userInput}"

ВАЖНО:
1. Это ОДНО РАССЛЕДОВАНИЕ, не начинай заново
2. НЕ ПОВТОРЯЙ завязку
3. Продолжай историю с того места, где остановился

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Твой ответ (2-3 предложения, продолжай историю)",
  "clue": "Если игрок нашёл НОВУЮ улику — напиши её сюда. Если нет — оставь пустым."
}

ПРАВИЛА:
1. НЕ НАЧИНАЙ ЗАНОВО
2. НЕ ПОВТОРЯЙ уже найденные улики
3. Отвечай ПО ДЕЛУ, коротко
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
                    { role: 'system', content: systemPrompt || 'Ты — ведущий детективной игры. Отвечай по делу, коротко, без воды. НЕ НАЧИНАЙ ЗАНОВО. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 250,
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
        
        if (clue && window.state.clues.some(c => c.toLowerCase() === clue.toLowerCase())) {
            clue = '';
        }
        
        if (text.length > 300) {
            text = text.slice(0, 297) + '...';
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
    
    window.state.messages = [];
    window.state.storyId = Date.now();
    window.state.isGenerating = false;
    window.state.isFinished = false;
    window.state.step = 0;
    window.state.opening = '';
    window.state.clues = [];
    window.state.mystery = '';

    document.getElementById('chat-messages').innerHTML = '';
    updateUI(0, 'завязка', '#fbbf24');
    showGameScreen();

    addSystemMessage('ИИ-сыщик готовит дело...');
    setLoading(true);

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай по делу, коротко, без воды. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.';
    const userPrompt = `
Придумай ДЕТЕКТИВНОЕ ДЕЛО.

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Завязка (2-3 предложения, атмосферно)",
  "mystery": "Тайна (одна фраза)",
  "clue": "Первая улика (одна фраза)"
}
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
            temperature: 0.8,
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
        if (!rawText) throw new Error('Пустой ответ');
        
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            else throw new Error('Не удалось распарсить JSON');
        }
        
        let text = parsed.text || 'Вы находите загадочный предмет.';
        let mystery = parsed.mystery || 'Выяснить, что произошло';
        let clue = parsed.clue || '';
        
        window.state.opening = text;
        window.state.mystery = mystery;
        
        if (clue) {
            window.state.clues.push(clue);
        }
        
        removeLastSystemMessage();
        addMessage('ai', text);
        updateUI(0, 'расследование', '#34d399');
        setLoading(false);
        window.state.step++;
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
    if (window.state.isGenerating || window.state.isFinished) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    addMessageInstant('user', text);
    input.value = '';
    setLoading(true);
    window.state.isGenerating = true;
    updateUI(window.state.step, 'думает...', '#fbbf24');

    const lower = text.toLowerCase();
    if (lower.includes('закончить') || lower.includes('конец') || lower.includes('сдаюсь')) {
        setTimeout(() => finishStory(), 500);
        return;
    }

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай по делу, коротко, без воды. НЕ НАЧИНАЙ ЗАНОВО. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.';

    callGroq(window.state.messages, systemPrompt, (response, clue) => {
        if (response.startsWith('❌')) {
            addSystemMessage(response);
            setLoading(false);
            window.state.isGenerating = false;
            updateUI(window.state.step, 'ошибка', '#ef4444');
            return;
        }
        
        if (clue) {
            const exists = window.state.clues.some(c => c.toLowerCase() === clue.toLowerCase());
            if (!exists) {
                window.state.clues.push(clue);
            }
        }
        
        addMessage('ai', response);
        setLoading(false);
        window.state.isGenerating = false;
        updateUI(window.state.step, 'расследование', '#34d399');
        window.state.step++;
        saveState();
    });
}

function finishStory() {
    if (window.state.isFinished) return;
    window.state.isFinished = true;
    updateUI(window.state.step, 'завершение', '#f59e0b');
    setLoading(true);

    addSystemMessage('ИИ-сыщик подводит итоги...');

    const context = window.state.messages
        .filter(m => m.type === 'ai' || m.type === 'user')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const systemPrompt = 'Ты — ведущий детективной игры. Отвечай коротко (3-4 предложения), по делу, без воды.';
    const userPrompt = `
Детективное расследование завершено. Вот всё, что произошло:
${context}

Игроки нашли улики: ${window.state.clues.join(', ')}

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
        document.getElementById('final-steps').textContent = window.state.step;
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
            temperature: 0.8,
            max_tokens: 200
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
        document.getElementById('final-steps').textContent = window.state.step;
        setLoading(false);
        showFinalScreen();
    })
    .catch(error => {
        console.error('Финальная ошибка:', error);
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = 'Ошибка';
        document.getElementById('final-story').textContent = `❌ ${error.message}`;
        document.getElementById('final-steps').textContent = window.state.step;
        setLoading(false);
        showFinalScreen();
    });
}

function saveState() {
    try {
        const data = {
            messages: window.state.messages,
            storyId: window.state.storyId,
            step: window.state.step,
            isFinished: window.state.isFinished,
            opening: window.state.opening,
            clues: window.state.clues,
            mystery: window.state.mystery
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

        window.state.messages = data.messages || [];
        window.state.storyId = data.storyId || Date.now();
        window.state.step = data.step || 0;
        window.state.isFinished = data.isFinished || false;
        window.state.opening = data.opening || '';
        window.state.clues = data.clues || [];
        window.state.mystery = data.mystery || '';
        window.state.isGenerating = false;

        if (window.state.isFinished) {
            const lastMessages = window.state.messages.filter(m => m.type === 'ai');
            if (lastMessages.length > 0) {
                document.getElementById('final-title').textContent = 'Дело раскрыто';
                document.getElementById('final-story').textContent = lastMessages[lastMessages.length - 1].text;
                document.getElementById('final-steps').textContent = window.state.step;
                showFinalScreen();
                return true;
            }
            return false;
        }

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        window.state.messages.forEach(m => {
            const msg = document.createElement('div');
            msg.className = `message message-${m.type}`;
            msg.textContent = m.text;
            chatMessages.appendChild(msg);
        });

        updateUI(window.state.step, 'расследование', '#34d399');
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
// ПОДКЛЮЧЕНИЕ КНОПОК
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-btn').addEventListener('click', initGame);
    
    document.getElementById('load-btn').addEventListener('click', () => {
        if (!loadState()) {
            alert('Нет сохранённой игры');
        }
    });
    
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById('restart-btn').addEventListener('click', showStartScreen);
    
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
