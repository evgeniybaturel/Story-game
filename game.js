// ============================================================
// СОСТОЯНИЕ (ГЛОБАЛЬНОЕ)
// ============================================================

window.state = {
    messages: [],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
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
    
    window.state.messages = [];
    window.state.storyId = Date.now();
    window.state.isGenerating = false;
    window.state.isFinished = false;
    window.state.opening = '';
    window.state.clues = [];
    window.state.mystery = '';
    window.state.mode = mode;
    window.state.solution = '';
    window.state.hint = '';
    window.state.genre = '';

    document.getElementById('chat-messages').innerHTML = '';
    
    // Скрываем инвентарь в данетках
    const inventoryToggle = document.getElementById('inventory-toggle');
    if (mode === 'danetki') {
        inventoryToggle.classList.add('hidden');
    } else {
        inventoryToggle.classList.remove('hidden');
    }
    
    updateUI('завязка', '#fbbf24');
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

ПРАВИЛА ДЛЯ ЗАВЯЗКИ:
- НЕ ДОБАВЛЯЙ УЛИКУ в завязку
- Игрок сам должен найти первую улику в процессе расследования
- Чётко определи персонажей (дай им имена или роли)
- Создай интригу — игрок должен хотеть узнать, что произошло
`;
    } else {
        userPrompt = `
Придумай ЗАГАДОЧНУЮ СИТУАЦИЮ для игры ДАНЕТКИ.

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Описание ситуации (2 предложения). Должна быть СТРАННАЯ, но КОНКРЕТНАЯ сцена.",
  "solution": "Полная разгадка (что на самом деле произошло, 2-3 предложения)",
  "hint": "Первая подсказка (1 предложение)"
}

ПРАВИЛА ДЛЯ ЗАГАДКИ:
1. Ситуация должна быть ЗАГАДОЧНОЙ — игроку должно быть НЕПОНЯТНО, как такое произошло
2. Должно быть понятно, ЧТО нужно объяснить (почему он умер? как он туда попал? что случилось?)
3. Чётко определи персонажей (дай им имена или роли)
4. Не используй "владелец", "некто" — только конкретные определения
5. Разгадка должна быть ЛОГИЧНОЙ и ОБЪЯСНЯТЬ всю ситуацию
6. НЕ ПРОТИВОРЕЧЬ САМ СЕБЕ — завязка и разгадка должны совпадать
7. Если ты пишешь "мёртв" в завязке — в разгадке должно быть объяснение, как он умер

ПРИМЕР ХОРОШЕЙ ЗАГАДКИ:
"Мужчина лежит на полу в луже воды. Он мёртв. Рядом с ним — разбитый аквариум."
Разгадка: "Он менял воду в аквариуме, поскользнулся, ударился головой и захлебнулся"
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
            max_tokens: 350
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
            window.state.mystery = parsed.mystery || 'Выяснить, что произошло';
            window.state.genre = parsed.genre || 'Неизвестно';
            window.state.opening = text;
        } else {
            window.state.opening = text;
            window.state.solution = parsed.solution || 'Разгадка неизвестна';
            window.state.hint = parsed.hint || 'Подумайте логически';
        }
        
        removeLastSystemMessage();
        addMessage('ai', text);
        
        updateUI(mode === 'detective' ? 'расследование' : 'загадка', '#34d399');
        
        setLoading(false);
        saveState();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        removeLastSystemMessage();
        addSystemMessage(`❌ Ошибка: ${error.message}`);
        updateUI('ошибка', '#ef4444');
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
    updateUI('думает...', '#fbbf24');

    const lower = text.toLowerCase();
    if (lower.includes('закончить') || lower.includes('конец') || lower.includes('сдаюсь')) {
        window.state.isGenerating = false;
        setLoading(false);
        setTimeout(() => finishStory(), 500);
        return;
    }

    // Формируем системный промпт с уликами
    let systemPrompt = '';
    if (window.state.mode === 'detective') {
        const cluesText = window.state.clues.length > 0 
            ? `\nУЖЕ НАЙДЕННЫЕ УЛИКИ (НЕ ПОВТОРЯЙ ИХ):\n${window.state.clues.map((c, i) => `${i+1}. ${c}`).join('\n')}`
            : '\nУлик пока нет.';
        
        systemPrompt = `
Ты — ведущий детективной игры.
Режим: ДЕТЕКТИВ.
Завязка: ${window.state.opening}
${cluesText}

ПРАВИЛА:
1. ОТВЕЧАЙ НА ВОПРОС ИГРОКА напрямую
2. Если игрок что-то ищет — дай результат
3. Добавляй НОВЫЕ улики в поле "clue"
4. НЕ ПОВТОРЯЙ уже найденные улики
5. Отвечай в формате JSON: { "text": "...", "clue": "" }
`;
    } else {
        systemPrompt = `
Ты — ведущий игры ДАНЕТКИ.
Загаданная ситуация: ${window.state.opening}
Разгадка: ${window.state.solution}
Подсказка: ${window.state.hint}

ПРАВИЛА:
1. Отвечай ТОЛЬКО "Да", "Нет", "Не имеет значения"
2. НЕ НАЗЫВАЙ разгадку, пока игрок не угадает
3. Если игрок угадал — в поле "clue" напиши "УГАДАЛ"
4. Отвечай в формате JSON: { "text": "...", "clue": "" }
`;
    }

    callGroq(window.state.messages, systemPrompt, (response, clue) => {
        window.state.isGenerating = false;
        setLoading(false);

        if (response.startsWith('❌')) {
            addSystemMessage(response);
            updateUI('ошибка', '#ef4444');
            return;
        }
        
        // Проверка для данеток
        if (window.state.mode === 'danetki') {
            const lowerResponse = response.toLowerCase();
            if (lowerResponse.includes('поздрав') || 
                lowerResponse.includes('угадал') || 
                lowerResponse.includes('правильно') ||
                clue === 'УГАДАЛ') {
                addMessage('ai', '🎉 ' + response);
                finishStory();
                return;
            }
        }
        
        // Добавляем улику для детектива
        if (clue && window.state.mode === 'detective') {
            const exists = window.state.clues.some(c => c.toLowerCase() === clue.toLowerCase());
            if (!exists) {
                window.state.clues.push(clue);
            }
        }
        
        addMessage('ai', response);
        updateUI(window.state.mode === 'detective' ? 'расследование' : 'загадка', '#34d399');
        saveState();
    });
}

