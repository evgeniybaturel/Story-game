// ============================================================
// 1. БАЗА ДАННЫХ
// ============================================================

const OPENINGS = [
    "Ты находишь старое письмо в дупле дерева, но оно написано на неизвестном языке...",
    "Вход в парк перекрыт, но охранник шепчет: 'Только не ходите к старому фонтану'…",
    "Твой сосед исчез три дня назад, а сегодня ты видишь его в толпе с чемоданом…",
    "На чердаке бабушкиного дома ты находишь карту с пометкой 'Не открывать до полнолуния'",
    "В кафе официант случайно роняет записку: 'Они уже близко. Сожги это'",
    "Ты покупаешь книгу в букинистическом, а между страниц — фотография, где ты стоишь на этом же месте, но 50 лет назад",
    "Ночью тебе звонит неизвестный номер и говорит: 'Ты должен прийти на стадион. Времени мало'",
    "В новой квартире ты находишь тайную комнату, где стены покрыты иероглифами",
    "На пляже волны выносят бутылку с запиской, но язык тебе незнаком, а подпись — твоя",
    "В метро незнакомец передаёт тебе ключ и шепчет: 'Откроешь — изменишь всё'"
];

const QUESTIONS = [
    { type: 'question', text: 'Кто главный герой? Какое у него имя и чем он занимается?' },
    { type: 'question', text: 'Какое время года в этой истории? Опишите погоду' },
    { type: 'question', text: 'Что самое странное в этом месте или ситуации?' },
    { type: 'question', text: 'Какая у героя мечта или цель?' },
    { type: 'question', text: 'Что герой носит в карманах?' },
    { type: 'question', text: 'Есть ли у героя спутник или друг?' },
    { type: 'question', text: 'Что герой чувствует в этот момент?' },
    { type: 'question', text: 'Какое животное могло бы появиться в этой истории?' }
];

const TASKS = [
    { type: 'task', text: 'Опишите звук, который вы слышите вокруг' },
    { type: 'task', text: 'Используйте слово "стеклянный" в своём описании' },
    { type: 'task', text: 'Добавьте неожиданный запах в сцену' },
    { type: 'task', text: 'Опишите, что герой видит за окном' },
    { type: 'task', text: 'Используйте слово "серебряный" в описании' },
    { type: 'task', text: 'Что происходит, когда герой закрывает глаза?' },
    { type: 'task', text: 'Опишите текстуру предмета, который герой трогает' },
    { type: 'task', text: 'Добавьте элемент, который не может существовать в реальном мире' }
];

const FALLBACK_TWISTS = [
    'Внезапно начинается ливень, и всё вокруг меняется',
    'Герой замечает, что за ним кто-то следит',
    'Из ниоткуда появляется старая знакомая',
    'В кармане находится предмет, который меняет всё',
    'Герой слышит голос, который говорит ему, что делать',
    'Ситуация оказывается совсем не тем, чем казалась',
    'Герой находит скрытый проход',
    'Время начинает идти задом наперёд'
];

// ============================================================
// 2. СОСТОЯНИЕ ИГРЫ
// ============================================================

let state = {
    currentPhase: 0,
    totalSteps: 8,
    story: [],
    players: ['Игрок 1', 'Игрок 2'],
    phases: [],
    storyId: Date.now(),
    isGenerating: false,
    isTwistMode: false
};

// ============================================================
// 3. DOM-ЭЛЕМЕНТЫ
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

const finalTitle = $('final-title');
const finalStory = $('final-story');
const finalSteps = $('final-steps');
const finalTwists = $('final-twists');
const copyBtn = $('copy-btn');
const restartBtn = $('restart-btn');

// ============================================================
// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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

// ============================================================
// 5. ОСНОВНАЯ ЛОГИКА
// ============================================================

function initGame() {
    console.log('🚀 Игра запускается...');
    
    const name1 = p1Input.value.trim() || 'Игрок 1';
    const name2 = p2Input.value.trim() || 'Игрок 2';
    state.players = [name1, name2];
    state.currentPhase = 0;
    state.story = [];
    state.storyId = Date.now();
    state.isGenerating = false;
    state.isTwistMode = false;

    // Завязка
    const opening = random(OPENINGS);
    state.story.push({ type: 'opening', text: opening, answer: '' });

    // Собираем фазы
    const allPhases = [];
    const shuffledQuestions = shuffle([...QUESTIONS]);
    const shuffledTasks = shuffle([...TASKS]);

    for (let i = 0; i < 4; i++) {
        if (shuffledQuestions[i]) allPhases.push(shuffledQuestions[i]);
        if (shuffledTasks[i]) allPhases.push(shuffledTasks[i]);
    }

    state.phases = shuffle(allPhases).slice(0, state.totalSteps);
    while (state.phases.length < state.totalSteps) {
        const pool = [...QUESTIONS, ...TASKS];
        state.phases.push(random(pool));
    }

    showGameScreen();
    showStep();
    saveState();
}

