// ============================================================
// СОСТОЯНИЕ
// ============================================================

let state = {
    step: 0,
    story: [],
    players: ['Игрок 1', 'Игрок 2'],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
    isVersionMode: false,
    currentPhase: 'opening' // opening | clue | version | final
};

// ============================================================
// DOM
// ============================================================

const $ = (id) => document.getElementById(id);

const startScreen = $('start-screen');
const gameScreen = $('game-screen');
const finalScreen = $('final-screen');

const p1Input = $('player1-name');
const p2Input = $('player2-name');
const startBtn = $('start-btn');
const loadBtn = $('load-btn');

const stepCounter = $('step-counter');
const statusBadge = $('status-badge');
const contentLabel = $('content-label');
const contentText = $('content-text');
const nextBtn = $('next-btn');
const versionBtn = $('version-btn');
const finalBtn = $('final-btn');
const historyItems = $('history-items');

const finalTitle = $('final-title');
const finalStory = $('final-story');
const finalSteps = $('final-steps');
const finalClues = $('final-clues');
const copyBtn = $('copy-btn');
const restartBtn = $('restart-btn');

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function addHistoryItem(label, text) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<span class="label">${label}</span><br><span class="content">${text}</span>`;
    historyItems.appendChild(item);
    historyItems.scrollTop = historyItems.scrollHeight;
}

function callAI(prompt, callback) {
    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'openai',
            messages: [
                { 
                    role: 'system', 
                    content: 'Ты — ведущий интерактивного детектива. Отвечай только текстом, без эмодзи, без форматирования. Будь кратким, но атмосферным.' 
                },
                { role: 'user', content: prompt }
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
        const text = data.choices?.[0]?.message?.content?.trim() || 'Не удалось сгенерировать ответ. Попробуйте ещё раз.';
        callback(text);
    })
    .catch(error => {
        console.error('AI Error:', error);
        callback(getFallback());
    });
}

function getFallback() {
    const fallbacks = [
        'Вы замечаете на земле следы. Они ведут к старому фонарю.',
        'В кармане вы находите клочок бумаги с непонятным словом.',
        'Вдалеке вы видите человека, который наблюдает за вами.',
        'На скамейке лежит забытый блокнот с записями.',
        'Из ближайшего кафе доносится разговор, который привлекает ваше внимание.'
    ];
    return random(fallbacks);
}

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

function initGame() {
    console.log('🕵️ Детектив запускается...');
    
    const name1 = p1Input.value.trim() || 'Игрок 1';
    const name2 = p2Input.value.trim() || 'Игрок 2';
    state.players = [name1, name2];
    state.step = 0;
    state.story = [];
    state.storyId = Date.now();
    state.isGenerating = false;
    state.isFinished = false;
    state.isVersionMode = false;
    state.currentPhase = 'opening';

    historyItems.innerHTML = '';
    generateOpening();
    showGameScreen();
    saveState();
}

function generateOpening() {
    state.isGenerating = true;
    statusBadge.textContent = 'Завязка';
    contentLabel.textContent = 'Место преступления';
    contentText.innerHTML = '<span class="loader"></span> Создаём атмосферу...';
    nextBtn.disabled = true;
    versionBtn.classList.add('hidden');
    finalBtn.classList.add('hidden');

    const prompt = `
        Ты — ведущий детективной игры для двух игроков, которые гуляют по улице.

        Придумай ЗАВЯЗКУ для детективного расследования. Это должно быть:
        1. Описание места, где игроки находятся (парк, улица, набережная, сквер)
        2. Что они обнаружили (тело, пропажа, странный предмет, следы)
        3. Первая зацепка или странность

        Используй атмосферу обычной прогулки. Не используй эмодзи.
        Ответь ТОЛЬКО текстом завязки (2-4 предложения).
    `;

    callAI(prompt, (text) => {
        state.story.push({
            type: 'opening',
            text: text,
            answer: ''
        });
        
        contentText.textContent = text;
        statusBadge.textContent = 'Прочитайте';
        contentLabel.textContent = 'Ситуация';
        nextBtn.textContent = 'Осмотреться';
        nextBtn.disabled = false;
        versionBtn.classList.add('hidden');
        finalBtn.classList.remove('hidden');
        state.isGenerating = false;
        state.currentPhase = 'opening';
        
        addHistoryItem('Место преступления', text);
        saveState();
    });
}

function generateClue() {
    if (state.isGenerating) return;
    state.isGenerating = true;
    state.currentPhase = 'clue';

    statusBadge.textContent = 'Поиск...';
    contentLabel.textContent = 'Что вы нашли?';
    contentText.innerHTML = '<span class="loader"></span> Ищем улики...';
    nextBtn.disabled = true;
    versionBtn.classList.remove('hidden');
    finalBtn.classList.remove('hidden');

    const context = state.story
        .map(s => {
            if (s.type === 'opening') return `Начало: ${s.text}`;
            if (s.type === 'clue') return `Улика: ${s.text} → Действие: ${s.answer || 'обсуждено'}`;
            if (s.type === 'version') return `Версия игроков: ${s.text}`;
            return s.text;
        })
        .join('\n');

    const prompt = `
        Ты — ведущий детективной игры для двух игроков, которые гуляют по улице.

        Вот что уже произошло:
        ${context}

        Придумай НОВУЮ УЛИКУ или СОБЫТИЕ, которое:
        1. Логично вытекает из контекста
        2. Добавляет новую информацию к расследованию
        3. Не раскрывает тайну полностью
        4. Содержит загадку или странность

        После улики задай ВОПРОС-ДЕЙСТВИЕ:
        - "Куда вы направитесь дальше?"
        - "Что вы будете делать?"
        - "Кого вы спросите?"

        Ответь ТОЛЬКО текстом (улика + вопрос). Не используй эмодзи.
        Будь кратким (2-3 предложения).
    `;

    callAI(prompt, (text) => {
        state.step++;
        state.story.push({
            type: 'clue',
            text: text,
            answer: ''
        });
        
        stepCounter.textContent = `Шаг ${state.step}`;
        contentText.textContent = text;
        statusBadge.textContent = 'Улика найдена';
        contentLabel.textContent = 'Улика и действие';
        nextBtn.textContent = 'Обсудили';
        nextBtn.disabled = false;
        state.isGenerating = false;
        state.currentPhase = 'clue';
        
        addHistoryItem(`Улика #${state.step}`, text);
        saveState();
    });
}

