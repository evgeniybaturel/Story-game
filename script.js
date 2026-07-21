// ============================================================
// 1. СОСТОЯНИЕ
// ============================================================

let state = {
    currentStep: 0,
    story: [],
    players: ['Игрок 1', 'Игрок 2'],
    storyId: Date.now(),
    isGenerating: false,
    isFinished: false,
    isTwistMode: false,
    lastQuestion: ''
};

// ============================================================
// 2. DOM
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
const phaseBadge = $('phase-badge');
const contentLabel = $('content-label');
const contentText = $('content-text');
const nextBtn = $('next-btn');
const finalBtn = $('final-btn');
const historyItems = $('history-items');

const finalTitle = $('final-title');
const finalStory = $('final-story');
const finalSteps = $('final-steps');
const copyBtn = $('copy-btn');
const restartBtn = $('restart-btn');

// ============================================================
// 3. ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function addHistoryItem(question, answer) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<span class="q">${question}</span><br><span class="a">→ ${answer || 'обсуждено устно'}</span>`;
    historyItems.appendChild(item);
    historyItems.scrollTop = historyItems.scrollHeight;
}

// ============================================================
// 4. ОСНОВНАЯ ЛОГИКА
// ============================================================

function initGame() {
    console.log('🚀 Игра запускается...');
    
    const name1 = p1Input.value.trim() || 'Игрок 1';
    const name2 = p2Input.value.trim() || 'Игрок 2';
    state.players = [name1, name2];
    state.currentStep = 0;
    state.story = [];
    state.storyId = Date.now();
    state.isGenerating = false;
    state.isFinished = false;
    state.isTwistMode = false;
    state.lastQuestion = '';

    // Очищаем историю
    historyItems.innerHTML = '';

    // Генерируем первую завязку
    generateOpening();

    showGameScreen();
    saveState();
}

function generateOpening() {
    state.isGenerating = true;
    statusBadge.textContent = 'Генерация...';
    phaseBadge.textContent = 'Завязка';
    contentLabel.textContent = 'Начало истории';
    contentText.innerHTML = '<span class="loader"></span> Придумываем завязку...';
    nextBtn.disabled = true;

    const prompt = `
        Ты — ведущий интерактивной истории для двух игроков.
        
        Придумай ЗАВЯЗКУ для истории.
        Это должно быть короткое описание (2-3 предложения), которое:
        - Захватывает внимание
        - Создаёт загадку или интригу
        - Оставляет пространство для воображения
        
        Не используй эмодзи.
        Не задавай вопросов. Только описание.
        Ответь ТОЛЬКО текстом завязки.
    `;

    callAI(prompt, 'opening');
}

function generateQuestion() {
    if (state.isGenerating) return;
    state.isGenerating = true;

    statusBadge.textContent = 'Генерация...';
    phaseBadge.textContent = 'Вопрос';
    contentLabel.textContent = 'Обсудите и ответьте';
    contentText.innerHTML = '<span class="loader"></span> Придумываем вопрос...';
    nextBtn.disabled = true;

    // Собираем контекст
    const context = state.story
        .map(s => {
            if (s.type === 'opening') return `Начало: ${s.text}`;
            if (s.type === 'question') return `Вопрос: ${s.text} → Ответ: ${s.answer || 'обсуждено'}`;
            return s.text;
        })
        .join('\n');

    const prompt = `
        Ты — ведущий интерактивной истории для двух игроков.

        Вот что уже произошло в истории:
        ${context}

        Твоя задача — задать ОДИН ОТКРЫТЫЙ ВОПРОС, который:
        1. Логично вытекает из контекста
        2. Развивает историю глубже
        3. Требует воображения и обсуждения
        4. Не предполагает однозначного ответа

        Правила:
        - Вопрос должен быть коротким (1-2 предложения)
        - Не давай вариантов ответов
        - Не предлагай выбор
        - Просто задай вопрос, который продолжит историю
        - Не используй эмодзи

        Примеры:
        - "Что ты видишь за дверью и почему это вызывает у тебя тревогу?"
        - "Какое слово написано на стене и что оно означает для тебя?"
        - "Если бы ты мог спросить у этого человека что-то одно, что бы ты спросил?"

        ОТВЕТЬ ТОЛЬКО ТЕКСТОМ ВОПРОСА, без пояснений.
    `;

    callAI(prompt, 'question');
}