function showStep() {
    const phase = state.phases[state.currentPhase];
    if (!phase) {
        finishStory();
        return;
    }

    const stepNum = state.currentPhase + 1;
    stepCounter.textContent = `Шаг ${stepNum} / ${state.totalSteps}`;

    if (phase.type === 'question') {
        statusBadge.textContent = '💬 Обсуждение';
        phaseBadge.textContent = '❓ Вопрос';
        contentLabel.textContent = 'Обсудите вместе и найдите ответ';
    } else {
        statusBadge.textContent = '🎨 Творчество';
        phaseBadge.textContent = '✍️ Задание';
        contentLabel.textContent = 'Придумайте описание вместе';
    }

    contentText.textContent = phase.text;
    nextBtn.textContent = '✅ Обсудили!';
    state.isTwistMode = false;
}

function nextStep() {
    if (state.isGenerating) return;

    const phase = state.phases[state.currentPhase];
    if (phase) {
        state.story.push({
            type: phase.type,
            text: phase.text,
            answer: '✓ (обсуждено устно)',
            timestamp: new Date().toISOString()
        });
    }

    state.currentPhase++;

    // Проверяем, нужно ли добавить поворот (каждый 3-й шаг)
    const shouldAddTwist = (state.currentPhase % 3 === 0) && 
                           state.currentPhase < state.totalSteps;

    if (shouldAddTwist) {
        generateTwist();
        return;
    }

    if (state.currentPhase >= state.totalSteps) {
        finishStory();
    } else {
        showStep();
        saveState();
    }
}

// ============================================================
// 6. ИИ — ГЕНЕРАЦИЯ ПОВОРОТОВ
// ============================================================

async function generateTwist() {
    if (state.isGenerating) return;
    state.isGenerating = true;

    statusBadge.textContent = '🌀 Генерация...';
    phaseBadge.textContent = '⚡ Сюжетный поворот';
    contentLabel.textContent = 'ИИ придумывает неожиданный поворот';
    contentText.innerHTML = '<span class="loader"></span> Думаем...';
    nextBtn.disabled = true;

    try {
        const context = state.story
            .filter(s => s.answer)
            .map(s => `${s.text} → ${s.answer}`)
            .join('\n');

        const prompt = `
            Это история, которую мы сочиняем вместе.
            Вот что уже произошло:
            ${context || 'Пока ничего не произошло, только начало.'}

            Придумай НЕОЖИДАННЫЙ ПОВОРОТ СЮЖЕТА для этой истории.
            Поворот должен быть:
            - Интересным и небанальным
            - Логично вытекающим из контекста
            - Коротким (1-2 предложения)
            - Вдохновляющим для дальнейшего обсуждения

            Ответь ТОЛЬКО текстом поворота, без пояснений.
        `;

        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai',
                messages: [
                    { role: 'system', content: 'Ты — креативный помощник для генерации сюжетных поворотов. Отвечай коротко и интересно.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.9,
                max_tokens: 80
            })
        });

        let twistText = '';

        if (response.ok) {
            const data = await response.json();
            twistText = data.choices?.[0]?.message?.content || random(FALLBACK_TWISTS);
        } else {
            console.warn('API вернул ошибку, используем запасной поворот');
            twistText = random(FALLBACK_TWISTS);
        }

        twistText = twistText.replace(/^["']|["']$/g, '').trim();

        state.story.push({
            type: 'twist',
            text: '🌀 Сюжетный поворот от ИИ',
            answer: twistText,
            timestamp: new Date().toISOString()
        });

        contentLabel.textContent = '🌀 Неожиданный поворот!';
        contentText.textContent = twistText;
        nextBtn.textContent = '🔥 Обсудили поворот!';
        nextBtn.disabled = false;
        statusBadge.textContent = '🎭 Поворот!';
        state.isTwistMode = true;

        saveState();

    } catch (error) {
        console.error('Ошибка ИИ:', error);
        const fallback = random(FALLBACK_TWISTS);
        state.story.push({
            type: 'twist',
            text: '🌀 Сюжетный поворот (запасной)',
            answer: fallback,
            timestamp: new Date().toISOString()
        });
        contentLabel.textContent = '🌀 Поворот (офлайн)';
        contentText.textContent = fallback;
        nextBtn.textContent = '🔥 Обсудили!';
        nextBtn.disabled = false;
        statusBadge.textContent = '🎭 Поворот!';
        state.isTwistMode = true;
        saveState();
    }

    state.isGenerating = false;
}