function generateVersion() {
    if (state.isGenerating) return;
    state.isGenerating = true;
    state.currentPhase = 'version';

    statusBadge.textContent = 'Ваша версия...';
    contentLabel.textContent = 'Выдвиньте гипотезу';
    contentText.innerHTML = '<span class="loader"></span> Анализируем...';
    nextBtn.disabled = true;
    versionBtn.classList.add('hidden');

    const context = state.story
        .map(s => {
            if (s.type === 'opening') return `Начало: ${s.text}`;
            if (s.type === 'clue') return `Улика: ${s.text}`;
            return s.text;
        })
        .join('\n');

    const prompt = `
        Ты — ведущий детективной игры.

        Игроки выдвигают свою версию случившегося.
        Вот все улики и события, которые они собрали:
        ${context}

        Напиши ОТВЕТ на их версию:
        1. Если игроки близки к разгадке — подтверди их догадку и добавь последнюю деталь
        2. Если игроки ошибаются — дай новую подсказку, которая направит их
        3. Если игроки далеко от истины — мягко укажи на это

        Ответь ТОЛЬКО текстом (1-2 предложения). Не используй эмодзи.
    `;

    callAI(prompt, (text) => {
        contentText.textContent = text;
        statusBadge.textContent = 'Ответ на версию';
        contentLabel.textContent = 'Ваша гипотеза';
        nextBtn.textContent = 'Продолжить расследование';
        nextBtn.disabled = false;
        versionBtn.classList.add('hidden');
        state.isGenerating = false;
        
        addHistoryItem('Версия', text);
        saveState();
    });
}

function finishStory() {
    if (state.isGenerating) return;
    state.isFinished = true;

    statusBadge.textContent = 'Завершение...';
    contentLabel.textContent = 'Раскрытие дела';
    contentText.innerHTML = '<span class="loader"></span> Подводим итоги...';
    nextBtn.disabled = true;
    versionBtn.classList.add('hidden');
    finalBtn.classList.add('hidden');

    const context = state.story
        .map(s => {
            if (s.type === 'opening') return s.text;
            if (s.type === 'clue') return s.text;
            if (s.type === 'version') return `Версия: ${s.text}`;
            return s.text;
        })
        .join('\n');

    const prompt = `
        Ты — ведущий детективной игры.

        История завершена. Вот всё, что произошло:
        ${context}

        Напиши ФИНАЛ расследования:
        1. Кто был преступником (если тайна была)
        2. Как всё произошло на самом деле
        3. Что игроки упустили или угадали

        Ответь ТОЛЬКО текстом (3-5 предложений). Не используй эмодзи.
        Будь атмосферным и логичным.
    `;

    callAI(prompt, (text) => {
        const clueCount = state.story.filter(s => s.type === 'clue').length;
        
        finalTitle.textContent = 'Дело раскрыто';
        finalStory.textContent = text;
        finalSteps.textContent = state.step;
        finalClues.textContent = clueCount;
        
        showFinalScreen();
    });
}