function callAI(prompt, type) {
    fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'openai',
            messages: [
                { role: 'system', content: 'Ты — креативный писатель и ведущий интерактивных историй. Отвечай коротко, интересно, без эмодзи.' },
                { role: 'user', content: prompt }
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
        const text = data.choices?.[0]?.message?.content?.trim() || 'Извините, не удалось сгенерировать текст. Попробуйте ещё раз.';
        handleAIResponse(text, type);
    })
    .catch(error => {
        console.error('AI Error:', error);
        const fallback = getFallback(type);
        handleAIResponse(fallback, type);
    });
}

function handleAIResponse(text, type) {
    if (type === 'opening') {
        state.story.push({
            type: 'opening',
            text: text,
            answer: ''
        });
        
        contentText.textContent = text;
        phaseBadge.textContent = 'Завязка';
        statusBadge.textContent = 'Прочитайте';
        contentLabel.textContent = 'Начало истории';
        nextBtn.textContent = 'Понятно, продолжаем';
        nextBtn.disabled = false;
        state.isGenerating = false;
        
        // Добавляем в историю
        addHistoryItem('Завязка', text);
        
    } else if (type === 'question') {
        state.lastQuestion = text;
        state.story.push({
            type: 'question',
            text: text,
            answer: ''
        });
        
        state.currentStep++;
        stepCounter.textContent = `Вопрос ${state.currentStep}`;
        
        contentText.textContent = text;
        phaseBadge.textContent = `Вопрос ${state.currentStep}`;
        statusBadge.textContent = 'Обсуждение';
        contentLabel.textContent = 'Обсудите вместе и найдите ответ';
        nextBtn.textContent = 'Обсудили';
        nextBtn.disabled = false;
        state.isGenerating = false;
        state.isTwistMode = false;
        
        // Добавляем в историю
        addHistoryItem(text, '');
        
        saveState();
    }
}

function getFallback(type) {
    const openings = [
        'Вы просыпаетесь в незнакомой комнате. На стене надпись: "Ты выбрал это сам". Рядом лежит билет на поезд до станции "Нигде".',
        'Вы находите старую карту в книге. На ней отмечено место, которого не существует, но вы точно знаете, где оно находится.',
        'Вам приходит письмо без обратного адреса. Внутри — ключ и записка: "Приходи в полночь. Узнаешь правду".'
    ];
    
    if (type === 'opening') return random(openings);
    
    const questions = [
        'Что вы чувствуете, когда видите это место?',
        'Какая мысль приходит вам в голову первой?',
        'Что вы делаете в этот момент?',
        'Кто бы мог помочь вам в этой ситуации?',
        'Что скрывается за этой дверью?'
    ];
    
    return random(questions);
}

// ============================================================
// 5. ОБРАБОТЧИКИ КНОПОК
// ============================================================

function nextStep() {
    if (state.isGenerating) return;
    
    // Если это завязка — просто переходим к первому вопросу
    if (state.story.length === 1 && state.story[0].type === 'opening') {
        generateQuestion();
        return;
    }
    
    // Если это вопрос — сохраняем ответ (устный) и генерируем новый
    if (state.lastQuestion) {
        // Обновляем последний вопрос с ответом
        const last = state.story[state.story.length - 1];
        if (last && last.type === 'question') {
            last.answer = 'обсуждено устно';
            // Обновляем историю
            const items = historyItems.querySelectorAll('.history-item');
            if (items.length > 0) {
                const lastItem = items[items.length - 1];
                const answerSpan = lastItem.querySelector('.a');
                if (answerSpan) {
                    answerSpan.textContent = '→ обсуждено устно';
                }
            }
        }
        
        state.lastQuestion = '';
        saveState();
        
        // Генерируем новый вопрос или завершаем
        if (state.currentStep >= 8) {
            finishStory();
        } else {
            generateQuestion();
        }
    }
}