// ============================================================
// 7. ЗАВЕРШЕНИЕ
// ============================================================

function finishStory() {
    const storyParts = state.story.map(s => {
        if (s.type === 'opening') return `📖 ${s.text}`;
        if (s.type === 'twist') return `🌀 ${s.answer}`;
        return `${s.text}\n→ ${s.answer}`;
    });

    const fullStory = storyParts.join('\n\n');
    const twistCount = state.story.filter(s => s.type === 'twist').length;

    const words = state.story
        .flatMap(s => (s.answer || s.text || '').split(' '))
        .filter(w => w.length > 3)
        .slice(0, 5);

    let title = '';
    if (words.length > 2) {
        title = words.slice(0, 3).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') + '...';
    } else {
        title = 'Тайна, найденная на прогулке';
    }
    const titles = ['Загадка', 'Открытие', 'Путешествие', 'Тайна', 'Приключение'];
    if (Math.random() > 0.5) {
        title = random(titles) + ' ' + title;
    }

    finalTitle.textContent = title;
    finalStory.textContent = fullStory || 'История пока пуста...';
    finalSteps.textContent = state.story.length;
    finalTwists.textContent = twistCount;

    localStorage.setItem('story_final_' + state.storyId, JSON.stringify({
        title,
        story: fullStory,
        steps: state.story.length,
        twists: twistCount,
        date: new Date().toISOString()
    }));

    showFinalScreen();
}

// ============================================================
// 8. НАВИГАЦИЯ
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
// 9. СОХРАНЕНИЕ
// ============================================================

function saveState() {
    try {
        const data = {
            currentPhase: state.currentPhase,
            story: state.story,
            phases: state.phases,
            players: state.players,
            totalSteps: state.totalSteps,
            storyId: state.storyId,
            isTwistMode: state.isTwistMode
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
        if (!data.story || !data.phases) return false;

        state.currentPhase = data.currentPhase || 0;
        state.story = data.story || [];
        state.phases = data.phases || [];
        state.players = data.players || ['Игрок 1', 'Игрок 2'];
        state.totalSteps = data.totalSteps || 8;
        state.storyId = data.storyId || Date.now();
        state.isTwistMode = data.isTwistMode || false;

        if (state.currentPhase >= state.totalSteps) {
            finishStory();
            return true;
        }

        showGameScreen();
        showStep();
        saveState();
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
// 10. КОПИРОВАНИЕ
// ============================================================

copyBtn.addEventListener('click', async () => {
    const text = `📖 ${finalTitle.textContent}\n\n${finalStory.textContent}`;
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = '✅ Скопировано!';
        setTimeout(() => copyBtn.textContent = '📋 Скопировать историю', 2000);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        copyBtn.textContent = '✅ Скопировано!';
        setTimeout(() => copyBtn.textContent = '📋 Скопировать историю', 2000);
    }
});

// ============================================================
// 11. ОБРАБОТЧИКИ
// ============================================================

startBtn.addEventListener('click', initGame);

loadBtn.addEventListener('click', () => {
    if (!loadState()) {
        alert('Нет сохранённой игры');
    }
});

nextBtn.addEventListener('click', () => {
    if (state.isTwistMode) {
        state.isTwistMode = false;
        if (state.currentPhase < state.totalSteps) {
            showStep();
            saveState();
        } else {
            finishStory();
        }
        return;
    }
    nextStep();
});

finalBtn.addEventListener('click', finishStory);

restartBtn.addEventListener('click', showStartScreen);

// ============================================================
// 12. АВТОЗАГРУЗКА
// ============================================================

if (localStorage.getItem('story_game_state')) {
    loadBtn.style.display = 'block';
}

console.log('📖 "Общая история" загружена!');
console.log('💡 Придумано с ❤️ для прогулок и вдохновения');
console.log('🌐 Использует Pollinations.ai для генерации поворотов');