// ============================================================
// ОБРАБОТЧИКИ КНОПОК
// ============================================================

function nextStep() {
    if (state.isGenerating) return;

    // Если это завязка — переходим к первой улике
    if (state.currentPhase === 'opening') {
        generateClue();
        return;
    }

    // Если это улика — сохраняем и генерируем новую
    if (state.currentPhase === 'clue') {
        const last = state.story[state.story.length - 1];
        if (last && last.type === 'clue') {
            last.answer = 'обсуждено устно';
        }
        saveState();
        
        // Проверяем, не пора ли завершить (максимум 7 улик)
        const clueCount = state.story.filter(s => s.type === 'clue').length;
        if (clueCount >= 7) {
            finishStory();
        } else {
            generateClue();
        }
        return;
    }

    // Если это версия — возвращаемся к уликам
    if (state.currentPhase === 'version') {
        const clueCount = state.story.filter(s => s.type === 'clue').length;
        if (clueCount >= 7) {
            finishStory();
        } else {
            generateClue();
        }
        return;
    }
}

function handleVersion() {
    if (state.isGenerating) return;
    
    // Если уже есть улики — можно выдвинуть версию
    const clueCount = state.story.filter(s => s.type === 'clue').length;
    if (clueCount < 1) {
        alert('Соберите хотя бы одну улику, прежде чем выдвигать версию');
        return;
    }
    
    generateVersion();
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
            step: state.step,
            story: state.story,
            players: state.players,
            storyId: state.storyId,
            currentPhase: state.currentPhase,
            isFinished: state.isFinished
        };
        localStorage.setItem('detective_game_state', JSON.stringify(data));
        loadBtn.style.display = 'block';
    } catch (e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem('detective_game_state');
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.story) return false;
        
        state.step = data.step || 0;
        state.story = data.story || [];
        state.players = data.players || ['Игрок 1', 'Игрок 2'];
        state.storyId = data.storyId || Date.now();
        state.currentPhase = data.currentPhase || 'opening';
        state.isFinished = data.isFinished || false;
        
        if (state.isFinished || state.story.length === 0) {
            return false;
        }
        
        historyItems.innerHTML = '';
        state.story.forEach(s => {
            if (s.type === 'opening') {
                addHistoryItem('Место преступления', s.text);
            } else if (s.type === 'clue') {
                addHistoryItem(`Улика #${state.story.indexOf(s)}`, s.text);
            } else if (s.type === 'version') {
                addHistoryItem('Версия', s.text);
            }
        });
        
        const last = state.story[state.story.length - 1];
        if (last) {
            contentText.textContent = last.text;
            if (last.type === 'opening') {
                statusBadge.textContent = 'Завязка';
                contentLabel.textContent = 'Ситуация';
                nextBtn.textContent = 'Осмотреться';
            } else if (last.type === 'clue') {
                statusBadge.textContent = 'Улика';
                contentLabel.textContent = 'Улика и действие';
                nextBtn.textContent = 'Обсудили';
            } else if (last.type === 'version') {
                statusBadge.textContent = 'Версия';
                contentLabel.textContent = 'Ответ на версию';
                nextBtn.textContent = 'Продолжить';
            }
        }
        
        stepCounter.textContent = `Шаг ${state.step}`;
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
// ПОДКЛЮЧЕНИЕ КНОПОК
// ============================================================

startBtn.addEventListener('click', initGame);

loadBtn.addEventListener('click', () => {
    if (!loadState()) {
        alert('Нет сохранённой игры');
    }
});

nextBtn.addEventListener('click', nextStep);

versionBtn.addEventListener('click', handleVersion);

finalBtn.addEventListener('click', finishStory);

restartBtn.addEventListener('click', showStartScreen);

// ============================================================
// АВТОЗАГРУЗКА
// ============================================================

if (localStorage.getItem('detective_game_state')) {
    loadBtn.style.display = 'block';
}

console.log('🕵️ Детектив на прогулке загружен');
console.log('Использует Pollinations.ai для генерации');
