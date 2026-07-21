// ============================================================
// ГЛАВНЫЙ ФАЙЛ — ПОДКЛЮЧАЕТ ИНИЦИАЛИЗАЦИЮ
// ============================================================

import { initGame, loadState, sendMessage, finishStory, showStartScreen } from './game.js';
import { setupUI } from './ui.js';

// DOM-элементы
const startBtn = document.getElementById('start-btn');
const loadBtn = document.getElementById('load-btn');
const sendBtn = document.getElementById('send-btn');
const restartBtn = document.getElementById('restart-btn');

// Настройка UI
setupUI();

// Обработчики
startBtn.addEventListener('click', initGame);

loadBtn.addEventListener('click', () => {
    if (!loadState()) {
        alert('Нет сохранённой игры');
    }
});

sendBtn.addEventListener('click', sendMessage);

document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

restartBtn.addEventListener('click', showStartScreen);

// Автозагрузка
if (localStorage.getItem('detective_chat_state')) {
    loadBtn.style.display = 'block';
}

console.log('🕵️ Детектив на прогулке загружен');
console.log('🤖 Использует Groq');