function finishStory() {
    console.log('🏁 Завершаем историю');
    state.isFinished = true;
    
    const storyParts = state.story.map(s => {
        if (s.type === 'opening') return s.text;
        if (s.type === 'question') {
            const answer = s.answer || 'обсуждено';
            return `${s.text}\n→ ${answer}`;
        }
        return s.text;
    });
    
    const fullStory = storyParts.join('\n\n');
    
    // Генерируем название
    const words = state.story
        .flatMap(s => (s.answer || s.text || '').split(' '))
        .filter(w => w.length > 3)
        .slice(0, 4);
    
    let title = words.length > 1 ? words.slice(0, 3).join(' ') : 'История';
    
    // Если название слишком длинное
    if (title.length > 30) {
        title = title.slice(0, 30) + '...';
    }
    
    finalTitle.textContent = title;
    finalStory.textContent = fullStory;
    finalSteps.textContent = state.story.filter(s => s.type === 'question').length;
    
    showFinalScreen();
}

// ============================================================
// 6. НАВИГАЦИЯ
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
// 7. СОХРАНЕНИЕ
// ============================================================

function saveState() {
    try {
        const data = {
            currentStep: state.currentStep,
            story: state.story,
            players: state.players,
            storyId: state.storyId,
            lastQuestion: state.lastQuestion,
            isFinished: state.isFinished
        };
        localStorage.setItem('story_game_state', JSON.stringify(data));
        loadBtn.style.display = 'block';
    } catch (e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem('story_game_state');
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.story) return false;
        
        state.currentStep = data.currentStep || 0;
        state.story = data.story || [];
        state.players = data.players || ['Игрок 1', 'Игрок 2'];
        state.storyId = data.storyId || Date.now();
        state.lastQuestion = data.lastQuestion || '';
        state.isFinished = data.isFinished || false;
        
        if (state.isFinished || state.story.length === 0) {
            return false;
        }
        
        // Восстанавливаем историю в UI
        historyItems.innerHTML = '';
        state.story.forEach(s => {
            if (s.type === 'opening') {
                addHistoryItem('Завязка', s.text);
            } else if (s.type === 'question') {
                addHistoryItem(s.text, s.answer || '');
            }
        });
        
        // Показываем последний вопрос
        const last = state.story[state.story.length - 1];
        if (last && last.type === 'question') {
            contentText.textContent = last.text;
            phaseBadge.textContent = `Вопрос ${state.currentStep}`;
            statusBadge.textContent = 'Обсуждение';
            contentLabel.textContent = 'Обсудите вместе и найдите ответ';
            nextBtn.textContent = 'Обсудили';
            stepCounter.textContent = `Вопрос ${state.currentStep}`;
            state.lastQuestion = last.text;
        } else if (last && last.type === 'opening') {
            contentText.textContent = last.text;
            phaseBadge.textContent = 'Завязка';
            statusBadge.textContent = 'Прочитайте';
            contentLabel.textContent = 'Начало истории';
            nextBtn.textContent = 'Понятно, продолжаем';
            stepCounter.textContent = 'Вопрос 0';
        }
        
        showGameScreen();
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
// 8. КОПИРОВАНИЕ
// ============================================================

copyBtn.addEventListener('click', async () => {
    const text = `${finalTitle.textContent}\n\n${finalStory.textContent}`;
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => copyBtn.textContent = 'Скопировать историю', 2000);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => copyBtn.textContent = 'Скопировать историю', 2000);
    }
});

// ============================================================
// 9. ПОДКЛЮЧЕНИЕ КНОПОК
// ============================================================

startBtn.addEventListener('click', initGame);

loadBtn.addEventListener('click', () => {
    if (!loadState()) {
        alert('Нет сохранённой игры');
    }
});

nextBtn.addEventListener('click', nextStep);

finalBtn.addEventListener('click', finishStory);

restartBtn.addEventListener('click', showStartScreen);

// ============================================================
// 10. АВТОЗАГРУЗКА
// ============================================================

if (localStorage.getItem('story_game_state')) {
    loadBtn.style.display = 'block';
}

console.log('Общая история загружена');
console.log('Использует Pollinations.ai для генерации вопросов');
