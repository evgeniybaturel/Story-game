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
    mystery: '',
    mode: 'detective',
    solution: '',
    hint: '',
    genre: ''
};

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

function getSelectedMode() {
    const active = document.querySelector('.mode-btn.active');
    return active ? active.dataset.mode : 'detective';
}

function initGame() {
    console.log('🕵️ Детектив запускается...');
    
    const apiKey = getApiKey();
    if (!apiKey) {
        alert('❌ Введите API-ключ Groq');
        return;
    }
    
    const mode = getSelectedMode();
    
    state.messages = [];
    state.storyId = Date.now();
    state.isGenerating = false;
    state.isFinished = false;
    state.step = 0;
    state.opening = '';
    state.clues = [];
    state.mystery = '';
    state.mode = mode;
    state.solution = '';
    state.hint = '';
    state.genre = '';

    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('game-title').textContent = mode === 'detective' ? '🕵️ Дело' : '❓ Данетки';
    updateUI(0, 'завязка', '#fbbf24');
    showGameScreen();

    addSystemMessage(mode === 'detective' ? 'ИИ-сыщик готовит дело...' : 'ИИ загадывает загадку...');
    setLoading(true);

    const systemPrompt = 'Ты — ведущий игры. Отвечай по делу, коротко, без воды. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.';
    
    let userPrompt = '';
    
    if (mode === 'detective') {
        userPrompt = `
Придумай ДЕТЕКТИВНОЕ ДЕЛО со случайным жанром.

Жанры на выбор: Убийство, Исчезновение, Кража, Мистика, Шпионаж, Семейная тайна.

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Завязка (2-3 предложения, атмосферно, с местом и находкой)",
  "mystery": "Тайна (одна фраза, что нужно раскрыть)",
  "genre": "Выбранный жанр"
}

ПРАВИЛА:
- НЕ ДОБАВЛЯЙ УЛИКУ в завязку
- Игрок сам должен найти первую улику в процессе расследования
`;
    } else {
        userPrompt = `
Придумай ЗАГАДОЧНУЮ СИТУАЦИЮ для игры ДАНЕТКИ.

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Краткое описание ситуации (1-2 предложения, загадочно, без разгадки)",
  "solution": "Полная разгадка (что на самом деле произошло, 2-3 предложения)",
  "hint": "Первая подсказка для игроков (если они попросят)"
}

ПРАВИЛА:
- Ситуация должна быть загадочной, но логичной
- Разгадка — полное объяснение
- Подсказка — намёк, не раскрывающий всё
- Пример: 'Человек лежит на полу в луже воды. Он мёртв.' → разгадка: 'Он менял воду в аквариуме, поскользнулся, ударился головой и захлебнулся'
`;
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
            max_tokens: 350,
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
        
        let text = parsed.text || 'Загадочная ситуация.';
        
        if (mode === 'detective') {
            state.mystery = parsed.mystery || 'Выяснить, что произошло';
            state.genre = parsed.genre || 'Неизвестно';
            state.opening = text;
        } else {
            state.opening = text;
            state.solution = parsed.solution || 'Разгадка неизвестна';
            state.hint = parsed.hint || 'Подумайте логически';
        }
        
        removeLastSystemMessage();
        addMessage('ai', text);
        
        state.step++;
        updateUI(state.step, mode === 'detective' ? 'расследование' : 'загадка', '#34d399');
        
        setLoading(false);
        saveState();
    })
    .catch(error => {
        console.error('Ошибка:', error);
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

    const systemPrompt = 'Ты — ведущий игры. Отвечай по делу, коротко, без воды. НЕ НАЧИНАЙ ЗАНОВО. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.';

    callGroq(state.messages, systemPrompt, (response, clue) => {
        if (response.startsWith('❌')) {
            addSystemMessage(response);
            setLoading(false);
            state.isGenerating = false;
            updateUI(state.step, 'ошибка', '#ef4444');
            return;
        }
        
        // Проверка для данеток: угадал ли игрок
        if (state.mode === 'danetki' && clue === 'УГАДАЛ') {
            addMessage('ai', '🎉 Поздравляем! Вы угадали разгадку!');
            setLoading(false);
            state.isGenerating = false;
            finishStory();
            return;
        }
        
        if (clue && state.mode === 'detective') {
            const exists = state.clues.some(c => c.toLowerCase() === clue.toLowerCase());
            if (!exists) {
                state.clues.push(clue);
            }
        }
        
        addMessage('ai', response);
        setLoading(false);
        state.isGenerating = false;
        updateUI(state.step, state.mode === 'detective' ? 'расследование' : 'загадка', '#34d399');
        state.step++;
        saveState();
    });
}

function finishStory() {
    if (state.isFinished) return;
    state.isFinished = true;
    updateUI(state.step, 'завершение', '#f59e0b');
    setLoading(true);

    addSystemMessage('ИИ подводит итоги...');

    const context = state.messages
        .filter(m => m.type === 'ai' || m.type === 'user')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    let systemPrompt = '';
    let userPrompt = '';

    if (state.mode === 'detective') {
        systemPrompt = 'Ты — ведущий детективной игры. Отвечай коротко (3-4 предложения), по делу, без воды.';
        userPrompt = `
Детективное расследование завершено. Вот всё, что произошло:
${context}

Игроки нашли улики: ${state.clues.join(', ') || 'ни одной'}

Напиши ФИНАЛ:
1. Что на самом деле произошло
2. Кто был преступником (или что произошло)
3. Что игроки угадали или упустили

Ответь ТОЛЬКО текстом (3-4 предложения). Без воды.
`;
    } else {
        systemPrompt = 'Ты — ведущий игры Данетки. Отвечай коротко (2-3 предложения).';
        userPrompt = `
Игра Данетки завершена. Вот что было:
Загадка: ${state.opening}
Разгадка: ${state.solution}

Игроки задавали вопросы:
${context}

Напиши ФИНАЛ:
1. Разгадку ситуации (полное объяснение)
2. Что игроки угадали или упустили

Ответь ТОЛЬКО текстом (2-3 предложения). Без воды.
`;
}
          