function finishStory() {
    if (window.state.isFinished) return;
    window.state.isFinished = true;
    updateUI('завершение', '#f59e0b');
    setLoading(true);

    addSystemMessage('ИИ подводит итоги...');

    const context = window.state.messages
        .filter(m => m.type === 'ai' || m.type === 'user')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    let systemPrompt = '';
    let userPrompt = '';

    if (window.state.mode === 'detective') {
        systemPrompt = 'Ты — ведущий детективной игры. Отвечай коротко (3-4 предложения), по делу, без воды.';
        userPrompt = `
Детективное расследование завершено. Вот всё, что произошло:
${context}

Игроки нашли улики: ${window.state.clues.join(', ') || 'ни одной'}

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
Загадка: ${window.state.opening}
Разгадка: ${window.state.solution}

Игроки задавали вопросы:
${context}

Напиши ФИНАЛ:
1. Разгадку ситуации (полное объяснение)
2. Что игроки угадали или упустили

Ответь ТОЛЬКО текстом (2-3 предложения). Без воды.
`;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = 'Ошибка';
        document.getElementById('final-story').textContent = '❌ API-ключ не найден';
        document.getElementById('final-steps').textContent = window.state.messages.length;
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
        if (!text) throw new Error('Пустой ответ');
        
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = window.state.mode === 'detective' ? 'Дело раскрыто' : 'Загадка разгадана';
        document.getElementById('final-story').textContent = text;
        document.getElementById('final-steps').textContent = window.state.messages.length;
        setLoading(false);
        showFinalScreen();
    })
    .catch(error => {
        console.error('Финальная ошибка:', error);
        removeLastSystemMessage();
        document.getElementById('final-title').textContent = 'Ошибка';
        document.getElementById('final-story').textContent = `❌ ${error.message}`;
        document.getElementById('final-steps').textContent = window.state.messages.length;
        setLoading(false);
        showFinalScreen();
    });
}

// ============================================================
// ВЫХОД НА ГЛАВНЫЙ ЭКРАН
// ============================================================

function exitToMain() {
    if (window.state.isGenerating) return;
    if (window.state.isFinished) {
        showStartScreen();
        return;
    }
    if (confirm('Вы уверены, что хотите выйти? Прогресс будет сохранён.')) {
        saveState();
        showStartScreen();
    }
}

function saveState() {
    try {
        const data = {
            messages: window.state.messages,
            storyId: window.state.storyId,
            isFinished: window.state.isFinished,
            opening: window.state.opening,
            clues: window.state.clues,
            mystery: window.state.mystery,
            mode: window.state.mode,
            solution: window.state.solution,
            hint: window.state.hint,
            genre: window.state.genre
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
        window.state.isFinished = data.isFinished || false;
        window.state.opening = data.opening || '';
        window.state.clues = data.clues || [];
        window.state.mystery = data.mystery || '';
        window.state.mode = data.mode || 'detective';
        window.state.solution = data.solution || '';
        window.state.hint = data.hint || '';
        window.state.genre = data.genre || '';
        window.state.isGenerating = false;

        // Скрываем инвентарь в данетках
        const inventoryToggle = document.getElementById('inventory-toggle');
        if (window.state.mode === 'danetki') {
            inventoryToggle.classList.add('hidden');
        } else {
            inventoryToggle.classList.remove('hidden');
        }

        if (window.state.isFinished) {
            const lastMessages = window.state.messages.filter(m => m.type === 'ai');
            if (lastMessages.length > 0) {
                document.getElementById('final-title').textContent = window.state.mode === 'detective' ? 'Дело раскрыто' : 'Загадка разгадана';
                document.getElementById('final-story').textContent = lastMessages[lastMessages.length - 1].text;
                document.getElementById('final-steps').textContent = window.state.messages.length;
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

        updateUI(window.state.mode === 'detective' ? 'расследование' : 'загадка', '#34d399');
        showGameScreen();
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
// ПОДКЛЮЧЕНИЕ КНОПОК
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Выбор режима
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
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
    
    document.getElementById('exit-btn').addEventListener('click', exitToMain);
    
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
