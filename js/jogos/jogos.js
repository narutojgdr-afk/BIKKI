/**
 * Módulo de Jogos - Sistema de Jogos com Ranking
 * Gerencia jogos leves e sistema de pontuação por usuário
 */

import { Auth } from '../shared/auth.js';

const STORAGE_KEY_RANKINGS = 'bicicletario_game_rankings';
const STORAGE_KEY_STATS = 'bicicletario_game_stats';
const STORAGE_KEY_ACHIEVEMENTS = 'bicicletario_game_achievements';

export class JogosManager {
    constructor(app) {
        this.app = app;
        this.currentGame = null;
        this.rankings = this.loadRankings();
        this.stats = this.loadStats();
        this.achievements = this.loadAchievements();
    }

    loadRankings() {
        const data = localStorage.getItem(STORAGE_KEY_RANKINGS);
        return data ? JSON.parse(data) : {};
    }

    saveRankings() {
        localStorage.setItem(STORAGE_KEY_RANKINGS, JSON.stringify(this.rankings));
    }

    loadStats() {
        const data = localStorage.getItem(STORAGE_KEY_STATS);
        return data ? JSON.parse(data) : { gamesPlayed: 0, totalTime: 0, bestScore: 0 };
    }

    saveStats() {
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(this.stats));
    }

    loadAchievements() {
        const data = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS);
        return data ? JSON.parse(data) : {};
    }

    saveAchievements() {
        localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(this.achievements));
    }

    unlockAchievement(achievementId) {
        if (!this.achievements[achievementId]) {
            this.achievements[achievementId] = { unlocked: true, date: new Date().toISOString() };
            this.saveAchievements();
            this.showAchievementNotification(achievementId);
        }
    }

    showAchievementNotification(achievementId) {
        const achievementNames = {
            'first_win': 'Primeira Vitória',
            'snake_master': 'Mestre da Cobrinha',
            'doom_slayer': 'Exterminador do Doom',
            'elephant_memory': 'Memória de Elefante',
            'destroyer': 'Destruidor',
            'galaxy_defender': 'Defensor da Galáxia'
        };
        const name = achievementNames[achievementId] || achievementId;
        
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-xl shadow-lg transform translate-x-full transition-transform duration-500';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <i data-lucide="trophy" class="w-6 h-6 text-yellow-300"></i>
                <div>
                    <p class="font-bold">Conquista Desbloqueada!</p>
                    <p class="text-sm opacity-90">${name}</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    addScore(gameId, score) {
        const session = Auth.getCurrentSession();
        if (!session) return;

        const username = session.username;
        const nome = session.nome;

        // Always award exactly 2 points per victory
        const finalScore = score > 0 ? 2 : 0;

        if (!this.rankings[gameId]) {
            this.rankings[gameId] = [];
        }

        this.rankings[gameId].push({
            username,
            nome,
            score: finalScore,
            date: new Date().toISOString()
        });

        this.rankings[gameId].sort((a, b) => b.score - a.score);
        this.rankings[gameId] = this.rankings[gameId].slice(0, 100);

        // Update stats
        this.stats.gamesPlayed++;
        if (finalScore > this.stats.bestScore) {
            this.stats.bestScore = finalScore;
        }
        this.saveStats();

        // Check for first win achievement
        if (finalScore > 0) {
            this.unlockAchievement('first_win');
        }

        this.saveRankings();
        this.renderRanking(gameId);
    }

    getTopScores(gameId, limit = 10) {
        if (!this.rankings[gameId]) return [];
        return this.rankings[gameId].slice(0, limit);
    }

    getUserBestScore(gameId) {
        const session = Auth.getCurrentSession();
        if (!session || !this.rankings[gameId]) return null;

        const userScores = this.rankings[gameId].filter(r => r.username === session.username);
        return userScores.length > 0 ? userScores[0].score : null;
    }

    init() {
        this.renderGameMenu();
        this.setupEventListeners();
        this.setupBackButton();
    }

    setupBackButton() {
        const backBtn = document.getElementById('back-to-games-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.closeGame());
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.dataset.game;
                this.openGame(gameId);
            });
        });
    }

    renderGameMenu() {
        const gamesContainer = document.getElementById('games-menu');
        const statsContainer = document.getElementById('player-stats');
        const achievementsContainer = document.getElementById('player-achievements');
        
        if (!gamesContainer) return;

        const games = [
            { id: 'snake', name: 'Jogo da Cobrinha', icon: 'zap', description: 'Com 5 fases, obstáculos e power-ups!', category: 'acao' },
            { id: 'doom', name: 'Doom', icon: 'crosshair', description: '3 níveis em primeira pessoa com inimigos!', category: 'acao' },
            { id: 'spaceinvaders', name: 'Invasores Espaciais', icon: 'rocket', description: 'Defenda a Terra dos invasores espaciais!', category: 'acao' },
            { id: 'breakout', name: 'Breakout', icon: 'square', description: '5 fases com power-ups e tijolos resistentes!', category: 'acao' },
            { id: 'typing', name: 'Teste de Digitação', icon: 'keyboard', description: 'Teste sua velocidade de digitação!', category: 'palavras' },
            { id: 'termo', name: 'Termo', icon: 'type', description: 'Adivinhe a palavra de 5 letras!', category: 'palavras' },
            { id: 'termo2', name: 'Termo Dueto', icon: 'columns', description: 'Adivinhe 2 palavras ao mesmo tempo!', category: 'palavras' },
            { id: 'termo4', name: 'Termo Quarteto', icon: 'layout-grid', description: 'Adivinhe 4 palavras de 4 letras!', category: 'palavras' },
            { id: 'memory', name: 'Jogo da Memória', icon: 'brain', description: '3 níveis de dificuldade!', category: 'diversos' },
            { id: 'wordsearch', name: 'Caça Palavras', icon: 'search', description: 'Encontre as palavras escondidas!', category: 'diversos' },
            { id: 'crossword', name: 'Cruzadinha', icon: 'grid', description: 'Preencha as palavras cruzadas!', category: 'diversos' }
        ];
        
        const categories = [
            { id: 'acao', name: 'Jogos de Ação', icon: 'gamepad-2' },
            { id: 'palavras', name: 'Jogos de Palavras', icon: 'text' },
            { id: 'diversos', name: 'Jogos Diversos', icon: 'puzzle' }
        ];

        // Render Statistics
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="text-center">
                    <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${this.stats.gamesPlayed}</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Jogos</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">${this.stats.bestScore}</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Melhor Pontuação</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-green-600 dark:text-green-400">${Object.keys(this.achievements).length}</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Conquistas</p>
                </div>
            `;
        }

        // Render Achievements
        if (achievementsContainer) {
            achievementsContainer.innerHTML = this.renderAchievements();
        }

        // Render Games by Category
        const renderGameCard = (game) => `
            <div class="game-card bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all transform hover:-translate-y-1" data-game="${game.id}">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <i data-lucide="${game.icon}" class="w-6 h-6 text-white"></i>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-500 dark:text-slate-400">Seu Recorde</p>
                        <p class="text-lg font-bold text-blue-600 dark:text-blue-400">${this.getUserBestScore(game.id) || '-'}</p>
                    </div>
                </div>
                <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">${game.name}</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">${game.description}</p>
            </div>
        `;
        
        const gamesByCategory = categories.map(cat => {
            const catGames = games.filter(g => g.category === cat.id);
            return `
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <i data-lucide="${cat.icon}" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                        ${cat.name}
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${catGames.map(renderGameCard).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        gamesContainer.innerHTML = gamesByCategory;

        lucide.createIcons();
        this.setupEventListeners();
    }

    renderAchievements() {
        const allAchievements = [
            { id: 'first_win', name: 'Primeira Vitória', icon: 'award', description: 'Complete qualquer jogo' },
            { id: 'snake_master', name: 'Mestre da Cobrinha', icon: 'zap', description: 'Alcance fase 5 no Snake' },
            { id: 'doom_slayer', name: 'Exterminador do Doom', icon: 'crosshair', description: 'Complete todos os níveis do Doom' },
            { id: 'elephant_memory', name: 'Memória de Elefante', icon: 'brain', description: 'Complete o modo difícil da memória' },
            { id: 'destroyer', name: 'Destruidor', icon: 'square', description: 'Complete todas as fases do Breakout' },
            { id: 'galaxy_defender', name: 'Defensor da Galáxia', icon: 'rocket', description: 'Derrote o boss do Space Invaders' },
            { id: 'termo_master', name: 'Mestre do Termo', icon: 'type', description: 'Acerte a palavra na primeira tentativa' }
        ];

        return allAchievements.map(achievement => {
            const unlocked = this.achievements[achievement.id];
            return `
                <div class="flex items-center gap-2 p-2 rounded-lg ${unlocked ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-slate-100 dark:bg-slate-700/50 opacity-50'}" title="${achievement.description}">
                    <i data-lucide="${achievement.icon}" class="w-4 h-4 ${unlocked ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-400'}"></i>
                    <span class="text-xs font-medium ${unlocked ? 'text-yellow-700 dark:text-yellow-300' : 'text-slate-500 dark:text-slate-400'}">${achievement.name}</span>
                </div>
            `;
        }).join('');
    }

    renderRanking(gameId) {
        const container = document.getElementById('ranking-list');
        if (!container) return;

        const scores = this.getTopScores(gameId, 10);
        const session = Auth.getCurrentSession();

        if (scores.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                    <i data-lucide="trophy" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>Nenhuma pontuação ainda!</p>
                    <p class="text-sm mt-1">Seja o primeiro a jogar!</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = scores.map((score, index) => {
            const isCurrentUser = session && score.username === session.username;
            const medalColor = index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-600' : 'text-slate-500';
            
            return `
                <div class="flex items-center justify-between p-3 rounded-lg ${isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700/50'}">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 flex items-center justify-center">
                            ${index < 3 ? `<i data-lucide="trophy" class="w-5 h-5 ${medalColor}"></i>` : `<span class="text-sm font-medium text-slate-500">${index + 1}</span>`}
                        </div>
                        <div>
                            <p class="font-medium text-slate-800 dark:text-slate-200 ${isCurrentUser ? 'text-blue-700 dark:text-blue-300' : ''}">${score.nome}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">@${score.username}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-lg ${isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}">${score.score.toLocaleString('pt-BR')}</p>
                        <p class="text-xs text-slate-400">${new Date(score.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    openGame(gameId) {
        const gameContainer = document.getElementById('game-container');
        const menuContainer = document.getElementById('games-menu-section');
        
        if (gameContainer && menuContainer) {
            menuContainer.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            
            this.renderRanking(gameId);
            this.startGame(gameId);
        }
    }

    closeGame() {
        const gameContainer = document.getElementById('game-container');
        const menuContainer = document.getElementById('games-menu-section');
        const canvas = document.getElementById('game-canvas');
        
        if (this.currentGame && this.currentGame.stop) {
            this.currentGame.stop();
        }
        this.currentGame = null;
        
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        if (gameContainer && menuContainer) {
            gameContainer.classList.add('hidden');
            menuContainer.classList.remove('hidden');
        }
        
        this.renderGameMenu();
    }

    startGame(gameId) {
        const canvas = document.getElementById('game-canvas');
        const gameTitle = document.getElementById('current-game-title');
        
        if (!canvas) return;

        const games = {
            snake: { name: 'Jogo da Cobrinha', class: SnakeGame },
            doom: { name: 'Doom', class: DoomGame },
            typing: { name: 'Teste de Digitação', class: TypingGame },
            memory: { name: 'Jogo da Memória', class: MemoryGame },
            spaceinvaders: { name: 'Invasores Espaciais', class: SpaceInvadersGame },
            breakout: { name: 'Breakout', class: BreakoutGame },
            termo: { name: 'Termo', class: TermoGame },
            termo2: { name: 'Termo Dueto', class: TermoDuoGame },
            termo4: { name: 'Termo Quarteto', class: TermoQuartetGame },
            wordsearch: { name: 'Caça Palavras', class: WordSearchGame },
            crossword: { name: 'Cruzadinha', class: CrosswordGame }
        };

        const game = games[gameId];
        if (!game) return;

        if (gameTitle) {
            gameTitle.textContent = game.name;
        }

        this.currentGame = new game.class(canvas, (score) => {
            this.addScore(gameId, score);
        }, this);
        this.currentGame.start();
    }

    applyPermissionsToUI() {
        const jogosTab = document.getElementById('jogos-tab');
        if (jogosTab) {
            if (Auth.hasPermission('jogos', 'ver')) {
                jogosTab.classList.remove('hidden');
            } else {
                jogosTab.classList.add('hidden');
            }
        }
    }
}

class SnakeGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        this.gridSize = 20;
        this.tileCount = 20;
        this.canvas.width = this.gridSize * this.tileCount;
        this.canvas.height = this.gridSize * this.tileCount;
        
        this.difficulties = {
            easy: { speed: 150, name: 'Fácil' },
            medium: { speed: 100, name: 'Médio' },
            hard: { speed: 60, name: 'Difícil' }
        };
        
        this.currentDifficulty = 'medium';
        this.phase = 1;
        this.maxPhase = 5;
        this.running = false;
        
        // Power-up types
        this.powerUpTypes = {
            slowmo: { icon: '⏱', color: '#06b6d4', duration: 100, name: 'Velocidade Reduzida' },
            double: { icon: '⭐', color: '#eab308', duration: 80, name: 'Pontos em Dobro' },
            ghost: { icon: '🌀', color: '#a855f7', duration: 60, name: 'Atravessar Paredes' }
        };
        
        this.reset();
        this.setupControls();
        this.showDifficultySelector();
    }

    showDifficultySelector() {
        const container = this.canvas.parentElement;
        let selector = document.getElementById('snake-difficulty');
        
        if (!selector) {
            selector = document.createElement('div');
            selector.id = 'snake-difficulty';
            selector.className = 'flex gap-2 mb-4 justify-center flex-wrap';
            selector.innerHTML = `
                <button data-diff="easy" class="diff-btn px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">Fácil</button>
                <button data-diff="medium" class="diff-btn px-4 py-2 rounded-lg bg-blue-500 text-white">Médio</button>
                <button data-diff="hard" class="diff-btn px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">Difícil</button>
            `;
            container.insertBefore(selector, this.canvas);
            
            selector.querySelectorAll('.diff-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentDifficulty = btn.dataset.diff;
                    this.updateDifficultyButtons();
                    this.reset();
                    this.start();
                });
            });
        }
    }

    updateDifficultyButtons() {
        const btns = document.querySelectorAll('#snake-difficulty .diff-btn');
        btns.forEach(btn => {
            if (btn.dataset.diff === this.currentDifficulty) {
                btn.className = 'diff-btn px-4 py-2 rounded-lg bg-blue-500 text-white';
            } else {
                const colors = {
                    easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200',
                    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200',
                    hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200'
                };
                btn.className = `diff-btn px-4 py-2 rounded-lg ${colors[btn.dataset.diff]} transition-colors`;
            }
        });
    }

    reset() {
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.obstacles = [];
        this.food = this.generateFood();
        this.specialFood = null;
        this.powerUp = null;
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.score = 0;
        this.phase = 1;
        this.phaseProgress = 0;
        this.phaseTarget = 50;
        this.gameOver = false;
        this.won = false;
        this.generateObstacles();
        this.updateScoreDisplay();
    }

    generateObstacles() {
        this.obstacles = [];
        // Obstacles appear from phase 3
        if (this.phase >= 3) {
            const obstacleCount = (this.phase - 2) * 4; // 4, 8, 12 obstacles for phases 3, 4, 5
            for (let i = 0; i < obstacleCount; i++) {
                let obstacle;
                do {
                    obstacle = {
                        x: Math.floor(Math.random() * this.tileCount),
                        y: Math.floor(Math.random() * this.tileCount)
                    };
                } while (
                    this.snake.some(seg => seg.x === obstacle.x && seg.y === obstacle.y) ||
                    this.obstacles.some(obs => obs.x === obstacle.x && obs.y === obstacle.y) ||
                    (Math.abs(obstacle.x - 10) < 3 && Math.abs(obstacle.y - 10) < 3) // Keep spawn area clear
                );
                this.obstacles.push(obstacle);
            }
        }
    }

    generateFood() {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (
            this.snake.some(seg => seg.x === food.x && seg.y === food.y) ||
            this.obstacles.some(obs => obs.x === food.x && obs.y === food.y)
        );
        return food;
    }

    generateSpecialFood() {
        if (Math.random() < 0.15 && !this.specialFood) {
            let food;
            do {
                food = {
                    x: Math.floor(Math.random() * this.tileCount),
                    y: Math.floor(Math.random() * this.tileCount)
                };
            } while (
                this.snake.some(seg => seg.x === food.x && seg.y === food.y) ||
                this.obstacles.some(obs => obs.x === food.x && obs.y === food.y) ||
                (this.food.x === food.x && this.food.y === food.y)
            );
            this.specialFood = {
                ...food,
                timer: 100,
                points: 50
            };
        }
    }

    generatePowerUp() {
        if (Math.random() < 0.08 && !this.powerUp && !this.activePowerUp) {
            const types = Object.keys(this.powerUpTypes);
            const type = types[Math.floor(Math.random() * types.length)];
            let pos;
            do {
                pos = {
                    x: Math.floor(Math.random() * this.tileCount),
                    y: Math.floor(Math.random() * this.tileCount)
                };
            } while (
                this.snake.some(seg => seg.x === pos.x && seg.y === pos.y) ||
                this.obstacles.some(obs => obs.x === pos.x && obs.y === pos.y) ||
                (this.food.x === pos.x && this.food.y === pos.y)
            );
            this.powerUp = {
                ...pos,
                type,
                timer: 150
            };
        }
    }

    setupControls() {
        this.keyHandler = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
                    break;
                case ' ':
                    if (this.gameOver || this.won) {
                        this.reset();
                        this.start();
                    }
                    break;
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = 0;
        this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.removeEventListener('keydown', this.keyHandler);
        const selector = document.getElementById('snake-difficulty');
        if (selector) selector.remove();
    }

    gameLoop(timestamp) {
        if (!this.running) return;

        let speed = this.difficulties[this.currentDifficulty].speed;
        
        // Slow-mo power-up effect
        if (this.activePowerUp === 'slowmo') {
            speed *= 1.5;
        }
        
        if (timestamp - this.lastUpdate >= speed) {
            if (!this.gameOver && !this.won) {
                this.update();
            }
            this.lastUpdate = timestamp;
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update() {
        this.direction = { ...this.nextDirection };

        if (this.direction.x === 0 && this.direction.y === 0) return;

        let head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        // Ghost power-up allows passing through walls
        if (this.activePowerUp === 'ghost') {
            if (head.x < 0) head.x = this.tileCount - 1;
            if (head.x >= this.tileCount) head.x = 0;
            if (head.y < 0) head.y = this.tileCount - 1;
            if (head.y >= this.tileCount) head.y = 0;
        } else {
            if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
                this.endGame();
                return;
            }
        }

        // Check collision with self
        if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
            this.endGame();
            return;
        }

        // Check collision with obstacles (only if not ghost mode)
        if (this.activePowerUp !== 'ghost' && this.obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
            this.endGame();
            return;
        }

        this.snake.unshift(head);

        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            let points = 10 * this.phase;
            if (this.activePowerUp === 'double') {
                points *= 2;
            }
            this.score += points;
            this.phaseProgress += 10;
            this.food = this.generateFood();
            this.generateSpecialFood();
            this.generatePowerUp();
            
            // Check phase progression
            if (this.phaseProgress >= this.phaseTarget && this.phase < this.maxPhase) {
                this.phase++;
                this.phaseProgress = 0;
                this.phaseTarget = 50 + (this.phase - 1) * 25;
                this.generateObstacles();
            } else if (this.phase >= this.maxPhase && this.phaseProgress >= this.phaseTarget) {
                this.won = true;
                this.onScore(this.score);
                if (this.manager) {
                    this.manager.unlockAchievement('snake_master');
                }
                return;
            }
            this.updateScoreDisplay();
        } else if (this.specialFood && head.x === this.specialFood.x && head.y === this.specialFood.y) {
            let points = this.specialFood.points * this.phase;
            if (this.activePowerUp === 'double') {
                points *= 2;
            }
            this.score += points;
            this.specialFood = null;
            this.updateScoreDisplay();
        } else if (this.powerUp && head.x === this.powerUp.x && head.y === this.powerUp.y) {
            this.activePowerUp = this.powerUp.type;
            this.powerUpTimer = this.powerUpTypes[this.powerUp.type].duration;
            this.powerUp = null;
        } else {
            this.snake.pop();
        }

        // Update power-up timers
        if (this.specialFood) {
            this.specialFood.timer--;
            if (this.specialFood.timer <= 0) {
                this.specialFood = null;
            }
        }

        if (this.powerUp) {
            this.powerUp.timer--;
            if (this.powerUp.timer <= 0) {
                this.powerUp = null;
            }
        }

        if (this.activePowerUp) {
            this.powerUpTimer--;
            if (this.powerUpTimer <= 0) {
                this.activePowerUp = null;
            }
        }
    }

    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Background with gradient
        const bgGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        if (isDark) {
            bgGradient.addColorStop(0, '#1e293b');
            bgGradient.addColorStop(1, '#0f172a');
        } else {
            bgGradient.addColorStop(0, '#f1f5f9');
            bgGradient.addColorStop(1, '#e2e8f0');
        }
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid pattern
        for (let i = 0; i < this.tileCount; i++) {
            for (let j = 0; j < this.tileCount; j++) {
                if ((i + j) % 2 === 0) {
                    this.ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
                    this.ctx.fillRect(i * this.gridSize, j * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }

        // Draw obstacles
        this.obstacles.forEach(obs => {
            const obsGradient = this.ctx.createRadialGradient(
                obs.x * this.gridSize + this.gridSize / 2,
                obs.y * this.gridSize + this.gridSize / 2,
                0,
                obs.x * this.gridSize + this.gridSize / 2,
                obs.y * this.gridSize + this.gridSize / 2,
                this.gridSize / 2
            );
            obsGradient.addColorStop(0, '#64748b');
            obsGradient.addColorStop(1, '#475569');
            this.ctx.fillStyle = obsGradient;
            this.ctx.fillRect(obs.x * this.gridSize + 2, obs.y * this.gridSize + 2, this.gridSize - 4, this.gridSize - 4);
        });

        // Draw snake with gradient (blue/purple theme)
        this.snake.forEach((seg, i) => {
            const gradient = this.ctx.createRadialGradient(
                seg.x * this.gridSize + this.gridSize / 2,
                seg.y * this.gridSize + this.gridSize / 2,
                0,
                seg.x * this.gridSize + this.gridSize / 2,
                seg.y * this.gridSize + this.gridSize / 2,
                this.gridSize / 2
            );
            
            if (i === 0) {
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(1, '#a855f7');
            } else {
                const ratio = i / this.snake.length;
                gradient.addColorStop(0, `rgba(59, 130, 246, ${1 - ratio * 0.5})`);
                gradient.addColorStop(1, `rgba(168, 85, 247, ${1 - ratio * 0.5})`);
            }
            
            // Ghost mode effect
            if (this.activePowerUp === 'ghost') {
                this.ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.2;
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(
                seg.x * this.gridSize + 1,
                seg.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2,
                4
            );
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });

        // Draw food
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize / 2,
            this.food.y * this.gridSize + this.gridSize / 2,
            this.gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Food stem
        this.ctx.fillStyle = '#22c55e';
        this.ctx.beginPath();
        this.ctx.moveTo(this.food.x * this.gridSize + this.gridSize / 2, this.food.y * this.gridSize + 2);
        this.ctx.lineTo(this.food.x * this.gridSize + this.gridSize / 2 + 3, this.food.y * this.gridSize + 6);
        this.ctx.lineTo(this.food.x * this.gridSize + this.gridSize / 2 - 3, this.food.y * this.gridSize + 6);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw special food
        if (this.specialFood) {
            this.ctx.fillStyle = `rgba(250, 204, 21, ${0.5 + Math.sin(Date.now() / 100) * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(
                this.specialFood.x * this.gridSize + this.gridSize / 2,
                this.specialFood.y * this.gridSize + this.gridSize / 2,
                this.gridSize / 2 - 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('★', this.specialFood.x * this.gridSize + this.gridSize / 2, this.specialFood.y * this.gridSize + this.gridSize / 2 + 4);
        }

        // Draw power-up
        if (this.powerUp) {
            const puType = this.powerUpTypes[this.powerUp.type];
            this.ctx.fillStyle = `rgba(${this.hexToRgb(puType.color)}, ${0.5 + Math.sin(Date.now() / 80) * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(
                this.powerUp.x * this.gridSize + this.gridSize / 2,
                this.powerUp.y * this.gridSize + this.gridSize / 2,
                this.gridSize / 2 - 1,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(puType.icon, this.powerUp.x * this.gridSize + this.gridSize / 2, this.powerUp.y * this.gridSize + this.gridSize / 2 + 4);
        }

        // Draw active power-up indicator
        if (this.activePowerUp) {
            const puType = this.powerUpTypes[this.activePowerUp];
            this.ctx.fillStyle = puType.color;
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${puType.icon} ${puType.name}: ${this.powerUpTimer}`, 5, 15);
        }

        // Draw phase progress bar
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(5, this.canvas.height - 15, this.canvas.width - 10, 10);
        
        const progressWidth = ((this.canvas.width - 10) * this.phaseProgress) / this.phaseTarget;
        const progressGradient = this.ctx.createLinearGradient(5, 0, 5 + progressWidth, 0);
        progressGradient.addColorStop(0, '#3b82f6');
        progressGradient.addColorStop(1, '#a855f7');
        this.ctx.fillStyle = progressGradient;
        this.ctx.fillRect(5, this.canvas.height - 15, progressWidth, 10);

        // Game over / Won screen
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'VOCÊ VENCEU!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            this.ctx.fillText(`Fase: ${this.phase}/${this.maxPhase}`, this.canvas.width / 2, this.canvas.height / 2 + 35);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const phaseEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (phaseEl) phaseEl.textContent = `Fase ${this.phase}/${this.maxPhase}`;
    }

    endGame() {
        this.gameOver = true;
        this.onScore(this.score);
    }
}

class DoomGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        this.canvas.width = 600;
        this.canvas.height = 450;
        
        this.player = { x: 1.5, y: 1.5, angle: 0, health: 100, ammo: 50 };
        this.moveSpeed = 0.08;
        this.rotSpeed = 0.05;
        this.mouseSensitivity = 0.003;
        this.isPointerLocked = false;
        
        this.level = 1;
        this.maxLevel = 3;
        this.score = 0;
        this.kills = 0;
        this.gameOver = false;
        this.won = false;
        this.running = false;
        
        // Animação de tiro
        this.shotAnimations = [];
        this.lastShotAnimTime = 0;
        
        this.maps = [
            [[1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,1],[1,0,1,1,0,1,1,0,0,1],[1,0,1,0,0,0,1,0,0,1],[1,0,0,0,1,0,0,0,0,1],[1,0,1,0,1,0,1,1,0,1],[1,0,1,0,0,0,0,0,0,1],[1,0,0,0,1,1,0,1,0,1],[1,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1]],
            [[1,1,1,1,1,1,1,1,1,1],[1,0,0,0,1,0,0,0,0,1],[1,0,1,0,1,0,1,1,0,1],[1,0,1,0,0,0,0,1,0,1],[1,0,1,1,1,1,0,0,0,1],[1,0,0,0,0,1,0,1,0,1],[1,1,1,0,0,0,0,1,0,1],[1,0,0,0,1,1,0,1,0,1],[1,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1]],
            [[1,1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,1],[1,0,1,1,1,1,1,0,0,1],[1,0,1,0,0,0,0,0,0,1],[1,0,1,0,1,1,1,1,0,1],[1,0,0,0,1,0,0,0,0,1],[1,0,1,0,1,0,1,1,0,1],[1,0,1,0,0,0,0,1,0,1],[1,0,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1,1]]
        ];
        
        this.keys = { w: false, s: false, a: false, d: false, left: false, right: false, shoot: false };
        this.bullets = [];
        this.enemies = [];
        this.pickups = [];
        this.lastShot = 0;
        this.shootCooldown = 300;
        
        this.reset();
        this.setupControls();
    }

    reset() {
        this.map = this.maps[this.level - 1].map(row => [...row]);
        this.player = { x: 1.5, y: 1.5, angle: 0, health: 100, ammo: 50 };
        this.score = this.score || 0;
        this.kills = 0;
        this.gameOver = false;
        this.won = false;
        this.bullets = [];
        this.enemies = [];
        this.pickups = [];
        
        const enemyCount = 3 + (this.level - 1) * 2;
        for (let i = 0; i < enemyCount; i++) this.spawnEnemy();
        this.spawnPickups();
        this.updateScoreDisplay();
    }

    spawnEnemy() {
        let x, y;
        do {
            x = 1 + Math.random() * (this.map[0].length - 2);
            y = 1 + Math.random() * (this.map.length - 2);
        } while (this.map[Math.floor(y)][Math.floor(x)] === 1 || (Math.abs(x - this.player.x) < 3 && Math.abs(y - this.player.y) < 3));
        this.enemies.push({ x, y, health: 30 + this.level * 10, speed: 0.02 + this.level * 0.005, lastShot: 0, shootCooldown: 2000 - this.level * 300, type: Math.random() < 0.3 ? 'boss' : 'normal' });
    }

    spawnPickups() {
        for (let i = 0; i < 3; i++) {
            let x, y;
            do {
                x = 1 + Math.random() * (this.map[0].length - 2);
                y = 1 + Math.random() * (this.map.length - 2);
            } while (this.map[Math.floor(y)][Math.floor(x)] === 1);
            this.pickups.push({ x, y, type: Math.random() < 0.5 ? 'health' : 'ammo' });
        }
    }

    setupControls() {
        this.keyDownHandler = (e) => {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.keys.w = true;
            }
            if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.keys.s = true;
            }
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                this.keys.a = true;
            }
            if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                this.keys.d = true;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.keys.left = true;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.keys.right = true;
            }
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameOver || this.won) {
                    this.level = 1;
                    this.score = 0;
                    this.reset();
                    this.start();
                } else {
                    this.keys.shoot = true;
                }
            }
        };
        this.keyUpHandler = (e) => {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.keys.w = false;
            if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.keys.s = false;
            if (e.key === 'a' || e.key === 'A') this.keys.a = false;
            if (e.key === 'd' || e.key === 'D') this.keys.d = false;
            if (e.key === 'ArrowLeft') this.keys.left = false;
            if (e.key === 'ArrowRight') this.keys.right = false;
            if (e.key === ' ') this.keys.shoot = false;
        };
        
        this.mouseMoveHandler = (e) => {
            if (this.isPointerLocked) {
                this.player.angle += e.movementX * this.mouseSensitivity;
            }
        };
        
        this.mouseClickHandler = (e) => {
            if (!this.isPointerLocked && !this.gameOver && !this.won) {
                this.canvas.requestPointerLock();
            } else if (this.isPointerLocked) {
                this.keys.shoot = true;
                setTimeout(() => { this.keys.shoot = false; }, 100);
            }
        };
        
        this.pointerLockChangeHandler = () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        document.addEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.addEventListener('click', this.mouseClickHandler);
        document.addEventListener('pointerlockchange', this.pointerLockChangeHandler);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = Date.now();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.removeEventListener('click', this.mouseClickHandler);
        document.removeEventListener('pointerlockchange', this.pointerLockChangeHandler);
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
        this.keys = { w: false, s: false, a: false, d: false, left: false, right: false, shoot: false };
    }

    gameLoop() {
        if (!this.running) return;
        if (!this.gameOver && !this.won) this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    canMove(x, y) {
        const m = 0.2;
        return this.map[Math.floor(y - m)] && this.map[Math.floor(y + m)] && this.map[Math.floor(y - m)][Math.floor(x - m)] !== 1 && this.map[Math.floor(y - m)][Math.floor(x + m)] !== 1 && this.map[Math.floor(y + m)][Math.floor(x - m)] !== 1 && this.map[Math.floor(y + m)][Math.floor(x + m)] !== 1;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shootCooldown || this.player.ammo <= 0) return;
        this.lastShot = now;
        this.player.ammo--;
        this.bullets.push({ x: this.player.x, y: this.player.y, dx: Math.cos(this.player.angle) * 0.3, dy: Math.sin(this.player.angle) * 0.3, isEnemy: false });
        
        // Adicionar efeito de tiro
        this.shotAnimations.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 8,
            maxRadius: 30,
            opacity: 1,
            startTime: now
        });
        
        this.updateScoreDisplay();
    }

    update() {
        if (this.keys.left) this.player.angle -= this.rotSpeed;
        if (this.keys.right) this.player.angle += this.rotSpeed;
        
        let dx = 0, dy = 0;
        if (this.keys.w) { dx += Math.cos(this.player.angle) * this.moveSpeed; dy += Math.sin(this.player.angle) * this.moveSpeed; }
        if (this.keys.s) { dx -= Math.cos(this.player.angle) * this.moveSpeed; dy -= Math.sin(this.player.angle) * this.moveSpeed; }
        if (this.keys.a) { dx += Math.cos(this.player.angle - Math.PI/2) * this.moveSpeed; dy += Math.sin(this.player.angle - Math.PI/2) * this.moveSpeed; }
        if (this.keys.d) { dx += Math.cos(this.player.angle + Math.PI/2) * this.moveSpeed; dy += Math.sin(this.player.angle + Math.PI/2) * this.moveSpeed; }
        
        if (this.canMove(this.player.x + dx, this.player.y)) this.player.x += dx;
        if (this.canMove(this.player.x, this.player.y + dy)) this.player.y += dy;
        
        if (this.keys.shoot) this.shoot();
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.dx; bullet.y += bullet.dy;
            if (this.map[Math.floor(bullet.y)] && this.map[Math.floor(bullet.y)][Math.floor(bullet.x)] === 1) return false;
            if (!bullet.isEnemy) {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2) < 0.5) {
                        enemy.health -= 20;
                        if (enemy.health <= 0) {
                            this.score += (enemy.type === 'boss' ? 200 : 100) * this.level;
                            this.kills++;
                            this.enemies.splice(i, 1);
                            this.updateScoreDisplay();
                            if (this.enemies.length === 0) {
                                if (this.level < this.maxLevel) { this.level++; this.reset(); }
                                else { this.won = true; this.onScore(this.score); if (this.manager) this.manager.unlockAchievement('doom_slayer'); }
                            }
                        }
                        return false;
                    }
                }
            }
            if (bullet.isEnemy && Math.sqrt((bullet.x - this.player.x) ** 2 + (bullet.y - this.player.y) ** 2) < 0.3) {
                this.player.health -= 10; this.updateScoreDisplay(); if (this.player.health <= 0) this.endGame(); return false;
            }
            return bullet.x > 0 && bullet.x < this.map[0].length && bullet.y > 0 && bullet.y < this.map.length;
        });
        
        const now = Date.now();
        this.enemies.forEach(enemy => {
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const newX = enemy.x + Math.cos(angle) * enemy.speed;
            const newY = enemy.y + Math.sin(angle) * enemy.speed;
            if (this.canMove(newX, enemy.y)) enemy.x = newX;
            if (this.canMove(enemy.x, newY)) enemy.y = newY;
            const dist = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
            if (dist < 5 && now - enemy.lastShot > enemy.shootCooldown) {
                enemy.lastShot = now;
                this.bullets.push({ x: enemy.x, y: enemy.y, dx: Math.cos(angle) * 0.15, dy: Math.sin(angle) * 0.15, isEnemy: true });
            }
            if (dist < 0.4) { this.player.health -= 1; this.updateScoreDisplay(); if (this.player.health <= 0) this.endGame(); }
        });
        
        this.pickups = this.pickups.filter(pickup => {
            if (Math.sqrt((pickup.x - this.player.x) ** 2 + (pickup.y - this.player.y) ** 2) < 0.5) {
                if (pickup.type === 'health') this.player.health = Math.min(100, this.player.health + 25);
                else this.player.ammo += 20;
                this.updateScoreDisplay();
                return false;
            }
            return true;
        });
    }

    draw() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);
        this.ctx.fillStyle = '#3d3d5c';
        this.ctx.fillRect(0, this.canvas.height / 2, this.canvas.width, this.canvas.height / 2);
        
        const fov = Math.PI / 3;
        const numRays = 80;
        for (let i = 0; i < numRays; i++) {
            const rayAngle = this.player.angle - fov / 2 + i * (fov / numRays);
            const result = this.castRay(rayAngle);
            if (result.distance > 0) {
                const wallHeight = Math.min(this.canvas.height, (this.canvas.height / result.distance) * 0.8);
                const wallTop = (this.canvas.height - wallHeight) / 2;
                const brightness = Math.max(0.2, 1 - result.distance / 8);
                const r = Math.floor(result.side ? 100 * brightness : 80 * brightness);
                const g = Math.floor(result.side ? 50 * brightness : 40 * brightness);
                const b = Math.floor(result.side ? 150 * brightness : 120 * brightness);
                this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.ctx.fillRect(i * (this.canvas.width / numRays), wallTop, (this.canvas.width / numRays) + 1, wallHeight);
            }
        }
        
        this.drawShotAnimations();
        
        this.enemies.forEach(enemy => {
            const dx = enemy.x - this.player.x, dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let angle = Math.atan2(dy, dx) - this.player.angle;
            while (angle < -Math.PI) angle += Math.PI * 2;
            while (angle > Math.PI) angle -= Math.PI * 2;
            if (Math.abs(angle) < fov / 2 + 0.2 && this.isEnemyVisible(enemy)) {
                const screenX = this.canvas.width / 2 + (angle / (fov / 2)) * (this.canvas.width / 2);
                const size = Math.min(200, (this.canvas.height / dist) * 0.6);
                const screenY = (this.canvas.height - size) / 2;
                this.ctx.fillStyle = enemy.type === 'boss' ? '#dc2626' : '#ef4444';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY + size * 0.4, size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = enemy.type === 'boss' ? '#b91c1c' : '#dc2626';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY + size * 0.15, size * 0.2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(screenX - size * 0.08, screenY + size * 0.12, size * 0.05, 0, Math.PI * 2);
                this.ctx.arc(screenX + size * 0.08, screenY + size * 0.12, size * 0.05, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        this.pickups.forEach(pickup => {
            const dx = pickup.x - this.player.x, dy = pickup.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let angle = Math.atan2(dy, dx) - this.player.angle;
            while (angle < -Math.PI) angle += Math.PI * 2;
            while (angle > Math.PI) angle -= Math.PI * 2;
            if (Math.abs(angle) < fov / 2 && this.isEnemyVisible(pickup)) {
                const screenX = this.canvas.width / 2 + (angle / (fov / 2)) * (this.canvas.width / 2);
                const size = Math.min(50, (30 / dist));
                this.ctx.fillStyle = pickup.type === 'health' ? '#22c55e' : '#3b82f6';
                this.ctx.beginPath();
                this.ctx.arc(screenX, this.canvas.height / 2 + 20, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(this.canvas.width / 2 - 20, this.canvas.height - 80, 40, 80);
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(this.canvas.width / 2 - 5, this.canvas.height - 100, 10, 30);
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2 - 10, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width / 2 + 10, this.canvas.height / 2);
        this.ctx.moveTo(this.canvas.width / 2, this.canvas.height / 2 - 10);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height / 2 + 10);
        this.ctx.stroke();
        
        this.drawHUD();
        this.drawMinimap();
        
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'VITÓRIA!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            this.ctx.font = '18px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 5);
            this.ctx.fillText(`Nível: ${this.level}/${this.maxLevel}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
    }

    castRay(angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        let x = this.player.x, y = this.player.y;
        for (let i = 0; i < 100; i++) {
            x += cos * 0.05; y += sin * 0.05;
            const mapX = Math.floor(x), mapY = Math.floor(y);
            if (mapY >= 0 && mapY < this.map.length && mapX >= 0 && mapX < this.map[0].length && this.map[mapY][mapX] === 1) {
                const distance = Math.sqrt((x - this.player.x) ** 2 + (y - this.player.y) ** 2) * Math.cos(angle - this.player.angle);
                return { distance, side: Math.abs(x - mapX - 0.5) > Math.abs(y - mapY - 0.5) };
            }
        }
        return { distance: 0, side: false };
    }

    isEnemyVisible(enemy) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const RAY_STEPS_PER_UNIT = 20; // Number of ray steps per map unit for visibility check
        const OBJECT_PROXIMITY_THRESHOLD = 0.3; // Distance threshold to consider reaching the object
        const stepX = dx / (dist * RAY_STEPS_PER_UNIT);
        const stepY = dy / (dist * RAY_STEPS_PER_UNIT);
        
        let x = this.player.x;
        let y = this.player.y;
        
        for (let i = 0; i < dist * RAY_STEPS_PER_UNIT; i++) {
            x += stepX;
            y += stepY;
            const mapX = Math.floor(x);
            const mapY = Math.floor(y);
            
            if (mapY >= 0 && mapY < this.map.length && mapX >= 0 && mapX < this.map[0].length) {
                if (this.map[mapY][mapX] === 1) {
                    return false;
                }
            }
            
            if (Math.sqrt((x - enemy.x) ** 2 + (y - enemy.y) ** 2) < OBJECT_PROXIMITY_THRESHOLD) {
                return true;
            }
        }
        return true;
    }

    drawHUD() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, this.canvas.height - 30, 104, 20);
        this.ctx.fillStyle = this.player.health > 30 ? '#22c55e' : '#ef4444';
        this.ctx.fillRect(12, this.canvas.height - 28, this.player.health, 16);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`HP: ${this.player.health}`, 15, this.canvas.height - 15);
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Munição: ${this.player.ammo}`, this.canvas.width - 10, this.canvas.height - 15);
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Nível ${this.level}/${this.maxLevel}`, 10, 20);
        this.ctx.fillText(`Inimigos: ${this.enemies.length}`, 10, 38);
    }

    drawMinimap() {
        const mapSize = 60, tileSize = mapSize / this.map.length;
        const offsetX = this.canvas.width - mapSize - 10, offsetY = 10;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(offsetX - 2, offsetY - 2, mapSize + 4, mapSize + 4);
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                this.ctx.fillStyle = this.map[y][x] === 1 ? '#666' : '#333';
                this.ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
            }
        }
        this.ctx.fillStyle = '#ef4444';
        this.enemies.forEach(e => {
            this.ctx.beginPath();
            this.ctx.arc(offsetX + e.x * tileSize, offsetY + e.y * tileSize, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.fillStyle = '#22c55e';
        this.ctx.beginPath();
        this.ctx.arc(offsetX + this.player.x * tileSize, offsetY + this.player.y * tileSize, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX + this.player.x * tileSize, offsetY + this.player.y * tileSize);
        this.ctx.lineTo(offsetX + (this.player.x + Math.cos(this.player.angle) * 1.5) * tileSize, offsetY + (this.player.y + Math.sin(this.player.angle) * 1.5) * tileSize);
        this.ctx.stroke();
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const infoEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (infoEl) infoEl.textContent = `HP: ${this.player.health} | Munição: ${this.player.ammo} | Nível ${this.level}`;
    }

    drawShotAnimations() {
        const now = Date.now();
        this.shotAnimations = this.shotAnimations.filter(shot => {
            const elapsed = now - shot.startTime;
            const duration = 200; // Duração da animação em ms
            
            if (elapsed > duration) return false;
            
            const progress = elapsed / duration;
            const currentRadius = shot.radius + (shot.maxRadius - shot.radius) * progress;
            const opacity = 1 - progress;
            
            // Desenhar círculo expandido
            this.ctx.strokeStyle = `rgba(255, 200, 0, ${opacity * 0.7})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(shot.x, shot.y, currentRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Desenhar ponto central amarelo
            this.ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(shot.x, shot.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            return true;
        });
    }

    endGame() {
        this.gameOver = true;
        this.onScore(this.score);
    }
}

class TypingGame {
    constructor(canvas, onScore) {
        this.canvas = canvas;
        this.onScore = onScore;
        this.container = canvas.parentElement;
        
        // Expanded Portuguese word list
        this.portugueseWords = [
            // Common words
            'casa', 'bola', 'vida', 'amor', 'tempo', 'mundo', 'coisa', 'pessoa', 'olho', 'mao',
            'lugar', 'parte', 'forma', 'lado', 'hora', 'ponto', 'agua', 'nome', 'terra', 'cidade',
            'trabalho', 'momento', 'governo', 'empresa', 'projeto', 'sistema', 'problema', 'processo',
            'desenvolvimento', 'informacao', 'tecnologia', 'conhecimento', 'comunicacao', 'educacao',
            // Day to day words
            'hoje', 'ontem', 'amanha', 'agora', 'sempre', 'nunca', 'muito', 'pouco', 'mais', 'menos',
            'bem', 'mal', 'sim', 'nao', 'talvez', 'aqui', 'ali', 'la', 'onde', 'quando',
            'como', 'porque', 'para', 'com', 'sem', 'sobre', 'entre', 'desde', 'ate', 'apos',
            // Common verbs
            'ser', 'estar', 'ter', 'fazer', 'poder', 'dizer', 'dar', 'ver', 'saber', 'querer',
            'chegar', 'passar', 'ficar', 'deixar', 'parecer', 'levar', 'seguir', 'encontrar', 'chamar', 'vir',
            'pensar', 'sair', 'voltar', 'tomar', 'conhecer', 'viver', 'sentir', 'criar', 'falar', 'trazer',
            'lembrar', 'acabar', 'comecar', 'mostrar', 'ouvir', 'continuar', 'aprender', 'entender', 'perder', 'ganhar',
            // Common nouns
            'familia', 'amigo', 'crianca', 'homem', 'mulher', 'pai', 'mae', 'filho', 'filha', 'irmao',
            'escola', 'livro', 'porta', 'janela', 'mesa', 'cadeira', 'carro', 'rua', 'praia', 'sol',
            'lua', 'estrela', 'flor', 'arvore', 'animal', 'cachorro', 'gato', 'passaro', 'peixe', 'comida',
            'roupa', 'sapato', 'bolsa', 'telefone', 'computador', 'musica', 'filme', 'jogo', 'festa', 'viagem',
            // Common adjectives
            'bom', 'mau', 'grande', 'pequeno', 'novo', 'velho', 'jovem', 'bonito', 'feio', 'forte',
            'fraco', 'rapido', 'lento', 'alto', 'baixo', 'largo', 'estreito', 'longo', 'curto', 'cheio',
            'vazio', 'quente', 'frio', 'claro', 'escuro', 'limpo', 'sujo', 'facil', 'dificil', 'certo',
            'errado', 'feliz', 'triste', 'rico', 'pobre', 'doce', 'amargo', 'salgado', 'azedo', 'macio',
            // Numbers as words
            'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
            'cem', 'mil', 'primeiro', 'segundo', 'terceiro', 'ultimo', 'metade', 'dobro', 'triplo', 'zero',
            // More useful words
            'banco', 'hospital', 'mercado', 'restaurante', 'hotel', 'aeroporto', 'estacao', 'parque', 'praca', 'igreja',
            'dinheiro', 'preco', 'conta', 'cartao', 'documento', 'passaporte', 'endereco', 'numero', 'email', 'senha'
        ];
        
        this.englishWords = [
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
            'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
            'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
            'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
            'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
            'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
            'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
        ];
        
        this.punctuationMarks = ['.', ',', '!', '?', ';', ':'];
        this.numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        
        // Game settings
        this.language = 'pt'; // 'pt' or 'en'
        this.includePunctuation = false;
        this.includeNumbers = false;
        this.gameMode = 'time'; // 'time' or 'words'
        this.timeLimit = 30;
        this.wordLimit = 25;
        
        // Game state
        this.running = false;
        this.gameEnded = false;
        this.timeLeft = this.timeLimit;
        this.elapsedTime = 0;
        this.currentWordIndex = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.extraChars = 0;
        this.totalTyped = 0;
        this.wordsCompleted = 0;
        this.wordInputs = [];
        this.timerInterval = null;
        this.tabPressed = false;
        
        this.createUI();
    }

    createUI() {
        this.canvas.style.display = 'none';
        
        let typingUI = document.getElementById('typing-game-ui');
        if (typingUI) typingUI.remove();
        
        typingUI = document.createElement('div');
        typingUI.id = 'typing-game-ui';
        typingUI.className = 'w-full max-w-4xl mx-auto select-none';
        typingUI.innerHTML = `
            <style>
                #typing-game-ui .word { display: inline-block; margin: 0 5px 5px 0; }
                #typing-game-ui .letter { transition: color 0.1s; }
                #typing-game-ui .letter.correct { color: #22c55e; }
                #typing-game-ui .letter.incorrect { color: #ef4444; }
                #typing-game-ui .letter.extra { color: #ef4444; opacity: 0.7; }
                #typing-game-ui .word.current { border-bottom: 2px solid #3b82f6; }
                #typing-game-ui .caret {
                    position: absolute;
                    width: 2px;
                    height: 1.5em;
                    background: #3b82f6;
                    animation: caret-blink 1s infinite;
                    transition: left 0.08s ease-out, top 0.08s ease-out;
                }
                @keyframes caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                #typing-game-ui .typing-input-hidden {
                    position: fixed;
                    left: -9999px;
                    top: 0;
                    width: 1px;
                    height: 1px;
                    opacity: 0.01;
                }
                #typing-game-ui .stats-row { display: flex; gap: 2rem; justify-content: center; margin-bottom: 1rem; }
                #typing-game-ui .stat-item { text-align: center; }
                #typing-game-ui .stat-value { font-size: 2rem; font-weight: bold; color: #3b82f6; }
                #typing-game-ui .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
                #typing-game-ui .options-bar { 
                    display: flex; 
                    flex-wrap: wrap;
                    gap: 0.75rem; 
                    justify-content: center; 
                    align-items: center;
                    margin-bottom: 1rem; 
                    padding: 0.75rem;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 0.5rem;
                    border: 1px solid rgba(71, 85, 105, 0.3);
                }
                #typing-game-ui .option-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                #typing-game-ui .option-separator {
                    width: 1px;
                    height: 24px;
                    background: #475569;
                    margin: 0 0.25rem;
                }
                #typing-game-ui .toggle-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.35rem 0.65rem;
                    border-radius: 0.375rem;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                #typing-game-ui .toggle-btn:hover { color: #94a3b8; }
                #typing-game-ui .toggle-btn.active { color: #3b82f6; background: rgba(59, 130, 246, 0.15); }
                #typing-game-ui .mode-btn {
                    padding: 0.35rem 0.65rem;
                    border-radius: 0.375rem;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                #typing-game-ui .mode-btn:hover { color: #94a3b8; }
                #typing-game-ui .mode-btn.active { color: #3b82f6; }
                #typing-game-ui .value-btn {
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                #typing-game-ui .value-btn:hover { color: #94a3b8; }
                #typing-game-ui .value-btn.active { color: #3b82f6; }
                #typing-game-ui .lang-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.35rem 0.65rem;
                    border-radius: 0.375rem;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                #typing-game-ui .lang-btn:hover { color: #94a3b8; }
                #typing-game-ui .lang-btn.active { color: #3b82f6; }
                #typing-game-ui .words-container {
                    position: relative;
                    font-size: 1.4rem;
                    line-height: 2;
                    color: #64748b;
                    font-family: 'Roboto Mono', 'Consolas', monospace;
                    min-height: 150px;
                    max-height: 180px;
                    overflow: hidden;
                    padding: 1rem;
                    background: rgba(15, 23, 42, 0.6);
                    border-radius: 0.5rem;
                    border: 1px solid rgba(71, 85, 105, 0.3);
                    cursor: text;
                }
                #typing-game-ui .focus-warning {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(15, 23, 42, 0.95);
                    padding: 1rem 2rem;
                    border-radius: 0.5rem;
                    color: #94a3b8;
                    font-size: 0.95rem;
                    display: none;
                    z-index: 10;
                    border: 1px solid rgba(71, 85, 105, 0.5);
                }
                #typing-game-ui .words-container.blur .words-wrap { filter: blur(5px); pointer-events: none; }
                #typing-game-ui .words-container.blur .focus-warning { display: flex; align-items: center; }
                #typing-game-ui .result-screen {
                    text-align: center;
                    padding: 2rem;
                }
                #typing-game-ui .result-wpm { font-size: 4rem; color: #3b82f6; font-weight: bold; }
                #typing-game-ui .result-label { color: #64748b; font-size: 1rem; margin-bottom: 0.5rem; text-transform: uppercase; }
                #typing-game-ui .result-stats { 
                    display: flex; 
                    justify-content: center; 
                    gap: 2.5rem; 
                    margin-top: 1.5rem;
                    flex-wrap: wrap;
                }
                #typing-game-ui .result-stat-value { font-size: 1.5rem; color: #e2e8f0; font-weight: 600; }
                #typing-game-ui .result-stat-detail { font-size: 0.85rem; color: #64748b; margin-top: 0.25rem; }
                #typing-game-ui .restart-hint { color: #64748b; margin-top: 2rem; font-size: 0.85rem; }
                #typing-game-ui .restart-hint kbd {
                    background: #334155;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-family: inherit;
                    border: 1px solid #475569;
                }
                #typing-game-ui .restart-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin: 1.5rem auto 0;
                    padding: 0.6rem 1.5rem;
                    background: rgba(59, 130, 246, 0.15);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 0.5rem;
                    color: #3b82f6;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                #typing-game-ui .restart-btn:hover {
                    background: rgba(59, 130, 246, 0.25);
                    border-color: rgba(59, 130, 246, 0.5);
                }
                #typing-game-ui .bottom-bar {
                    display: flex;
                    justify-content: center;
                    margin-top: 1rem;
                }
                #typing-game-ui .bottom-restart-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    background: transparent;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-radius: 0.375rem;
                }
                #typing-game-ui .bottom-restart-btn:hover {
                    color: #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                }
            </style>
            
            <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <!-- Options Bar -->
                <div class="options-bar" id="options-bar">
                    <!-- Toggles -->
                    <div class="option-group">
                        <button class="toggle-btn" id="punctuation-toggle" title="Adicionar pontuação">
                            <span>@</span>
                            <span>pontuação</span>
                        </button>
                        <button class="toggle-btn" id="numbers-toggle" title="Adicionar números">
                            <span>#</span>
                            <span>números</span>
                        </button>
                    </div>
                    
                    <div class="option-separator"></div>
                    
                    <!-- Game Mode -->
                    <div class="option-group">
                        <button class="mode-btn active" id="mode-time" data-mode="time">
                            <i data-lucide="clock" class="w-4 h-4 inline mr-1"></i>tempo
                        </button>
                        <button class="mode-btn" id="mode-words" data-mode="words">
                            <i data-lucide="text" class="w-4 h-4 inline mr-1"></i>palavras
                        </button>
                    </div>
                    
                    <div class="option-separator"></div>
                    
                    <!-- Time/Word Values -->
                    <div class="option-group" id="time-values">
                        <button class="value-btn" data-time="15">15</button>
                        <button class="value-btn active" data-time="30">30</button>
                        <button class="value-btn" data-time="60">60</button>
                        <button class="value-btn" data-time="120">120</button>
                    </div>
                    <div class="option-group" id="word-values" style="display: none;">
                        <button class="value-btn" data-words="10">10</button>
                        <button class="value-btn active" data-words="25">25</button>
                        <button class="value-btn" data-words="50">50</button>
                        <button class="value-btn" data-words="100">100</button>
                    </div>
                    
                    <div class="option-separator"></div>
                    
                    <!-- Language -->
                    <div class="option-group">
                        <button class="lang-btn active" id="lang-pt" data-lang="pt">
                            <i data-lucide="globe" class="w-4 h-4"></i>
                            <span>português</span>
                        </button>
                        <button class="lang-btn" id="lang-en" data-lang="en">
                            <span>english</span>
                        </button>
                    </div>
                </div>
                
                <!-- Live Stats -->
                <div class="stats-row" id="typing-stats">
                    <div class="stat-item">
                        <div class="stat-value" id="typing-wpm">0</div>
                        <div class="stat-label">wpm</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="typing-accuracy">100%</div>
                        <div class="stat-label">precisão</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="typing-time">${this.gameMode === 'time' ? this.timeLimit : '0'}</div>
                        <div class="stat-label" id="time-label">${this.gameMode === 'time' ? 'segundos' : 'tempo'}</div>
                    </div>
                    <div class="stat-item" id="words-progress-item" style="${this.gameMode === 'words' ? '' : 'display: none;'}">
                        <div class="stat-value" id="typing-words-progress">0/${this.wordLimit}</div>
                        <div class="stat-label">palavras</div>
                    </div>
                </div>
                
                <!-- Words Container -->
                <div class="words-container blur" id="words-container">
                    <div class="focus-warning">
                        <i data-lucide="mouse-pointer-click" class="w-5 h-5 mr-2"></i>
                        <span>Clique aqui ou pressione qualquer tecla para focar</span>
                    </div>
                    <div class="words-wrap" id="words-display"></div>
                    <div class="caret" id="typing-caret" style="display: none;"></div>
                </div>
                
                <input type="text" id="typing-input" class="typing-input-hidden" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                
                <!-- Bottom Bar with Restart -->
                <div class="bottom-bar" id="bottom-bar">
                    <button class="bottom-restart-btn" id="restart-btn" title="Reiniciar teste">
                        <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <!-- Results Screen -->
                <div id="typing-results" class="result-screen hidden">
                    <div class="result-label">wpm</div>
                    <div class="result-wpm" id="result-wpm">0</div>
                    <div class="result-stats">
                        <div class="stat-item">
                            <div class="result-stat-value" id="result-accuracy">100%</div>
                            <div class="stat-label">precisão</div>
                        </div>
                        <div class="stat-item">
                            <div class="result-stat-value" id="result-correct">0</div>
                            <div class="result-stat-detail">corretos</div>
                            <div class="stat-label">caracteres</div>
                        </div>
                        <div class="stat-item">
                            <div class="result-stat-value" id="result-incorrect">0</div>
                            <div class="result-stat-detail">incorretos</div>
                            <div class="stat-label">caracteres</div>
                        </div>
                        <div class="stat-item">
                            <div class="result-stat-value" id="result-extra">0</div>
                            <div class="result-stat-detail">extras</div>
                            <div class="stat-label">caracteres</div>
                        </div>
                        <div class="stat-item">
                            <div class="result-stat-value" id="result-time">0s</div>
                            <div class="stat-label">tempo</div>
                        </div>
                    </div>
                    <button class="restart-btn" id="result-restart-btn">
                        <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        <span>Reiniciar</span>
                    </button>
                    <div class="restart-hint">
                        <kbd>Tab</kbd> + <kbd>Enter</kbd> - reiniciar teste
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(typingUI);
        lucide.createIcons();
        
        // Cache DOM elements
        this.wordsContainer = document.getElementById('words-container');
        this.wordsDisplay = document.getElementById('words-display');
        this.input = document.getElementById('typing-input');
        this.caret = document.getElementById('typing-caret');
        this.resultsDiv = document.getElementById('typing-results');
        this.statsDiv = document.getElementById('typing-stats');
        this.optionsBar = document.getElementById('options-bar');
        this.bottomBar = document.getElementById('bottom-bar');
        
        this.setupEventListeners(typingUI);
        this.generateWords();
        this.renderWords();
    }
    
    setupEventListeners(typingUI) {
        // Punctuation toggle
        const punctToggle = document.getElementById('punctuation-toggle');
        punctToggle.addEventListener('click', () => {
            if (this.running) return;
            this.includePunctuation = !this.includePunctuation;
            punctToggle.classList.toggle('active', this.includePunctuation);
            this.reset();
        });
        
        // Numbers toggle
        const numToggle = document.getElementById('numbers-toggle');
        numToggle.addEventListener('click', () => {
            if (this.running) return;
            this.includeNumbers = !this.includeNumbers;
            numToggle.classList.toggle('active', this.includeNumbers);
            this.reset();
        });
        
        // Game mode buttons
        const modeTime = document.getElementById('mode-time');
        const modeWords = document.getElementById('mode-words');
        const timeValues = document.getElementById('time-values');
        const wordValues = document.getElementById('word-values');
        
        modeTime.addEventListener('click', () => {
            if (this.running) return;
            this.gameMode = 'time';
            modeTime.classList.add('active');
            modeWords.classList.remove('active');
            timeValues.style.display = '';
            wordValues.style.display = 'none';
            this.updateStatsDisplay();
            this.reset();
        });
        
        modeWords.addEventListener('click', () => {
            if (this.running) return;
            this.gameMode = 'words';
            modeWords.classList.add('active');
            modeTime.classList.remove('active');
            wordValues.style.display = '';
            timeValues.style.display = 'none';
            this.updateStatsDisplay();
            this.reset();
        });
        
        // Time value buttons
        typingUI.querySelectorAll('#time-values .value-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.running) return;
                typingUI.querySelectorAll('#time-values .value-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.timeLimit = parseInt(btn.dataset.time);
                this.reset();
            });
        });
        
        // Word value buttons
        typingUI.querySelectorAll('#word-values .value-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.running) return;
                typingUI.querySelectorAll('#word-values .value-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.wordLimit = parseInt(btn.dataset.words);
                this.reset();
            });
        });
        
        // Language buttons
        const langPt = document.getElementById('lang-pt');
        const langEn = document.getElementById('lang-en');
        
        langPt.addEventListener('click', () => {
            if (this.running) return;
            this.language = 'pt';
            langPt.classList.add('active');
            langEn.classList.remove('active');
            this.reset();
        });
        
        langEn.addEventListener('click', () => {
            if (this.running) return;
            this.language = 'en';
            langEn.classList.add('active');
            langPt.classList.remove('active');
            this.reset();
        });
        
        // Restart buttons
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.reset();
            this.focusInput();
        });
        
        document.getElementById('result-restart-btn').addEventListener('click', () => {
            this.reset();
            this.focusInput();
        });
        
        // Words container click
        this.wordsContainer.addEventListener('click', () => this.focusInput());
        
        // Input events
        this.input.addEventListener('input', () => this.handleInput());
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.input.addEventListener('blur', () => this.handleBlur());
        this.input.addEventListener('focus', () => this.handleFocus());
        
        // Tab + Enter restart
        this.keydownHandler = (e) => {
            if (e.key === 'Tab' && this.gameEnded) {
                e.preventDefault();
                this.tabPressed = true;
            }
            if (e.key === 'Enter' && this.tabPressed && this.gameEnded) {
                e.preventDefault();
                this.reset();
                this.focusInput();
                this.tabPressed = false;
            }
        };
        
        this.keyupHandler = (e) => {
            if (e.key === 'Tab') this.tabPressed = false;
        };
        
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }
    
    updateStatsDisplay() {
        const timeEl = document.getElementById('typing-time');
        const timeLabel = document.getElementById('time-label');
        const wordsProgressItem = document.getElementById('words-progress-item');
        const wordsProgress = document.getElementById('typing-words-progress');
        
        if (this.gameMode === 'time') {
            timeEl.textContent = this.timeLimit;
            timeLabel.textContent = 'segundos';
            wordsProgressItem.style.display = 'none';
        } else {
            timeEl.textContent = '0';
            timeLabel.textContent = 'tempo';
            wordsProgressItem.style.display = '';
            wordsProgress.textContent = `0/${this.wordLimit}`;
        }
    }

    focusInput() {
        this.input.focus();
    }

    handleFocus() {
        this.wordsContainer.classList.remove('blur');
        this.caret.style.display = 'block';
        this.updateCaretPosition();
    }

    handleBlur() {
        if (!this.gameEnded) {
            this.wordsContainer.classList.add('blur');
            this.caret.style.display = 'none';
        }
    }

    reset() {
        this.timeLeft = this.timeLimit;
        this.elapsedTime = 0;
        this.currentWordIndex = 0;
        this.correctChars = 0;
        this.incorrectChars = 0;
        this.extraChars = 0;
        this.totalTyped = 0;
        this.wordsCompleted = 0;
        this.running = false;
        this.gameEnded = false;
        this.wordInputs = [];
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.generateWords();
        this.renderWords();
        
        if (this.input) {
            this.input.value = '';
            this.input.disabled = false;
        }
        
        if (this.resultsDiv) this.resultsDiv.classList.add('hidden');
        if (this.statsDiv) this.statsDiv.classList.remove('hidden');
        if (this.optionsBar) this.optionsBar.classList.remove('hidden');
        if (this.bottomBar) this.bottomBar.classList.remove('hidden');
        if (this.wordsContainer) {
            this.wordsContainer.style.display = 'block';
            this.wordsContainer.classList.add('blur');
        }
        
        // Reset live stats
        const wpmEl = document.getElementById('typing-wpm');
        const accEl = document.getElementById('typing-accuracy');
        const timeEl = document.getElementById('typing-time');
        const wordsProgress = document.getElementById('typing-words-progress');
        
        if (wpmEl) wpmEl.textContent = '0';
        if (accEl) accEl.textContent = '100%';
        
        if (this.gameMode === 'time') {
            if (timeEl) timeEl.textContent = this.timeLimit;
        } else {
            if (timeEl) timeEl.textContent = '0';
            if (wordsProgress) wordsProgress.textContent = `0/${this.wordLimit}`;
        }
        
        this.updateStatsDisplay();
    }

    getWordList() {
        return this.language === 'pt' ? this.portugueseWords : this.englishWords;
    }

    generateSingleWord() {
        const wordList = this.getWordList();
        let word = wordList[Math.floor(Math.random() * wordList.length)];
        
        // Add punctuation randomly
        if (this.includePunctuation && Math.random() < 0.15) {
            const punct = this.punctuationMarks[Math.floor(Math.random() * this.punctuationMarks.length)];
            word = word + punct;
        }
        
        // Add numbers randomly
        if (this.includeNumbers && Math.random() < 0.1) {
            const num = Math.floor(Math.random() * 100).toString();
            word = Math.random() < 0.5 ? num + word : word + num;
        }
        
        return word;
    }

    generateWords() {
        const wordCount = this.gameMode === 'words' ? this.wordLimit : 150;
        
        this.testWords = [];
        for (let i = 0; i < wordCount; i++) {
            this.testWords.push(this.generateSingleWord());
        }
        this.wordInputs = this.testWords.map(() => '');
    }

    renderWords() {
        if (!this.wordsDisplay) return;
        
        let html = '';
        this.testWords.forEach((word, wordIndex) => {
            const wordInput = this.wordInputs[wordIndex] || '';
            let wordClass = 'word';
            if (wordIndex === this.currentWordIndex) wordClass += ' current';
            
            let wordHtml = `<span class="${wordClass}" data-word="${wordIndex}">`;
            
            for (let i = 0; i < word.length; i++) {
                let letterClass = 'letter';
                if (wordIndex < this.currentWordIndex) {
                    letterClass += wordInput[i] === word[i] ? ' correct' : ' incorrect';
                } else if (wordIndex === this.currentWordIndex && i < wordInput.length) {
                    letterClass += wordInput[i] === word[i] ? ' correct' : ' incorrect';
                }
                wordHtml += `<span class="${letterClass}" data-char="${i}">${word[i]}</span>`;
            }
            
            if (wordInput.length > word.length) {
                for (let i = word.length; i < wordInput.length; i++) {
                    wordHtml += `<span class="letter extra">${wordInput[i]}</span>`;
                }
            }
            
            wordHtml += '</span>';
            html += wordHtml;
        });
        
        this.wordsDisplay.innerHTML = html;
        this.scrollToCurrentWord();
    }

    scrollToCurrentWord() {
        const currentWordEl = this.wordsDisplay.querySelector('.word.current');
        if (currentWordEl && this.wordsContainer) {
            const containerRect = this.wordsContainer.getBoundingClientRect();
            const wordRect = currentWordEl.getBoundingClientRect();
            
            if (wordRect.top > containerRect.top + 80) {
                this.wordsContainer.scrollTop += 48;
            }
        }
    }

    updateCaretPosition() {
        if (!this.caret || !this.wordsDisplay) return;
        
        const currentWordEl = this.wordsDisplay.querySelector('.word.current');
        if (!currentWordEl) return;
        
        const chars = currentWordEl.querySelectorAll('.letter');
        const currentInput = this.wordInputs[this.currentWordIndex] || '';
        let targetEl;
        
        if (currentInput.length === 0) {
            targetEl = chars[0];
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const containerRect = this.wordsContainer.getBoundingClientRect();
                this.caret.style.left = (rect.left - containerRect.left) + 'px';
                this.caret.style.top = (rect.top - containerRect.top + this.wordsContainer.scrollTop) + 'px';
            }
        } else if (currentInput.length >= chars.length) {
            targetEl = chars[chars.length - 1];
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const containerRect = this.wordsContainer.getBoundingClientRect();
                this.caret.style.left = (rect.right - containerRect.left) + 'px';
                this.caret.style.top = (rect.top - containerRect.top + this.wordsContainer.scrollTop) + 'px';
            }
        } else {
            targetEl = chars[currentInput.length];
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const containerRect = this.wordsContainer.getBoundingClientRect();
                this.caret.style.left = (rect.left - containerRect.left) + 'px';
                this.caret.style.top = (rect.top - containerRect.top + this.wordsContainer.scrollTop) + 'px';
            }
        }
    }

    start() {
        if (this.input) {
            this.input.focus();
        }
    }
    
    startTimer() {
        if (this.running) return;
        
        this.running = true;
        this.startTime = Date.now();
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.elapsedTime = elapsed;
            
            const timeEl = document.getElementById('typing-time');
            
            if (this.gameMode === 'time') {
                this.timeLeft = Math.max(0, this.timeLimit - elapsed);
                if (timeEl) timeEl.textContent = this.timeLeft;
                
                if (this.timeLeft <= 0) {
                    this.endGame();
                }
            } else {
                // Words mode - count up
                if (timeEl) timeEl.textContent = elapsed;
            }
            
            // Update live WPM and accuracy
            this.updateLiveStats();
        }, 100);
    }
    
    updateLiveStats() {
        const wpmEl = document.getElementById('typing-wpm');
        const accEl = document.getElementById('typing-accuracy');
        const wordsProgress = document.getElementById('typing-words-progress');
        
        // Calculate live WPM
        const elapsedMinutes = this.elapsedTime / 60;
        const liveWpm = elapsedMinutes > 0 ? Math.round((this.correctChars / 5) / elapsedMinutes) : 0;
        
        // Calculate live accuracy
        const liveAccuracy = this.totalTyped > 0 ? Math.round((this.correctChars / this.totalTyped) * 100) : 100;
        
        if (wpmEl) wpmEl.textContent = liveWpm;
        if (accEl) accEl.textContent = liveAccuracy + '%';
        
        if (this.gameMode === 'words' && wordsProgress) {
            wordsProgress.textContent = `${this.wordsCompleted}/${this.wordLimit}`;
        }
    }

    stop() {
        this.running = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Remove event listeners
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.keyupHandler) {
            document.removeEventListener('keyup', this.keyupHandler);
        }
        
        const typingUI = document.getElementById('typing-game-ui');
        if (typingUI) typingUI.remove();
        this.canvas.style.display = 'block';
    }

    handleKeyDown(e) {
        if (e.key === 'Backspace' && this.input.value === '' && this.currentWordIndex > 0) {
            e.preventDefault();
            this.currentWordIndex--;
            this.input.value = this.wordInputs[this.currentWordIndex];
            this.renderWords();
            this.updateCaretPosition();
        }
    }

    handleInput() {
        if (this.gameEnded) return;
        
        if (!this.running) {
            this.startTimer();
        }
        
        const typed = this.input.value;
        
        if (typed.endsWith(' ')) {
            const wordTyped = typed.slice(0, -1);
            this.wordInputs[this.currentWordIndex] = wordTyped;
            
            const currentWord = this.testWords[this.currentWordIndex];
            
            // Count correct, incorrect, and extra characters
            for (let i = 0; i < Math.max(wordTyped.length, currentWord.length); i++) {
                this.totalTyped++;
                if (i < currentWord.length && i < wordTyped.length) {
                    if (wordTyped[i] === currentWord[i]) {
                        this.correctChars++;
                    } else {
                        this.incorrectChars++;
                    }
                } else if (i >= currentWord.length) {
                    // Extra characters - only count as extra, not as incorrect
                    this.extraChars++;
                } else {
                    // Missing characters
                    this.incorrectChars++;
                }
            }
            
            this.wordsCompleted++;
            this.currentWordIndex++;
            this.input.value = '';
            
            // Check if words mode is complete
            if (this.gameMode === 'words' && this.wordsCompleted >= this.wordLimit) {
                this.endGame();
                return;
            }
            
            // Generate more words if needed
            if (this.currentWordIndex >= this.testWords.length) {
                if (this.gameMode === 'time') {
                    // In time mode, regenerate words using helper method
                    const additionalWords = [];
                    for (let i = 0; i < 50; i++) {
                        additionalWords.push(this.generateSingleWord());
                    }
                    this.testWords = this.testWords.concat(additionalWords);
                    this.wordInputs = this.wordInputs.concat(additionalWords.map(() => ''));
                }
            }
            
            this.renderWords();
        } else {
            this.wordInputs[this.currentWordIndex] = typed;
            this.renderWords();
        }
        
        this.updateCaretPosition();
        this.updateLiveStats();
    }

    endGame() {
        this.running = false;
        this.gameEnded = true;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Calculate final stats
        let elapsedMinutes;
        if (this.gameMode === 'time') {
            elapsedMinutes = this.timeLimit / 60;
        } else {
            elapsedMinutes = this.elapsedTime / 60;
        }
        
        const wpm = elapsedMinutes > 0 ? Math.round((this.correctChars / 5) / elapsedMinutes) : 0;
        const accuracy = this.totalTyped > 0 ? Math.round((this.correctChars / this.totalTyped) * 100) : 100;
        
        this.input.disabled = true;
        this.wordsContainer.style.display = 'none';
        this.statsDiv.classList.add('hidden');
        this.optionsBar.classList.add('hidden');
        this.bottomBar.classList.add('hidden');
        this.resultsDiv.classList.remove('hidden');
        this.caret.style.display = 'none';
        
        // Update result display
        document.getElementById('result-wpm').textContent = wpm;
        document.getElementById('result-accuracy').textContent = accuracy + '%';
        document.getElementById('result-correct').textContent = this.correctChars;
        document.getElementById('result-incorrect').textContent = this.incorrectChars;
        document.getElementById('result-extra').textContent = this.extraChars;
        
        if (this.gameMode === 'time') {
            document.getElementById('result-time').textContent = this.timeLimit + 's';
        } else {
            document.getElementById('result-time').textContent = this.elapsedTime + 's';
        }
        
        this.onScore(wpm);
    }
}

class MemoryGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.onScore = onScore;
        this.manager = manager;
        this.container = canvas.parentElement;
        
        // Bicycle-themed icons
        this.allIcons = ['bike', 'circle', 'hard-hat', 'map', 'route', 'compass', 'mountain', 'flag', 'trophy', 'medal', 'timer', 'gauge'];
        
        // Difficulty settings
        this.difficulties = {
            easy: { cols: 3, rows: 4, pairs: 6, name: 'Fácil' },
            medium: { cols: 4, rows: 4, pairs: 8, name: 'Médio' },
            hard: { cols: 4, rows: 6, pairs: 12, name: 'Difícil' }
        };
        
        this.difficulty = 'medium';
        this.running = false;
        this.comboCount = 0;
        this.lastMatchTime = 0;
        
        this.createUI();
    }

    createUI() {
        this.canvas.style.display = 'none';
        
        let memoryUI = document.getElementById('memory-game-ui');
        if (memoryUI) memoryUI.remove();
        
        memoryUI = document.createElement('div');
        memoryUI.id = 'memory-game-ui';
        memoryUI.className = 'w-full max-w-lg mx-auto';
        memoryUI.innerHTML = `
            <div id="memory-difficulty-selector" class="flex gap-2 mb-4 justify-center">
                <button data-diff="easy" class="diff-btn px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">Fácil (3x4)</button>
                <button data-diff="medium" class="diff-btn px-4 py-2 rounded-lg bg-blue-500 text-white">Médio (4x4)</button>
                <button data-diff="hard" class="diff-btn px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">Difícil (4x6)</button>
            </div>
            
            <div class="flex justify-between items-center mb-4">
                <div class="text-center">
                    <p class="text-sm text-slate-500 dark:text-slate-400">Movimentos</p>
                    <p id="memory-moves" class="text-2xl font-bold text-slate-800 dark:text-slate-200">0</p>
                </div>
                <div class="text-center">
                    <p class="text-sm text-slate-500 dark:text-slate-400">Pares</p>
                    <p id="memory-pairs" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0/8</p>
                </div>
                <div class="text-center">
                    <p class="text-sm text-slate-500 dark:text-slate-400">Combo</p>
                    <p id="memory-combo" class="text-2xl font-bold text-purple-600 dark:text-purple-400">x1</p>
                </div>
                <div class="text-center">
                    <p class="text-sm text-slate-500 dark:text-slate-400">Tempo</p>
                    <p id="memory-time" class="text-2xl font-bold text-green-600 dark:text-green-400">0:00</p>
                </div>
            </div>
            
            <div id="memory-grid" class="grid gap-3 mb-4"></div>
            
            <button id="memory-reset" class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg">
                <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                Novo Jogo
            </button>
        `;
        
        this.container.appendChild(memoryUI);
        
        // Setup difficulty buttons
        memoryUI.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = btn.dataset.diff;
                this.updateDifficultyButtons();
                this.reset();
            });
        });
        
        document.getElementById('memory-reset').addEventListener('click', () => this.reset());
        
        lucide.createIcons();
        this.reset();
    }

    updateDifficultyButtons() {
        const btns = document.querySelectorAll('#memory-difficulty-selector .diff-btn');
        btns.forEach(btn => {
            if (btn.dataset.diff === this.difficulty) {
                btn.className = 'diff-btn px-4 py-2 rounded-lg bg-blue-500 text-white';
            } else {
                const colors = {
                    easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200',
                    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200',
                    hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200'
                };
                btn.className = `diff-btn px-4 py-2 rounded-lg ${colors[btn.dataset.diff]} transition-colors`;
            }
        });
    }

    reset() {
        const settings = this.difficulties[this.difficulty];
        this.icons = this.allIcons.slice(0, settings.pairs);
        this.cols = settings.cols;
        this.rows = settings.rows;
        
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.score = 0;
        this.comboCount = 0;
        this.startTime = null;
        this.running = false;
        
        // Update grid layout
        const grid = document.getElementById('memory-grid');
        if (grid) {
            grid.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        }
        
        const shuffled = [...this.icons, ...this.icons].sort(() => Math.random() - 0.5);
        this.cards = shuffled.map((icon, index) => ({
            id: index,
            icon,
            flipped: false,
            matched: false,
            animating: false
        }));
        
        this.renderGrid();
        this.updateStats();
        
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    renderGrid() {
        const grid = document.getElementById('memory-grid');
        grid.innerHTML = this.cards.map(card => `
            <div class="memory-card aspect-square rounded-xl cursor-pointer transition-all duration-300 transform ${card.animating ? 'scale-110' : 'hover:scale-105'} ${card.matched ? 'opacity-80' : ''}" data-id="${card.id}">
                <div class="w-full h-full ${card.flipped || card.matched ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'} rounded-xl flex items-center justify-center shadow-lg border-2 ${card.matched ? 'border-green-400' : 'border-transparent'}">
                    ${card.flipped || card.matched ? `<i data-lucide="${card.icon}" class="w-8 h-8 text-white"></i>` : '<i data-lucide="help-circle" class="w-8 h-8 text-slate-400"></i>'}
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
        
        grid.querySelectorAll('.memory-card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                const id = parseInt(cardEl.dataset.id);
                this.flipCard(id);
            });
        });
    }

    flipCard(id) {
        const card = this.cards[id];
        
        if (card.flipped || card.matched || this.flippedCards.length >= 2) return;
        
        if (!this.running) {
            this.running = true;
            this.startTime = Date.now();
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        }
        
        card.flipped = true;
        this.flippedCards.push(card);
        this.renderGrid();
        
        if (this.flippedCards.length === 2) {
            this.moves++;
            
            const [first, second] = this.flippedCards;
            
            if (first.icon === second.icon) {
                first.matched = true;
                second.matched = true;
                first.animating = true;
                second.animating = true;
                this.matchedPairs++;
                
                // Combo system
                const now = Date.now();
                if (now - this.lastMatchTime < 3000) {
                    this.comboCount = Math.min(this.comboCount + 1, 5);
                } else {
                    this.comboCount = 1;
                }
                this.lastMatchTime = now;
                
                // Score with combo bonus
                const baseScore = this.difficulty === 'hard' ? 150 : this.difficulty === 'medium' ? 100 : 50;
                this.score += baseScore * this.comboCount;
                
                this.flippedCards = [];
                this.updateStats();
                this.renderGrid();
                
                // Reset animation
                setTimeout(() => {
                    first.animating = false;
                    second.animating = false;
                    this.renderGrid();
                }, 300);
                
                if (this.matchedPairs === this.icons.length) {
                    this.endGame();
                }
            } else {
                // Reset combo on miss
                this.comboCount = 0;
                this.updateStats();
                
                setTimeout(() => {
                    first.flipped = false;
                    second.flipped = false;
                    this.flippedCards = [];
                    this.renderGrid();
                }, 1000);
            }
        }
    }

    updateStats() {
        const movesEl = document.getElementById('memory-moves');
        const pairsEl = document.getElementById('memory-pairs');
        const comboEl = document.getElementById('memory-combo');
        
        if (movesEl) movesEl.textContent = this.moves;
        if (pairsEl) pairsEl.textContent = `${this.matchedPairs}/${this.icons.length}`;
        if (comboEl) {
            comboEl.textContent = `x${Math.max(1, this.comboCount)}`;
            if (this.comboCount >= 3) {
                comboEl.classList.add('text-yellow-500', 'animate-pulse');
            } else {
                comboEl.classList.remove('text-yellow-500', 'animate-pulse');
            }
        }
    }

    updateTimer() {
        if (!this.startTime) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeEl = document.getElementById('memory-time');
        if (timeEl) timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    start() {
        // Game starts on first card flip
    }

    stop() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        const memoryUI = document.getElementById('memory-game-ui');
        if (memoryUI) memoryUI.remove();
        this.canvas.style.display = 'block';
    }

    endGame() {
        clearInterval(this.timerInterval);
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Time bonus
        const timeBonus = Math.max(0, 300 - elapsed) * 2;
        
        // Efficiency bonus (fewer moves = better)
        const minMoves = this.icons.length;
        const efficiencyBonus = Math.max(0, (minMoves * 3 - this.moves)) * 20;
        
        const finalScore = this.score + timeBonus + efficiencyBonus;
        
        // Check for hard mode achievement
        if (this.difficulty === 'hard' && this.manager) {
            this.manager.unlockAchievement('elephant_memory');
        }
        
        setTimeout(() => {
            Modals.showAlert(`Parabéns! Você completou em ${this.moves} movimentos!\nTempo: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}\nPontuação: ${finalScore}`, 'Jogo Concluído').then(() => {
                this.onScore(finalScore);
            });
        }, 500);
    }
}

class SpaceInvadersGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 400;
        this.canvas.height = 500;
        
        this.running = false;
        this.reset();
        this.setupControls();
    }

    reset() {
        // Player ship
        this.player = {
            x: this.canvas.width / 2 - 20,
            y: this.canvas.height - 50,
            width: 40,
            height: 30,
            speed: 6,
            hasShield: false,
            shieldTimer: 0,
            hasTripleShot: false,
            tripleShotTimer: 0,
            speedBoost: false,
            speedBoostTimer: 0
        };
        
        // Bullets
        this.bullets = [];
        this.enemyBullets = [];
        this.lastShot = 0;
        this.shootCooldown = 200;
        
        // Enemies
        this.enemies = [];
        this.wave = 1;
        this.maxWave = 5;
        this.enemyDirection = 1;
        this.enemyDropAmount = 20;
        this.enemyMoveTimer = 0;
        this.enemyMoveInterval = 800;
        
        // Power-ups
        this.powerUps = [];
        
        // Special enemy
        this.specialEnemy = null;
        this.specialEnemyTimer = 0;
        
        // Boss
        this.boss = null;
        this.bossActive = false;
        
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.won = false;
        
        this.keys = { left: false, right: false, shoot: false };
        
        this.spawnWave();
        this.updateScoreDisplay();
    }

    spawnWave() {
        this.enemies = [];
        const rows = 3 + Math.min(this.wave - 1, 2);
        const cols = 6 + Math.min(this.wave - 1, 2);
        const enemyWidth = 30;
        const enemyHeight = 24;
        const padding = 8;
        const offsetLeft = (this.canvas.width - (cols * (enemyWidth + padding))) / 2;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const health = row === 0 ? 1 : (row === 1 ? 1 : 2);
                this.enemies.push({
                    x: offsetLeft + col * (enemyWidth + padding),
                    y: 40 + row * (enemyHeight + padding),
                    width: enemyWidth,
                    height: enemyHeight,
                    health: health,
                    maxHealth: health,
                    points: (rows - row) * 10 * this.wave,
                    type: row % 3 // Different enemy types
                });
            }
        }
        
        // Speed up enemy movement on higher waves
        this.enemyMoveInterval = Math.max(300, 800 - (this.wave - 1) * 100);
    }

    spawnBoss() {
        this.bossActive = true;
        this.boss = {
            x: this.canvas.width / 2 - 50,
            y: 40,
            width: 100,
            height: 60,
            health: 20 + (this.wave - 1) * 10,
            maxHealth: 20 + (this.wave - 1) * 10,
            direction: 1,
            speed: 2,
            lastShot: 0,
            shootCooldown: 1500 - (this.wave - 1) * 200,
            points: 500 * this.wave
        };
    }

    spawnPowerUp(x, y) {
        if (Math.random() < 0.15) {
            const types = ['triple', 'shield', 'speed', 'life'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerUps.push({
                x,
                y,
                type,
                width: 20,
                height: 20,
                speed: 2
            });
        }
    }

    spawnSpecialEnemy() {
        if (!this.specialEnemy && Math.random() < 0.01) {
            this.specialEnemy = {
                x: -40,
                y: 20,
                width: 40,
                height: 20,
                speed: 3,
                points: 100 * this.wave
            };
        }
    }

    setupControls() {
        this.keyDownHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameOver || this.won) {
                    this.reset();
                    this.start();
                } else {
                    this.keys.shoot = true;
                }
            }
        };
        
        this.keyUpHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
            if (e.key === ' ') this.keys.shoot = false;
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = Date.now();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
    }

    gameLoop() {
        if (!this.running) return;

        const now = Date.now();
        const delta = now - this.lastUpdate;
        
        if (!this.gameOver && !this.won) {
            this.update(delta);
        }
        
        this.draw();
        this.lastUpdate = now;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shootCooldown) return;
        
        this.lastShot = now;
        
        if (this.player.hasTripleShot) {
            // Triple shot
            this.bullets.push({ x: this.player.x + this.player.width / 2 - 2, y: this.player.y, dx: 0, dy: -8 });
            this.bullets.push({ x: this.player.x + this.player.width / 2 - 2, y: this.player.y, dx: -2, dy: -8 });
            this.bullets.push({ x: this.player.x + this.player.width / 2 - 2, y: this.player.y, dx: 2, dy: -8 });
        } else {
            this.bullets.push({ x: this.player.x + this.player.width / 2 - 2, y: this.player.y, dx: 0, dy: -8 });
        }
    }

    update(delta) {
        // Update power-up timers
        if (this.player.hasShield) {
            this.player.shieldTimer -= delta;
            if (this.player.shieldTimer <= 0) this.player.hasShield = false;
        }
        if (this.player.hasTripleShot) {
            this.player.tripleShotTimer -= delta;
            if (this.player.tripleShotTimer <= 0) this.player.hasTripleShot = false;
        }
        if (this.player.speedBoost) {
            this.player.speedBoostTimer -= delta;
            if (this.player.speedBoostTimer <= 0) this.player.speedBoost = false;
        }
        
        // Player movement
        const speed = this.player.speedBoost ? this.player.speed * 1.5 : this.player.speed;
        if (this.keys.left && this.player.x > 0) {
            this.player.x -= speed;
        }
        if (this.keys.right && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += speed;
        }
        
        // Shooting
        if (this.keys.shoot) {
            this.shoot();
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            return bullet.y > -10;
        });
        
        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.y += bullet.dy;
            return bullet.y < this.canvas.height + 10;
        });
        
        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.y += powerUp.speed;
            
            // Check collision with player
            if (this.checkCollision(powerUp, this.player)) {
                switch (powerUp.type) {
                    case 'triple':
                        this.player.hasTripleShot = true;
                        this.player.tripleShotTimer = 8000;
                        break;
                    case 'shield':
                        this.player.hasShield = true;
                        this.player.shieldTimer = 5000;
                        break;
                    case 'speed':
                        this.player.speedBoost = true;
                        this.player.speedBoostTimer = 6000;
                        break;
                    case 'life':
                        this.lives = Math.min(this.lives + 1, 5);
                        this.updateScoreDisplay();
                        break;
                }
                return false;
            }
            
            return powerUp.y < this.canvas.height;
        });
        
        // Update special enemy
        if (this.specialEnemy) {
            this.specialEnemy.x += this.specialEnemy.speed;
            if (this.specialEnemy.x > this.canvas.width) {
                this.specialEnemy = null;
            }
        }
        this.spawnSpecialEnemy();
        
        // Boss logic
        if (this.bossActive && this.boss) {
            // Boss movement
            this.boss.x += this.boss.speed * this.boss.direction;
            if (this.boss.x <= 0 || this.boss.x + this.boss.width >= this.canvas.width) {
                this.boss.direction *= -1;
            }
            
            // Boss shooting
            const now = Date.now();
            if (now - this.boss.lastShot > this.boss.shootCooldown) {
                this.boss.lastShot = now;
                // Boss shoots multiple bullets
                this.enemyBullets.push({ x: this.boss.x + 20, y: this.boss.y + this.boss.height, dy: 4 });
                this.enemyBullets.push({ x: this.boss.x + this.boss.width / 2, y: this.boss.y + this.boss.height, dy: 4 });
                this.enemyBullets.push({ x: this.boss.x + this.boss.width - 20, y: this.boss.y + this.boss.height, dy: 4 });
            }
            
            // Check bullet collision with boss
            this.bullets = this.bullets.filter(bullet => {
                const bulletRect = { x: bullet.x, y: bullet.y, width: 4, height: 10 };
                if (this.checkCollision(bulletRect, this.boss)) {
                    this.boss.health--;
                    if (this.boss.health <= 0) {
                        this.score += this.boss.points;
                        this.bossActive = false;
                        this.boss = null;
                        
                        // Win condition - defeated boss on wave 5
                        if (this.wave >= this.maxWave) {
                            this.won = true;
                            this.onScore(this.score);
                            if (this.manager) {
                                this.manager.unlockAchievement('galaxy_defender');
                            }
                        } else {
                            this.wave++;
                            this.spawnWave();
                        }
                        this.updateScoreDisplay();
                    }
                    return false;
                }
                return true;
            });
        } else {
            // Regular enemy logic
            this.enemyMoveTimer += delta;
            
            if (this.enemyMoveTimer >= this.enemyMoveInterval) {
                this.enemyMoveTimer = 0;
                
                // Check if enemies need to move down
                let needsToMoveDown = false;
                this.enemies.forEach(enemy => {
                    if ((this.enemyDirection > 0 && enemy.x + enemy.width >= this.canvas.width - 10) ||
                        (this.enemyDirection < 0 && enemy.x <= 10)) {
                        needsToMoveDown = true;
                    }
                });
                
                if (needsToMoveDown) {
                    this.enemies.forEach(enemy => {
                        enemy.y += this.enemyDropAmount;
                    });
                    this.enemyDirection *= -1;
                } else {
                    this.enemies.forEach(enemy => {
                        enemy.x += 15 * this.enemyDirection;
                    });
                }
                
                // Enemy shooting
                if (this.enemies.length > 0 && Math.random() < 0.3 + (this.wave * 0.1)) {
                    const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
                    this.enemyBullets.push({
                        x: shooter.x + shooter.width / 2,
                        y: shooter.y + shooter.height,
                        dy: 3 + this.wave * 0.5
                    });
                }
            }
        }
        
        // Check bullet collision with enemies
        this.bullets = this.bullets.filter(bullet => {
            const bulletRect = { x: bullet.x, y: bullet.y, width: 4, height: 10 };
            
            // Check special enemy
            if (this.specialEnemy && this.checkCollision(bulletRect, this.specialEnemy)) {
                this.score += this.specialEnemy.points;
                this.spawnPowerUp(this.specialEnemy.x, this.specialEnemy.y);
                this.specialEnemy = null;
                this.updateScoreDisplay();
                return false;
            }
            
            // Check regular enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                if (this.checkCollision(bulletRect, this.enemies[i])) {
                    this.enemies[i].health--;
                    if (this.enemies[i].health <= 0) {
                        this.score += this.enemies[i].points;
                        this.spawnPowerUp(this.enemies[i].x, this.enemies[i].y);
                        this.enemies.splice(i, 1);
                        this.updateScoreDisplay();
                        
                        // Check if wave complete
                        if (this.enemies.length === 0 && !this.bossActive) {
                            if (this.wave % 5 === 0) {
                                this.spawnBoss();
                            } else if (this.wave < this.maxWave) {
                                this.wave++;
                                this.spawnWave();
                            } else {
                                this.spawnBoss();
                            }
                            this.updateScoreDisplay();
                        }
                    }
                    return false;
                }
            }
            return true;
        });
        
        // Check enemy bullet collision with player
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            const bulletRect = { x: bullet.x - 3, y: bullet.y, width: 6, height: 10 };
            if (this.checkCollision(bulletRect, this.player)) {
                if (!this.player.hasShield) {
                    this.lives--;
                    this.updateScoreDisplay();
                    if (this.lives <= 0) {
                        this.endGame();
                    }
                }
                return false;
            }
            return true;
        });
        
        // Check if enemies reached player
        this.enemies.forEach(enemy => {
            if (enemy.y + enemy.height >= this.player.y) {
                this.endGame();
            }
        });
    }

    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Background with stars
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGradient.addColorStop(0, '#0f172a');
        bgGradient.addColorStop(1, '#1e293b');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvas.width;
            const y = (i * 53 + Date.now() / 50) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => {
            const colors = {
                triple: '#eab308',
                shield: '#06b6d4',
                speed: '#22c55e',
                life: '#ef4444'
            };
            const icons = {
                triple: '⚡',
                shield: '🛡',
                speed: '💨',
                life: '❤'
            };
            
            this.ctx.fillStyle = colors[powerUp.type];
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x + 10, powerUp.y + 10, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(icons[powerUp.type], powerUp.x + 10, powerUp.y + 14);
        });
        
        // Draw enemies with blue/purple gradient
        this.enemies.forEach(enemy => {
            const gradient = this.ctx.createLinearGradient(enemy.x, enemy.y, enemy.x + enemy.width, enemy.y + enemy.height);
            const healthRatio = enemy.health / enemy.maxHealth;
            
            if (enemy.type === 0) {
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(1, '#8b5cf6');
            } else if (enemy.type === 1) {
                gradient.addColorStop(0, '#6366f1');
                gradient.addColorStop(1, '#a855f7');
            } else {
                gradient.addColorStop(0, '#8b5cf6');
                gradient.addColorStop(1, '#ec4899');
            }
            
            this.ctx.fillStyle = gradient;
            
            // Enemy body
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
            this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.6);
            this.ctx.lineTo(enemy.x + enemy.width * 0.8, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x + enemy.width * 0.2, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.6);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Health indicator for multi-hit enemies
            if (enemy.maxHealth > 1 && enemy.health < enemy.maxHealth) {
                this.ctx.fillStyle = 'rgba(255,0,0,0.5)';
                this.ctx.fillRect(enemy.x, enemy.y - 5, enemy.width * (1 - healthRatio), 3);
            }
        });
        
        // Draw special enemy
        if (this.specialEnemy) {
            this.ctx.fillStyle = '#facc15';
            this.ctx.beginPath();
            this.ctx.ellipse(
                this.specialEnemy.x + this.specialEnemy.width / 2,
                this.specialEnemy.y + this.specialEnemy.height / 2,
                this.specialEnemy.width / 2,
                this.specialEnemy.height / 2,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Draw boss
        if (this.bossActive && this.boss) {
            // Boss body
            const bossGradient = this.ctx.createLinearGradient(this.boss.x, this.boss.y, this.boss.x + this.boss.width, this.boss.y + this.boss.height);
            bossGradient.addColorStop(0, '#dc2626');
            bossGradient.addColorStop(0.5, '#7c3aed');
            bossGradient.addColorStop(1, '#dc2626');
            this.ctx.fillStyle = bossGradient;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.boss.x + this.boss.width / 2, this.boss.y);
            this.ctx.lineTo(this.boss.x + this.boss.width, this.boss.y + this.boss.height * 0.4);
            this.ctx.lineTo(this.boss.x + this.boss.width * 0.9, this.boss.y + this.boss.height);
            this.ctx.lineTo(this.boss.x + this.boss.width * 0.1, this.boss.y + this.boss.height);
            this.ctx.lineTo(this.boss.x, this.boss.y + this.boss.height * 0.4);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Boss health bar
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(this.boss.x, this.boss.y - 12, this.boss.width, 8);
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(this.boss.x, this.boss.y - 12, this.boss.width * (this.boss.health / this.boss.maxHealth), 8);
        }
        
        // Draw player ship
        const playerGradient = this.ctx.createLinearGradient(this.player.x, this.player.y, this.player.x + this.player.width, this.player.y + this.player.height);
        playerGradient.addColorStop(0, '#22c55e');
        playerGradient.addColorStop(1, '#10b981');
        this.ctx.fillStyle = playerGradient;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
        this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
        this.ctx.lineTo(this.player.x + this.player.width / 2, this.player.y + this.player.height * 0.7);
        this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw shield if active
        if (this.player.hasShield) {
            this.ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                25,
                0, Math.PI * 2
            );
            this.ctx.stroke();
        }
        
        // Draw bullets
        this.ctx.fillStyle = '#facc15';
        this.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, 4, 10);
        });
        
        // Draw enemy bullets
        this.ctx.fillStyle = '#ef4444';
        this.enemyBullets.forEach(bullet => {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw lives
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = '#22c55e';
            this.ctx.beginPath();
            this.ctx.moveTo(20 + i * 25, this.canvas.height - 8);
            this.ctx.lineTo(28 + i * 25, this.canvas.height - 20);
            this.ctx.lineTo(36 + i * 25, this.canvas.height - 8);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Draw wave indicator
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Onda ${this.wave}/${this.maxWave}`, this.canvas.width - 10, this.canvas.height - 10);
        
        // Game over / Won screen
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'VITÓRIA!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            this.ctx.fillText(`Onda: ${this.wave}/${this.maxWave}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 80);
        }
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const waveEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (waveEl) waveEl.textContent = `Onda ${this.wave}/${this.maxWave} | Vidas: ${this.lives}`;
    }

    endGame() {
        this.gameOver = true;
        this.onScore(this.score);
    }
}

class BreakoutGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 400;
        this.canvas.height = 500;
        
        this.phase = 1;
        this.maxPhase = 5;
        
        this.running = false;
        this.reset();
        this.setupControls();
    }

    reset() {
        this.paddle = {
            width: 80,
            height: 12,
            x: this.canvas.width / 2 - 40,
            speed: 8,
            originalWidth: 80
        };
        
        this.balls = [{
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: 8,
            dx: 4,
            dy: -4,
            originalRadius: 8
        }];
        
        this.powerUps = [];
        this.activePowerUps = {
            bigPaddle: 0,
            bigBall: 0,
            multiball: false
        };
        
        this.score = this.score || 0;
        this.lives = 3;
        this.gameOver = false;
        this.won = false;
        
        this.keys = { left: false, right: false };
        
        this.generateBricks();
        this.updateScoreDisplay();
    }

    generateBricks() {
        this.bricks = [];
        
        // Different layouts for each phase
        const layouts = this.getPhaseLayout(this.phase);
        const brickWidth = 45;
        const brickHeight = 18;
        const brickPadding = 4;
        const offsetTop = 50;
        const offsetLeft = (this.canvas.width - (8 * (brickWidth + brickPadding))) / 2;
        
        layouts.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell > 0) {
                    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
                    this.bricks.push({
                        x: offsetLeft + colIndex * (brickWidth + brickPadding),
                        y: offsetTop + rowIndex * (brickHeight + brickPadding),
                        width: brickWidth,
                        height: brickHeight,
                        color: colors[rowIndex % colors.length],
                        points: cell * 10 * this.phase,
                        hits: cell, // Number of hits needed
                        maxHits: cell,
                        visible: true
                    });
                }
            });
        });
    }

    getPhaseLayout(phase) {
        // 0 = no brick, 1 = 1 hit, 2 = 2 hits, 3 = 3 hits
        const layouts = {
            1: [
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1]
            ],
            2: [
                [1,1,1,2,2,1,1,1],
                [1,1,2,1,1,2,1,1],
                [1,2,1,1,1,1,2,1],
                [1,1,2,1,1,2,1,1],
                [1,1,1,2,2,1,1,1]
            ],
            3: [
                [2,1,2,1,1,2,1,2],
                [1,2,1,2,2,1,2,1],
                [0,1,2,3,3,2,1,0],
                [1,2,1,2,2,1,2,1],
                [2,1,2,1,1,2,1,2]
            ],
            4: [
                [1,0,2,0,0,2,0,1],
                [0,2,0,3,3,0,2,0],
                [2,0,3,0,0,3,0,2],
                [0,2,0,3,3,0,2,0],
                [1,0,2,0,0,2,0,1],
                [2,2,2,2,2,2,2,2]
            ],
            5: [
                [3,2,1,2,2,1,2,3],
                [2,3,2,1,1,2,3,2],
                [1,2,3,2,2,3,2,1],
                [2,1,2,3,3,2,1,2],
                [3,2,1,2,2,1,2,3],
                [1,1,1,1,1,1,1,1]
            ]
        };
        return layouts[phase] || layouts[1];
    }

    spawnPowerUp(x, y) {
        if (Math.random() < 0.2) {
            const types = ['paddle', 'ball', 'multi', 'life'];
            const type = types[Math.floor(Math.random() * types.length)];
            const colors = {
                paddle: '#3b82f6',
                ball: '#22c55e',
                multi: '#a855f7',
                life: '#ef4444'
            };
            const icons = {
                paddle: '↔',
                ball: '●',
                multi: '⁂',
                life: '❤'
            };
            this.powerUps.push({
                x: x,
                y: y,
                type,
                color: colors[type],
                icon: icons[type],
                width: 24,
                height: 24,
                speed: 2
            });
        }
    }

    setupControls() {
        this.keyDownHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === ' ' && (this.gameOver || this.won)) {
                e.preventDefault();
                this.phase = 1;
                this.score = 0;
                this.reset();
                this.start();
            }
        };
        
        this.keyUpHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = Date.now();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
    }

    gameLoop() {
        if (!this.running) return;

        const now = Date.now();
        const delta = now - this.lastUpdate;
        
        if (!this.gameOver && !this.won) {
            this.update(delta);
        }
        this.draw();
        
        this.lastUpdate = now;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(delta) {
        // Update power-up timers
        if (this.activePowerUps.bigPaddle > 0) {
            this.activePowerUps.bigPaddle -= delta;
            if (this.activePowerUps.bigPaddle <= 0) {
                this.paddle.width = this.paddle.originalWidth;
            }
        }
        if (this.activePowerUps.bigBall > 0) {
            this.activePowerUps.bigBall -= delta;
            if (this.activePowerUps.bigBall <= 0) {
                this.balls.forEach(ball => ball.radius = ball.originalRadius);
            }
        }
        
        // Paddle movement
        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys.right && this.paddle.x < this.canvas.width - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
        
        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.y += powerUp.speed;
            
            // Check collision with paddle
            if (powerUp.y + powerUp.height >= this.canvas.height - this.paddle.height - 10 &&
                powerUp.x + powerUp.width > this.paddle.x &&
                powerUp.x < this.paddle.x + this.paddle.width) {
                
                switch (powerUp.type) {
                    case 'paddle':
                        this.paddle.width = 120;
                        this.activePowerUps.bigPaddle = 10000;
                        break;
                    case 'ball':
                        this.balls.forEach(ball => ball.radius = 12);
                        this.activePowerUps.bigBall = 8000;
                        break;
                    case 'multi':
                        if (this.balls.length < 5) {
                            const mainBall = this.balls[0];
                            this.balls.push({
                                x: mainBall.x,
                                y: mainBall.y,
                                radius: mainBall.radius,
                                dx: mainBall.dx + 2,
                                dy: mainBall.dy,
                                originalRadius: 8
                            });
                            this.balls.push({
                                x: mainBall.x,
                                y: mainBall.y,
                                radius: mainBall.radius,
                                dx: mainBall.dx - 2,
                                dy: mainBall.dy,
                                originalRadius: 8
                            });
                        }
                        break;
                    case 'life':
                        this.lives = Math.min(this.lives + 1, 5);
                        this.updateScoreDisplay();
                        break;
                }
                return false;
            }
            
            return powerUp.y < this.canvas.height;
        });

        // Update balls
        this.balls = this.balls.filter((ball, index) => {
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Wall collision
            if (ball.x - ball.radius < 0 || ball.x + ball.radius > this.canvas.width) {
                ball.dx *= -1;
                ball.x = Math.max(ball.radius, Math.min(this.canvas.width - ball.radius, ball.x));
            }
            if (ball.y - ball.radius < 0) {
                ball.dy *= -1;
            }

            // Paddle collision
            if (
                ball.y + ball.radius > this.canvas.height - this.paddle.height - 10 &&
                ball.y - ball.radius < this.canvas.height - 10 &&
                ball.x > this.paddle.x &&
                ball.x < this.paddle.x + this.paddle.width
            ) {
                ball.dy = -Math.abs(ball.dy);
                const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
                ball.dx = (hitPos - 0.5) * 10;
            }

            // Lost ball
            if (ball.y + ball.radius > this.canvas.height) {
                if (this.balls.length > 1) {
                    return false; // Remove this ball
                } else {
                    this.lives--;
                    this.updateScoreDisplay();
                    
                    if (this.lives <= 0) {
                        this.endGame();
                    } else {
                        ball.x = this.canvas.width / 2;
                        ball.y = this.canvas.height - 50;
                        ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
                        ball.dy = -4;
                    }
                }
            }

            // Brick collision
            this.bricks.forEach(brick => {
                if (brick.visible) {
                    if (
                        ball.x > brick.x - ball.radius &&
                        ball.x < brick.x + brick.width + ball.radius &&
                        ball.y - ball.radius < brick.y + brick.height &&
                        ball.y + ball.radius > brick.y
                    ) {
                        brick.hits--;
                        if (brick.hits <= 0) {
                            brick.visible = false;
                            this.spawnPowerUp(brick.x + brick.width / 2, brick.y);
                        }
                        ball.dy *= -1;
                        this.score += brick.points;
                        this.updateScoreDisplay();
                    }
                }
            });

            return true;
        });

        // Ensure at least one ball exists
        if (this.balls.length === 0) {
            this.balls.push({
                x: this.canvas.width / 2,
                y: this.canvas.height - 50,
                radius: 8,
                dx: 4,
                dy: -4,
                originalRadius: 8
            });
        }

        // Check phase complete
        if (this.bricks.every(b => !b.visible)) {
            if (this.phase < this.maxPhase) {
                this.phase++;
                this.generateBricks();
                this.balls = [{
                    x: this.canvas.width / 2,
                    y: this.canvas.height - 50,
                    radius: 8,
                    dx: 4 + this.phase * 0.5,
                    dy: -4 - this.phase * 0.5,
                    originalRadius: 8
                }];
                this.updateScoreDisplay();
            } else {
                this.won = true;
                this.onScore(this.score);
                if (this.manager) {
                    this.manager.unlockAchievement('destroyer');
                }
            }
        }
    }

    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Background gradient
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGradient.addColorStop(0, '#0f172a');
        bgGradient.addColorStop(1, '#1e293b');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bricks
        this.bricks.forEach(brick => {
            if (brick.visible) {
                // Brick color based on hits remaining
                const alpha = brick.hits / brick.maxHits;
                const gradient = this.ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
                gradient.addColorStop(0, brick.color);
                gradient.addColorStop(1, this.adjustColorBrightness(brick.color, -30));
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 3);
                this.ctx.fill();
                
                // Highlight
                this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                this.ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 4);
                
                // Show hits remaining for multi-hit bricks
                if (brick.maxHits > 1) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 10px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(brick.hits.toString(), brick.x + brick.width / 2, brick.y + brick.height / 2 + 3);
                }
            }
        });

        // Draw power-ups
        this.powerUps.forEach(powerUp => {
            this.ctx.fillStyle = powerUp.color;
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x + 12, powerUp.y + 12, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(powerUp.icon, powerUp.x + 12, powerUp.y + 16);
        });

        // Draw paddle with gradient
        const paddleGradient = this.ctx.createLinearGradient(
            this.paddle.x, this.canvas.height - 20,
            this.paddle.x + this.paddle.width, this.canvas.height - 8
        );
        paddleGradient.addColorStop(0, '#3b82f6');
        paddleGradient.addColorStop(1, '#a855f7');
        this.ctx.fillStyle = paddleGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.paddle.x,
            this.canvas.height - this.paddle.height - 10,
            this.paddle.width,
            this.paddle.height,
            6
        );
        this.ctx.fill();

        // Draw balls
        this.balls.forEach(ball => {
            const ballGradient = this.ctx.createRadialGradient(
                ball.x - 2, ball.y - 2, 0,
                ball.x, ball.y, ball.radius
            );
            ballGradient.addColorStop(0, '#fff');
            ballGradient.addColorStop(1, '#94a3b8');
            this.ctx.fillStyle = ballGradient;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw lives
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.beginPath();
            this.ctx.arc(20 + i * 20, 20, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw phase indicator
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Fase ${this.phase}/${this.maxPhase}`, this.canvas.width - 10, 22);

        // Draw active power-up indicators
        let indicatorY = 40;
        if (this.activePowerUps.bigPaddle > 0) {
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Paddle: ${Math.ceil(this.activePowerUps.bigPaddle / 1000)}s`, this.canvas.width - 10, indicatorY);
            indicatorY += 15;
        }
        if (this.activePowerUps.bigBall > 0) {
            this.ctx.fillStyle = '#22c55e';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Ball: ${Math.ceil(this.activePowerUps.bigBall / 1000)}s`, this.canvas.width - 10, indicatorY);
        }

        // Game over / Won screen
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'VOCÊ VENCEU!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            this.ctx.fillText(`Fase: ${this.phase}/${this.maxPhase}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 80);
        }
    }

    adjustColorBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const livesEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (livesEl) livesEl.textContent = `Vidas: ${this.lives} | Fase ${this.phase}`;
    }

    endGame() {
        this.gameOver = true;
        this.onScore(this.score);
    }
}

class TermoGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 400;
        this.canvas.height = 500;
        
        // General Portuguese 5-letter words (similar to term.ooo)
        this.words = [
            'ABRIR', 'ACASO', 'ACIMA', 'ADEUS', 'AGORA',
            'AINDA', 'ACHAR', 'ALUNO', 'AMBOS', 'AMIGO',
            'ANDAR', 'ANTES', 'APOIO', 'AREIA', 'ATUAL',
            'AVIAO', 'BAIXO', 'BANCO', 'BARCO', 'BEBER',
            'BEIJO', 'BELOS', 'BOLSA', 'BORDA', 'BRACO',
            'BREVE', 'BRUXA', 'CALMA', 'CALOR', 'CAMPO',
            'CANTO', 'CARNE', 'CARRO', 'CASAL', 'CAUSA',
            'CERTO', 'CHAVE', 'CHEFE', 'CHUVA', 'CLARO',
            'CLIMA', 'COBRA', 'COMUM', 'CONTA', 'COPIA',
            'CORPO', 'COISA', 'CORTE', 'CREME', 'CUSTO',
            'DADOS', 'DANCA', 'DENTE', 'DESDE', 'DEVER',
            'DIABO', 'DISCO', 'DOIDO', 'DOLAR', 'DRAMA',
            'DUPLA', 'DURAR', 'ECRAN', 'ELITE', 'ENTAO',
            'ENTRE', 'ENVIO', 'ERRAR', 'EXATO', 'EXTRA',
            'FALAR', 'FALTA', 'FATOS', 'FAVOR', 'FAZER',
            'FELIZ', 'FESTA', 'FICAR', 'FINAL', 'FIRME',
            'FLUXO', 'FOLHA', 'FORCA', 'FORMA', 'FORTE',
            'FRACO', 'FRASE', 'FUNDO', 'GENTE', 'GERAL',
            'GESTO', 'GLOBO', 'GOLPE', 'GOSTO', 'GRADE',
            'GRAMA', 'GRAVE', 'GREVE', 'GRUPO', 'HEROI',
            'HORAS', 'HOTEL', 'HUMOR', 'IDADE', 'IDEAL',
            'IDEIA', 'IGUAL', 'ILHAS', 'IMPAR', 'INDIO',
            'JANTA', 'JOGOS', 'JOVEM', 'JULHO', 'JUNHO',
            'JUSTO', 'LADOS', 'LAPIS', 'LARGO', 'LEGAL',
            'LEITE', 'LEVAR', 'LICAO', 'LIDAR', 'LIMPO',
            'LINHA', 'LIVRO', 'LOCAL', 'LOUCO', 'LUGAR',
            'MAGIA', 'MAIOR', 'MANCO', 'MANHA', 'MARCA',
            'MARIA', 'MASSA', 'MATAR', 'MEDIA', 'MEDIR',
            'MEIOS', 'MENOR', 'MENOS', 'MESMO', 'METAL',
            'MINHA', 'MISTO', 'MOEDA', 'MONTE', 'MORAL',
            'MORRO', 'MORTO', 'MOTOR', 'MUDOU', 'MUITO',
            'MUNDO', 'MUSEU', 'NAVIO', 'NEGRO', 'NERVO',
            'NOITE', 'NOIVA', 'NORTE', 'NOSSO', 'NOTAR',
            'NOVOS', 'NUNCA', 'OBRAS', 'OBVIO', 'OLHAR',
            'OLHOS', 'ORDEM', 'OUTRO', 'OUVIR', 'PADRE',
            'PAGAR', 'PAGOU', 'PAPEL', 'PARAR', 'PASSO',
            'PASTA', 'PATIO', 'PAUSA', 'PEDRA', 'PEGAR',
            'PEITO', 'PELOS', 'PENSO', 'PERDA', 'PERTO',
            'PIANO', 'PILHA', 'PINGA', 'PISTA', 'PLACA',
            'PLANO', 'PLENA', 'PODER', 'PONTO', 'PORTA',
            'POSSE', 'POSTO', 'PRAIA', 'PRATA', 'PRAZO',
            'PRECO', 'PRESA', 'PRIMA', 'PROVA', 'PULSO',
            'QUASE', 'QUEDA', 'QUERO', 'QUOTA', 'RADIO',
            'RAIVA', 'RAMOS', 'RAPAZ', 'RAZAO', 'REDOR',
            'REGRA', 'REINO', 'RELAX', 'RESTO', 'REZAR',
            'RITMO', 'RIVAL', 'ROCHA', 'ROLHA', 'ROSTO',
            'RUIDO', 'RURAL', 'SABER', 'SABOR', 'SAIDA',
            'SALDO', 'SALTO', 'SANTA', 'SANTO', 'SAUDE',
            'SECAR', 'SETOR', 'SEXTO', 'SIGLA', 'SILVA',
            'SOBRE', 'SOLAR', 'SOLTO', 'SONHO', 'SORTE',
            'SUAVE', 'SUBIR', 'SUCOS', 'SUJOS', 'SUPER',
            'SURDO', 'SURRA', 'TANGO', 'TANTO', 'TARDE',
            'TAXIS', 'TECTO', 'TEMAS', 'TEMPO', 'TENDA',
            'TENHO', 'TERRA', 'TESTE', 'TIGRE', 'TINHA',
            'TODAS', 'TOMAR', 'TOQUE', 'TOTAL', 'TRACO',
            'TRAJE', 'TROCA', 'TRONO', 'TROPA', 'TURNO',
            'UNIAO', 'UNICO', 'UNIDO', 'URSOS', 'USADO',
            'VAMOS', 'VAPOR', 'VENDA', 'VENTO', 'VERDE',
            'VERAO', 'VIDEO', 'VIGOR', 'VINDA', 'VINHO',
            'VIRAR', 'VISTA', 'VITAL', 'VIVER', 'VOCES',
            'VOGAL', 'VOLTA', 'VOTAR', 'VULTO', 'ZEBRA',
            'ZEROS', 'ZOMBI', 'ZORRA', 'AGUAS', 'AMPLO',
            'ASPAS', 'BALAO', 'BINGO', 'CACAU', 'CACHO',
            'CEDRO', 'CERCO', 'CHAMA', 'CHATO', 'CHEGA',
            'CIRCO', 'COLAR', 'COLMO', 'COMER', 'CONTO',
            'CORAR', 'CORES', 'COSMO', 'COXAS', 'COZER',
            'CRAVO', 'CRIME', 'CUECA', 'CULPA', 'DAMAS',
            'DEDOS', 'DIZER', 'DOBRO', 'DORES', 'DOTAR',
            'DURAS', 'DUROS', 'ERROS', 'ESTOU', 'FALAM',
            'FALSO', 'FAUNA', 'FEIRA', 'FERRO', 'FEUDO',
            'FIBRA', 'FILME', 'FLORA', 'FOCAR', 'FOCOS',
            'FOLIA', 'FONTE', 'FORUM', 'FROTA', 'FRUTA',
            'FUSAO', 'GALHO', 'GARRA', 'GATOS', 'GENIO',
            'GERAR', 'GIRAR', 'GIROS', 'GLOTE', 'GORRO',
            'GOTAS', 'GRACA', 'GRIPE', 'GUETO', 'HAVIA',
            'HASTE', 'HOMEM', 'HONRA', 'HORTA', 'JAULA',
            'JOGAR', 'LAMAS', 'LENTO', 'LETRA', 'LIMAO',
            'LINDA', 'LOJAS', 'LONGE', 'LOTAR', 'LOTES',
            'LUCRO', 'LUNAR', 'LUXOS', 'MANDO', 'MANGA',
            'MANTA', 'MARES', 'MICRO', 'MIOLO', 'MISSA',
            'MODAL', 'MODOS', 'MOSCA', 'MOVEM', 'MUDAR',
            'MULTA', 'NADAR', 'NATAS', 'NEXOS', 'NOBRE',
            'NOMES', 'NOTAS', 'NOVAS', 'NULOS', 'OBTER',
            'OCASO', 'OMEGA', 'OPTAR', 'OPCAO', 'OSSOS',
            'OUVEM', 'PACTO', 'PALAS', 'PALCO', 'PALHA',
            'PANOS', 'PAPAS', 'PAPOS', 'PARES', 'PASSE',
            'PAUTA', 'PAVIO', 'PECAS', 'PENAS', 'PESCA',
            'PESOS', 'PILAR', 'PINOS', 'PIPER', 'PIQUE',
            'PIRES', 'PLEBE', 'PLUMA', 'PODRE', 'POLAR',
            'POLIR', 'POLPA', 'POLVO', 'POMAR', 'PONDE',
            'PONTE', 'POUPA', 'PRECE', 'PREGO', 'PRETO',
            'PRIMO', 'PUDIM', 'PUROS', 'RAIOS', 'RALAR',
            'RAMPA', 'RANCO', 'RAROS', 'RASAR', 'RASTO',
            'RATOS', 'REGUA', 'RELER', 'RENDA', 'RENTE',
            'REPOR', 'REZAS', 'RISCO', 'RODAR', 'RODAS',
            'ROLAR', 'ROLOS', 'ROMBO', 'RONCO', 'ROUPA',
            'SABIA', 'SACRO', 'SAFOS', 'SAGAS', 'SAGUI',
            'SALMO', 'SAMPA', 'SANAR', 'SAQUE', 'SARAR',
            'SARNA', 'SECOS', 'SEDAS', 'SELOS', 'SEMEN',
            'SENHA', 'SENSO', 'SERAO', 'SERIO', 'SERVO',
            'SESTA', 'SIGMA', 'SINAL', 'SISMA', 'SISMO',
            'SOCAR', 'SODIO', 'SOFAS', 'SOLDA', 'SOLOS',
            'SOMAR', 'SONDA', 'SOPAS', 'SOPRO', 'SOROS',
            'SOVAR', 'TABUS', 'TACOS', 'TALAS', 'TALHO',
            'TANGA', 'TAPAR', 'TAPAS', 'TARSO', 'TASAR',
            'TELAS', 'TERCO', 'TERMA', 'TERNO', 'TETRA',
            'TEXTO', 'TIBIA', 'TIPOS', 'TIRAR', 'TIRAS',
            'TITAN', 'TOADA', 'TODOS', 'TOLDO', 'TONAL',
            'TONER', 'TOPIA', 'TOPOS', 'TORAX', 'TORPE',
            'TORRE', 'TORSO', 'TOSCO', 'TOSSE', 'TRAIR',
            'TRAMA', 'TREVO', 'TRIBO', 'TRICO', 'TRIFO',
            'TROCO', 'TROVA', 'TUBOS', 'TUMOR', 'TURVO',
            'TUTUS', 'UMBRO', 'UNTAR', 'URNAS', 'USUAL',
            'VACAS', 'VAGAS', 'VAGOS', 'VAIAR', 'VALER',
            'VALOR', 'VALSA', 'VARAL', 'VAZIO', 'VEIAS',
            'VELAR', 'VELHA', 'VELHO', 'VENAL', 'VENCE',
            'VERBA', 'VERBO', 'VESPA', 'VESTE', 'VIBES',
            'VIELA', 'VIGIA', 'VILAS', 'VIRAL', 'VIRIL',
            'VISAR', 'VISOR', 'VIUVA', 'VIUVO', 'VIVAR',
            'VOADO', 'VOGAR', 'VOGOU', 'VOTOS', 'VULGO'
        ];
        
        this.maxAttempts = 6;
        this.wordLength = 5;
        this.running = false;
        
        this.reset();
        this.setupControls();
    }

    reset() {
        // Select random word
        this.targetWord = this.words[Math.floor(Math.random() * this.words.length)].toUpperCase();
        this.attempts = [];
        this.currentAttempt = '';
        this.currentRow = 0;
        this.gameOver = false;
        this.won = false;
        this.score = 0;
        this.shake = false;
        this.shakeTimer = 0;
        this.revealIndex = -1;
        this.message = '';
        this.messageTimer = 0;
        
        this.updateScoreDisplay();
    }

    setupControls() {
        this.keyHandler = (e) => {
            if (this.gameOver || this.won) {
                if (e.key === ' ' || e.key === 'Enter') {
                    this.reset();
                    this.start();
                }
                return;
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                this.currentAttempt = this.currentAttempt.slice(0, -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.submitAttempt();
            } else if (/^[a-zA-ZçÇ]$/.test(e.key) && this.currentAttempt.length < this.wordLength) {
                // Handle accented characters by converting to base letter
                let letter = e.key.toUpperCase();
                // Normalize accented characters
                letter = letter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (letter === 'Ç') letter = 'C';
                this.currentAttempt += letter;
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }

    submitAttempt() {
        if (this.currentAttempt.length !== this.wordLength) {
            this.showMessage('Palavra incompleta!');
            this.shake = true;
            this.shakeTimer = 300;
            return;
        }

        const attempt = this.currentAttempt.toUpperCase();
        this.attempts.push(attempt);
        this.currentAttempt = '';
        this.currentRow++;
        
        // Start reveal animation
        this.revealIndex = 0;
        this.revealTimer = setInterval(() => {
            this.revealIndex++;
            if (this.revealIndex >= this.wordLength) {
                clearInterval(this.revealTimer);
                this.checkGameEnd(attempt);
            }
        }, 150);
    }

    checkGameEnd(attempt) {
        if (attempt === this.targetWord) {
            this.won = true;
            // Score based on number of attempts (fewer = better)
            const baseScore = 1000;
            const attemptBonus = (this.maxAttempts - this.attempts.length + 1) * 200;
            this.score = baseScore + attemptBonus;
            this.onScore(this.score);
            
            // Check for first attempt achievement
            if (this.attempts.length === 1 && this.manager) {
                this.manager.unlockAchievement('termo_master');
            }
            
            this.showMessage('Parabéns! 🎉');
        } else if (this.attempts.length >= this.maxAttempts) {
            this.gameOver = true;
            this.score = 0;
            this.onScore(this.score);
            this.showMessage(`Era: ${this.targetWord}`);
        }
        
        this.updateScoreDisplay();
    }

    showMessage(msg) {
        this.message = msg;
        this.messageTimer = 2000;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = Date.now();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.revealTimer) {
            clearInterval(this.revealTimer);
        }
        document.removeEventListener('keydown', this.keyHandler);
    }

    gameLoop() {
        if (!this.running) return;

        const now = Date.now();
        const delta = now - this.lastUpdate;
        
        // Update timers
        if (this.shake) {
            this.shakeTimer -= delta;
            if (this.shakeTimer <= 0) {
                this.shake = false;
            }
        }
        
        if (this.messageTimer > 0) {
            this.messageTimer -= delta;
        }
        
        this.draw();
        this.lastUpdate = now;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    getLetterStatus(letter, index, word) {
        const targetWord = this.targetWord;
        
        if (targetWord[index] === letter) {
            return 'correct'; // Green - correct position
        } else if (targetWord.includes(letter)) {
            // Check if this letter is already matched correctly elsewhere
            let letterCount = 0;
            let matchedCount = 0;
            
            for (let i = 0; i < targetWord.length; i++) {
                if (targetWord[i] === letter) letterCount++;
            }
            
            for (let i = 0; i < word.length; i++) {
                if (word[i] === letter && targetWord[i] === letter) {
                    matchedCount++;
                }
            }
            
            // Count how many times this letter appears before current position in wrong spots
            let wrongSpotCount = 0;
            for (let i = 0; i < index; i++) {
                if (word[i] === letter && targetWord[i] !== letter && targetWord.includes(letter)) {
                    wrongSpotCount++;
                }
            }
            
            if (wrongSpotCount < letterCount - matchedCount) {
                return 'present'; // Yellow - wrong position
            }
        }
        
        return 'absent'; // Gray - not in word
    }

    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Background
        this.ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TERMO', this.canvas.width / 2, 35);
        
        // Subtitle
        this.ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Adivinhe a palavra de 5 letras!', this.canvas.width / 2, 55);
        
        // Grid settings
        const tileSize = 56;
        const gap = 6;
        const gridWidth = this.wordLength * tileSize + (this.wordLength - 1) * gap;
        const gridHeight = this.maxAttempts * tileSize + (this.maxAttempts - 1) * gap;
        const startX = (this.canvas.width - gridWidth) / 2;
        const startY = 75;
        
        // Draw grid
        for (let row = 0; row < this.maxAttempts; row++) {
            const isCurrentRow = row === this.currentRow && !this.gameOver && !this.won;
            const isCompletedRow = row < this.attempts.length;
            const attempt = isCompletedRow ? this.attempts[row] : (isCurrentRow ? this.currentAttempt : '');
            
            // Shake effect for current row
            let rowOffsetX = 0;
            if (isCurrentRow && this.shake) {
                rowOffsetX = Math.sin(Date.now() / 20) * 5;
            }
            
            for (let col = 0; col < this.wordLength; col++) {
                const x = startX + col * (tileSize + gap) + rowOffsetX;
                const y = startY + row * (tileSize + gap);
                const letter = attempt[col] || '';
                
                let bgColor, borderColor, textColor;
                
                if (isCompletedRow) {
                    // Revealed row
                    const isRevealed = row < this.attempts.length - 1 || col <= this.revealIndex;
                    
                    if (isRevealed) {
                        const status = this.getLetterStatus(letter, col, attempt);
                        
                        if (status === 'correct') {
                            bgColor = '#22c55e'; // Green
                            borderColor = '#16a34a';
                        } else if (status === 'present') {
                            bgColor = '#eab308'; // Yellow
                            borderColor = '#ca8a04';
                        } else {
                            bgColor = isDark ? '#475569' : '#94a3b8'; // Gray
                            borderColor = isDark ? '#334155' : '#64748b';
                        }
                        textColor = '#ffffff';
                    } else {
                        // Not yet revealed
                        bgColor = isDark ? '#1e293b' : '#ffffff';
                        borderColor = isDark ? '#475569' : '#cbd5e1';
                        textColor = isDark ? '#e2e8f0' : '#1e293b';
                    }
                } else if (isCurrentRow && letter) {
                    // Current row with letter
                    bgColor = isDark ? '#1e293b' : '#ffffff';
                    borderColor = isDark ? '#64748b' : '#94a3b8';
                    textColor = isDark ? '#e2e8f0' : '#1e293b';
                } else {
                    // Empty cell
                    bgColor = isDark ? '#1e293b' : '#ffffff';
                    borderColor = isDark ? '#334155' : '#e2e8f0';
                    textColor = isDark ? '#e2e8f0' : '#1e293b';
                }
                
                // Draw cell background
                this.ctx.fillStyle = bgColor;
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, tileSize, tileSize, 4);
                this.ctx.fill();
                
                // Draw cell border
                this.ctx.strokeStyle = borderColor;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Draw letter
                if (letter) {
                    this.ctx.fillStyle = textColor;
                    this.ctx.font = 'bold 28px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(letter, x + tileSize / 2, y + tileSize / 2 + 2);
                }
            }
        }
        
        // Draw helper text (without virtual keyboard)
        this.ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Use o teclado para digitar • ENTER para confirmar • BACKSPACE para apagar', this.canvas.width / 2, startY + gridHeight + 25);
        
        // Draw message
        if (this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 500);
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
            this.ctx.beginPath();
            this.ctx.roundRect(this.canvas.width / 2 - 100, startY + gridHeight / 2 - 20, 200, 40, 8);
            this.ctx.fill();
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.message, this.canvas.width / 2, startY + gridHeight / 2);
        }
        
        // Game over / Won overlay
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? '🎉 PARABÉNS!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            this.ctx.font = '18px Arial';
            if (this.won) {
                this.ctx.fillText(`Você acertou em ${this.attempts.length} tentativa${this.attempts.length > 1 ? 's' : ''}!`, this.canvas.width / 2, this.canvas.height / 2);
            } else {
                this.ctx.fillText(`A palavra era: ${this.targetWord}`, this.canvas.width / 2, this.canvas.height / 2);
            }
            
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ENTER ou ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const infoEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (infoEl) infoEl.textContent = `Tentativa ${Math.min(this.attempts.length + 1, this.maxAttempts)}/${this.maxAttempts}`;
    }
}

class TermoDuoGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 650;
        this.canvas.height = 500;
        
        // General Portuguese 5-letter words (similar to term.ooo)
        this.words = [
            'ABRIR', 'ACASO', 'ACIMA', 'ADEUS', 'AGORA',
            'AINDA', 'ACHAR', 'ALUNO', 'AMBOS', 'AMIGO',
            'ANDAR', 'ANTES', 'APOIO', 'AREIA', 'ATUAL',
            'AVIAO', 'BAIXO', 'BANCO', 'BARCO', 'BEBER',
            'BEIJO', 'BELOS', 'BOLSA', 'BORDA', 'BRACO',
            'BREVE', 'BRUXA', 'CALMA', 'CALOR', 'CAMPO',
            'CANTO', 'CARNE', 'CARRO', 'CASAL', 'CAUSA',
            'CERTO', 'CHAVE', 'CHEFE', 'CHUVA', 'CLARO',
            'CLIMA', 'COBRA', 'COMUM', 'CONTA', 'COPIA',
            'CORPO', 'COISA', 'CORTE', 'CREME', 'CUSTO',
            'DADOS', 'DANCA', 'DENTE', 'DESDE', 'DEVER',
            'DIABO', 'DISCO', 'DOIDO', 'DOLAR', 'DRAMA',
            'DUPLA', 'DURAR', 'ECRAN', 'ELITE', 'ENTAO',
            'ENTRE', 'ENVIO', 'ERRAR', 'EXATO', 'EXTRA',
            'FALAR', 'FALTA', 'FATOS', 'FAVOR', 'FAZER',
            'FELIZ', 'FESTA', 'FICAR', 'FINAL', 'FIRME',
            'FLUXO', 'FOLHA', 'FORCA', 'FORMA', 'FORTE',
            'FRACO', 'FRASE', 'FUNDO', 'GENTE', 'GERAL',
            'GESTO', 'GLOBO', 'GOLPE', 'GOSTO', 'GRADE',
            'GRAMA', 'GRAVE', 'GREVE', 'GRUPO', 'HEROI',
            'HORAS', 'HOTEL', 'HUMOR', 'IDADE', 'IDEAL',
            'IDEIA', 'IGUAL', 'ILHAS', 'IMPAR', 'INDIO',
            'JANTA', 'JOGOS', 'JOVEM', 'JULHO', 'JUNHO',
            'JUSTO', 'LADOS', 'LAPIS', 'LARGO', 'LEGAL',
            'LEITE', 'LEVAR', 'LICAO', 'LIDAR', 'LIMPO',
            'LINHA', 'LIVRO', 'LOCAL', 'LOUCO', 'LUGAR',
            'MAGIA', 'MAIOR', 'MANCO', 'MANHA', 'MARCA',
            'MARIA', 'MASSA', 'MATAR', 'MEDIA', 'MEDIR',
            'MEIOS', 'MENOR', 'MENOS', 'MESMO', 'METAL',
            'MINHA', 'MISTO', 'MOEDA', 'MONTE', 'MORAL',
            'MORRO', 'MORTO', 'MOTOR', 'MUDOU', 'MUITO',
            'MUNDO', 'MUSEU', 'NAVIO', 'NEGRO', 'NERVO',
            'NOITE', 'NOIVA', 'NORTE', 'NOSSO', 'NOTAR',
            'NOVOS', 'NUNCA', 'OBRAS', 'OBVIO', 'OLHAR',
            'OLHOS', 'ORDEM', 'OUTRO', 'OUVIR', 'PADRE',
            'PAGAR', 'PAGOU', 'PAPEL', 'PARAR', 'PASSO',
            'PASTA', 'PATIO', 'PAUSA', 'PEDRA', 'PEGAR',
            'PEITO', 'PELOS', 'PENSO', 'PERDA', 'PERTO',
            'PIANO', 'PILHA', 'PINGA', 'PISTA', 'PLACA',
            'PLANO', 'PLENA', 'PODER', 'PONTO', 'PORTA',
            'POSSE', 'POSTO', 'PRAIA', 'PRATA', 'PRAZO',
            'PRECO', 'PRESA', 'PRIMA', 'PROVA', 'PULSO',
            'QUASE', 'QUEDA', 'QUERO', 'QUOTA', 'RADIO',
            'RAIVA', 'RAMOS', 'RAPAZ', 'RAZAO', 'REDOR',
            'REGRA', 'REINO', 'RELAX', 'RESTO', 'REZAR',
            'RITMO', 'RIVAL', 'ROCHA', 'ROLHA', 'ROSTO',
            'RUIDO', 'RURAL', 'SABER', 'SABOR', 'SAIDA',
            'SALDO', 'SALTO', 'SANTA', 'SANTO', 'SAUDE',
            'SECAR', 'SETOR', 'SEXTO', 'SIGLA', 'SILVA',
            'SOBRE', 'SOLAR', 'SOLTO', 'SONHO', 'SORTE',
            'SUAVE', 'SUBIR', 'SUCOS', 'SUJOS', 'SUPER',
            'SURDO', 'SURRA', 'TANGO', 'TANTO', 'TARDE',
            'TAXIS', 'TECTO', 'TEMAS', 'TEMPO', 'TENDA',
            'TENHO', 'TERRA', 'TESTE', 'TIGRE', 'TINHA',
            'TODAS', 'TOMAR', 'TOQUE', 'TOTAL', 'TRACO',
            'TRAJE', 'TROCA', 'TRONO', 'TROPA', 'TURNO',
            'UNIAO', 'UNICO', 'UNIDO', 'URSOS', 'USADO',
            'VAMOS', 'VAPOR', 'VENDA', 'VENTO', 'VERDE',
            'VERAO', 'VIDEO', 'VIGOR', 'VINDA', 'VINHO',
            'VIRAR', 'VISTA', 'VITAL', 'VIVER', 'VOCES',
            'VOGAL', 'VOLTA', 'VOTAR', 'VULTO', 'ZEBRA',
            'ZEROS', 'ZOMBI', 'ZORRA', 'AGUAS', 'AMPLO',
            'ASPAS', 'BALAO', 'BINGO', 'CACAU', 'CACHO',
            'CEDRO', 'CERCO', 'CHAMA', 'CHATO', 'CHEGA',
            'CIRCO', 'COLAR', 'COLMO', 'COMER', 'CONTO',
            'CORAR', 'CORES', 'COSMO', 'COXAS', 'COZER',
            'CRAVO', 'CRIME', 'CUECA', 'CULPA', 'DAMAS',
            'DEDOS', 'DIZER', 'DOBRO', 'DORES', 'DOTAR',
            'DURAS', 'DUROS', 'ERROS', 'ESTOU', 'EXAME',
            'FALAM', 'FALSO', 'FAUNA', 'FEIRA', 'FERRO',
            'FEUDO', 'FIBRA', 'FILME', 'FLORA', 'FOCAR',
            'FOCOS', 'FOLIA', 'FONTE', 'FORUM', 'FROTA',
            'FRUTA', 'FUSAO', 'GALHO', 'GARRA', 'GATOS',
            'GENIO', 'GERAR', 'GIRAR', 'GIROS', 'GLOTE',
            'GORRO', 'GOTAS', 'GRACA', 'GRIPE', 'GUETO',
            'HAVIA', 'HASTE', 'HOMEM', 'HONRA', 'HORTA',
            'JAULA', 'JOGAR', 'LAMAS', 'LENTO', 'LETRA',
            'LIMAO', 'LINDA', 'LOJAS', 'LONGE', 'LOTAR',
            'LOTES', 'LUCRO', 'LUNAR', 'LUXOS', 'MANDO',
            'MANGA', 'MANTA', 'MARES', 'MICRO', 'MIOLO',
            'MISSA', 'MODAL', 'MODOS', 'MOSCA', 'MOVEM',
            'MUDAR', 'MULTA', 'NADAR', 'NATAS', 'NEXOS',
            'NOBRE', 'NOMES', 'NOTAS', 'NOVAS', 'NULOS',
            'OBTER', 'OCASO', 'OMEGA', 'OPTAR', 'OPCAO',
            'OSSOS', 'OUVEM', 'PACTO', 'PALAS', 'PALCO',
            'PALHA', 'PANOS', 'PAPAS', 'PAPOS', 'PARES',
            'PASSE', 'PAUTA', 'PAVIO', 'PECAS', 'PENAS',
            'PESCA', 'PESOS', 'PILAR', 'PINOS', 'PIPER',
            'PIQUE', 'PIRES', 'PLEBE', 'PLUMA', 'PODRE',
            'POLAR', 'POLIR', 'POLPA', 'POLVO', 'POMAR',
            'PONDE', 'PONTE', 'POUPA', 'PRECE', 'PREGO',
            'PRETO', 'PRIMO', 'PUDIM', 'PUROS', 'RAIOS',
            'RALAR', 'RAMPA', 'RANCO', 'RAROS', 'RASAR',
            'RASTO', 'RATOS', 'REGUA', 'RELER', 'RENDA',
            'RENTE', 'REPOR', 'REZAS', 'RISCO', 'RODAR',
            'RODAS', 'ROLAR', 'ROLOS', 'ROMBO', 'RONCO',
            'ROUPA', 'SABIA', 'SACRO', 'SAFOS', 'SAGAS',
            'SAGUI', 'SALMO', 'SAMPA', 'SANAR', 'SAQUE',
            'SARAR', 'SARNA', 'SECOS', 'SEDAS', 'SELOS',
            'SEMEN', 'SENHA', 'SENSO', 'SERAO', 'SERIO',
            'SERVO', 'SESTA', 'SIGMA', 'SINAL', 'SISMA',
            'SISMO', 'SOCAR', 'SODIO', 'SOFAS', 'SOLDA',
            'SOLOS', 'SOMAR', 'SONDA', 'SOPAS', 'SOPRO',
            'SOROS', 'SOVAR', 'TABUS', 'TACOS', 'TALAS',
            'TALHO', 'TANGA', 'TAPAR', 'TAPAS', 'TARSO',
            'TASAR', 'TELAS', 'TERCO', 'TERMA', 'TERNO',
            'TETRA', 'TEXTO', 'TIBIA', 'TIPOS', 'TIRAR',
            'TIRAS', 'TITAN', 'TOADA', 'TODOS', 'TOLDO',
            'TONAL', 'TONER', 'TOPIA', 'TOPOS', 'TORAX',
            'TORPE', 'TORRE', 'TORSO', 'TOSCO', 'TOSSE',
            'TRAIR', 'TRAMA', 'TREVO', 'TRIBO', 'TRICO',
            'TRIFO', 'TROCO', 'TROVA', 'TUBOS', 'TUMOR',
            'TURVO', 'TUTUS', 'UMBRO', 'UNTAR', 'URNAS',
            'USUAL', 'VACAS', 'VAGAS', 'VAGOS', 'VAIAR',
            'VALER', 'VALOR', 'VALSA', 'VARAL', 'VAZIO',
            'VEIAS', 'VELAR', 'VELHA', 'VELHO', 'VENAL',
            'VENCE', 'VERBA', 'VERBO', 'VESPA', 'VESTE',
            'VIBES', 'VIELA', 'VIGIA', 'VILAS', 'VIRAL',
            'VIRIL', 'VISAR', 'VISOR', 'VIUVA', 'VIUVO',
            'VIVAR', 'VOADO', 'VOGAR', 'VOGOU', 'VOTOS',
            'VULGO', 'ALTAS', 'ALTAR', 'ALTOS', 'AMADO',
            'AMEBA', 'ANEXO', 'ANJOS', 'ARCOS', 'AREAS',
            'ARMAS', 'ATLAS', 'ATOMO', 'AUTOR', 'BASES',
            'BICHO', 'BOCAS', 'BOLAS', 'BOTES', 'BRAOS',
            'CABOS', 'CACOS', 'CAIXA', 'CALOS', 'CAMAS',
            'CAPIM', 'CASOS', 'CAVES', 'CELAS', 'CENAS',
            'CERCA', 'CHORO', 'CINCO', 'CISNE', 'CIVIL',
            'CLUBE', 'CODAS', 'COLAS', 'COMER', 'COPAS',
            'CREIA', 'CULTO', 'CURSO', 'DATAS', 'DEITA',
            'DELTA', 'DEPOR', 'DESSA', 'DIETA', 'DIGNO',
            'DITOS', 'DIVOS', 'DOCES', 'DOSSO', 'DOTES',
            'DUETO', 'DUNAS', 'DUQUE', 'EIXOS', 'ELITE',
            'ENTES', 'ERVAS', 'ESSES', 'ESTAR', 'EUROS',
            'FACAS', 'FADAS', 'FADAS', 'FASES', 'FAXAS',
            'FECHO', 'FEDOR', 'FEIAS', 'FEIOS', 'FEIXE',
            'FENDA', 'FETAL', 'FETOS', 'FIBRA', 'FILHA',
            'FILHO', 'FILOS', 'FITAS', 'FITAS', 'FIXAS',
            'FIXOS', 'FOBIA', 'FOCOS', 'FOGOS', 'FOICE',
            'FOSSE', 'FOTOS', 'FRACA', 'FREAR', 'FUGAS',
            'FUMAR', 'FUMOS', 'FURAS', 'FUROS', 'GAITA',
            'GALAO', 'GALOS', 'GAMAS', 'GANGA', 'GANHO',
            'GASES', 'GAZES', 'GELAM', 'GELAS', 'GELOS',
            'GEMAS', 'GENES', 'GERAL', 'GESSO', 'GOELA',
            'GOLAS', 'GOLES', 'GOMAS', 'GONGO', 'GOZAR',
            'GOZOS', 'GRACA', 'GRAPA', 'GRAOS', 'GRATA',
            'GRATO', 'GRILO', 'GRUTA', 'GUIAS', 'GUIAR'
        ];
        
        this.numWords = 2;
        this.maxAttempts = 7;
        this.wordLength = 5;
        this.running = false;
        
        this.reset();
        this.setupControls();
    }

    reset() {
        // Select random words (ensure they're different)
        const shuffled = [...this.words].sort(() => Math.random() - 0.5);
        this.targetWords = shuffled.slice(0, this.numWords).map(w => w.toUpperCase());
        this.solvedWords = new Array(this.numWords).fill(false);
        this.attempts = [];
        this.currentAttempt = '';
        this.gameOver = false;
        this.won = false;
        this.score = 0;
        this.shake = false;
        this.shakeTimer = 0;
        this.revealIndex = -1;
        this.message = '';
        this.messageTimer = 0;
        
        this.updateScoreDisplay();
    }

    setupControls() {
        this.keyHandler = (e) => {
            if (this.gameOver || this.won) {
                if (e.key === ' ' || e.key === 'Enter') {
                    this.reset();
                    this.start();
                }
                return;
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                this.currentAttempt = this.currentAttempt.slice(0, -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.submitAttempt();
            } else if (/^[a-zA-ZçÇ]$/.test(e.key) && this.currentAttempt.length < this.wordLength) {
                let letter = e.key.toUpperCase();
                letter = letter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (letter === 'Ç') letter = 'C';
                this.currentAttempt += letter;
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }

    submitAttempt() {
        if (this.currentAttempt.length !== this.wordLength) {
            this.showMessage('Palavra incompleta!');
            this.shake = true;
            this.shakeTimer = 300;
            return;
        }

        const attempt = this.currentAttempt.toUpperCase();
        this.attempts.push(attempt);
        this.currentAttempt = '';
        
        // Check if any word was solved
        for (let i = 0; i < this.numWords; i++) {
            if (!this.solvedWords[i] && attempt === this.targetWords[i]) {
                this.solvedWords[i] = true;
            }
        }
        
        // Start reveal animation
        this.revealIndex = 0;
        this.revealTimer = setInterval(() => {
            this.revealIndex++;
            if (this.revealIndex >= this.wordLength) {
                clearInterval(this.revealTimer);
                this.checkGameEnd();
            }
        }, 100);
    }

    checkGameEnd() {
        const allSolved = this.solvedWords.every(s => s);
        
        if (allSolved) {
            this.won = true;
            const baseScore = 2000;
            const attemptBonus = (this.maxAttempts - this.attempts.length + 1) * 300;
            this.score = baseScore + attemptBonus;
            this.onScore(this.score);
            this.showMessage('Parabéns! 🎉');
        } else if (this.attempts.length >= this.maxAttempts) {
            this.gameOver = true;
            this.score = 0;
            this.onScore(this.score);
            const unsolved = this.targetWords.filter((_, i) => !this.solvedWords[i]);
            this.showMessage(`Faltou: ${unsolved.join(', ')}`);
        }
        
        this.updateScoreDisplay();
    }

    showMessage(msg) {
        this.message = msg;
        this.messageTimer = 2000;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = Date.now();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.revealTimer) {
            clearInterval(this.revealTimer);
        }
        document.removeEventListener('keydown', this.keyHandler);
    }

    gameLoop() {
        if (!this.running) return;

        const now = Date.now();
        const delta = now - this.lastUpdate;
        
        if (this.shake) {
            this.shakeTimer -= delta;
            if (this.shakeTimer <= 0) this.shake = false;
        }
        
        if (this.messageTimer > 0) this.messageTimer -= delta;
        
        this.draw();
        this.lastUpdate = now;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    getLetterStatus(letter, index, attempt, targetWord) {
        if (targetWord[index] === letter) {
            return 'correct';
        } else if (targetWord.includes(letter)) {
            let letterCount = 0;
            let matchedCount = 0;
            
            for (let i = 0; i < targetWord.length; i++) {
                if (targetWord[i] === letter) letterCount++;
            }
            
            for (let i = 0; i < attempt.length; i++) {
                if (attempt[i] === letter && targetWord[i] === letter) {
                    matchedCount++;
                }
            }
            
            let wrongSpotCount = 0;
            for (let i = 0; i < index; i++) {
                if (attempt[i] === letter && targetWord[i] !== letter && targetWord.includes(letter)) {
                    wrongSpotCount++;
                }
            }
            
            if (wrongSpotCount < letterCount - matchedCount) {
                return 'present';
            }
        }
        
        return 'absent';
    }

    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Background
        this.ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TERMO DUETO', this.canvas.width / 2, 35);
        
        // Subtitle
        this.ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Adivinhe 2 palavras aleatórias ao mesmo tempo!', this.canvas.width / 2, 55);
        
        // Grid settings
        const tileSize = 48;
        const gap = 5;
        const gridWidth = this.wordLength * tileSize + (this.wordLength - 1) * gap;
        const gridHeight = this.maxAttempts * tileSize + (this.maxAttempts - 1) * gap;
        const gridSpacing = 40;
        const totalWidth = this.numWords * gridWidth + (this.numWords - 1) * gridSpacing;
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = 70;
        
        // Draw grids for each word
        for (let wordIdx = 0; wordIdx < this.numWords; wordIdx++) {
            const gridStartX = startX + wordIdx * (gridWidth + gridSpacing);
            const targetWord = this.targetWords[wordIdx];
            const isSolved = this.solvedWords[wordIdx];
            
            // Draw word indicator
            this.ctx.fillStyle = isSolved ? '#22c55e' : (isDark ? '#64748b' : '#94a3b8');
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(isSolved ? '✓' : `${wordIdx + 1}`, gridStartX + gridWidth / 2, startY - 10);
            
            for (let row = 0; row < this.maxAttempts; row++) {
                const isCurrentRow = row === this.attempts.length && !this.gameOver && !this.won;
                const isCompletedRow = row < this.attempts.length;
                const attempt = isCompletedRow ? this.attempts[row] : (isCurrentRow ? this.currentAttempt : '');
                
                let rowOffsetX = 0;
                if (isCurrentRow && this.shake) {
                    rowOffsetX = Math.sin(Date.now() / 20) * 5;
                }
                
                for (let col = 0; col < this.wordLength; col++) {
                    const x = gridStartX + col * (tileSize + gap) + rowOffsetX;
                    const y = startY + row * (tileSize + gap);
                    const letter = attempt[col] || '';
                    
                    let bgColor, borderColor, textColor;
                    
                    if (isSolved && row >= this.attempts.findIndex(a => a === targetWord)) {
                        // Word is solved, show all green from solve row onwards
                        if (row === this.attempts.findIndex(a => a === targetWord)) {
                            bgColor = '#22c55e';
                            borderColor = '#16a34a';
                            textColor = '#ffffff';
                        } else {
                            bgColor = isDark ? '#1e293b' : '#ffffff';
                            borderColor = isDark ? '#334155' : '#e2e8f0';
                            textColor = isDark ? '#e2e8f0' : '#1e293b';
                        }
                    } else if (isCompletedRow) {
                        const isRevealed = row < this.attempts.length - 1 || col <= this.revealIndex;
                        
                        if (isRevealed) {
                            const status = this.getLetterStatus(letter, col, attempt, targetWord);
                            
                            if (status === 'correct') {
                                bgColor = '#22c55e';
                                borderColor = '#16a34a';
                            } else if (status === 'present') {
                                bgColor = '#eab308';
                                borderColor = '#ca8a04';
                            } else {
                                bgColor = isDark ? '#475569' : '#94a3b8';
                                borderColor = isDark ? '#334155' : '#64748b';
                            }
                            textColor = '#ffffff';
                        } else {
                            bgColor = isDark ? '#1e293b' : '#ffffff';
                            borderColor = isDark ? '#475569' : '#cbd5e1';
                            textColor = isDark ? '#e2e8f0' : '#1e293b';
                        }
                    } else if (isCurrentRow && letter) {
                        bgColor = isDark ? '#1e293b' : '#ffffff';
                        borderColor = isDark ? '#64748b' : '#94a3b8';
                        textColor = isDark ? '#e2e8f0' : '#1e293b';
                    } else {
                        bgColor = isDark ? '#1e293b' : '#ffffff';
                        borderColor = isDark ? '#334155' : '#e2e8f0';
                        textColor = isDark ? '#e2e8f0' : '#1e293b';
                    }
                    
                    this.ctx.fillStyle = bgColor;
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y, tileSize, tileSize, 4);
                    this.ctx.fill();
                    
                    this.ctx.strokeStyle = borderColor;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    if (letter) {
                        this.ctx.fillStyle = textColor;
                        this.ctx.font = 'bold 22px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(letter, x + tileSize / 2, y + tileSize / 2 + 2);
                    }
                }
            }
        }
        
        // Draw helper text
        this.ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Use o teclado para digitar • ENTER para confirmar • BACKSPACE para apagar', this.canvas.width / 2, startY + gridHeight + 25);
        
        // Draw message
        if (this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 500);
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
            this.ctx.beginPath();
            this.ctx.roundRect(this.canvas.width / 2 - 120, startY + gridHeight / 2 - 20, 240, 40, 8);
            this.ctx.fill();
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.message, this.canvas.width / 2, startY + gridHeight / 2);
        }
        
        // Game over / Won overlay
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? '🎉 PARABÉNS!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            this.ctx.font = '18px Arial';
            if (this.won) {
                this.ctx.fillText(`Você acertou em ${this.attempts.length} tentativas!`, this.canvas.width / 2, this.canvas.height / 2);
            } else {
                const unsolved = this.targetWords.filter((_, i) => !this.solvedWords[i]);
                this.ctx.fillText(`Palavras: ${unsolved.join(', ')}`, this.canvas.width / 2, this.canvas.height / 2);
            }
            
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ENTER ou ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const infoEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        const solved = this.solvedWords.filter(s => s).length;
        if (infoEl) infoEl.textContent = `Tentativa ${Math.min(this.attempts.length + 1, this.maxAttempts)}/${this.maxAttempts} | ${solved}/${this.numWords}`;
    }
}

class TermoQuartetGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 700;
        this.canvas.height = 600;
        
        // Portuguese 4-letter words for Quarteto mode
        this.words = [
            'AMOR', 'ALMA', 'AGUA', 'ALTO', 'AZUL', 'BOLA', 'BOCA', 'BELO', 'BEBE', 'BICO',
            'CADA', 'CASA', 'CARA', 'CAFE', 'CAMA', 'CEDO', 'CEIA', 'CERA', 'CIMA', 'COLA',
            'DADO', 'DATA', 'DEDO', 'DELE', 'DEUS', 'DIAS', 'DICA', 'DOCE', 'DOIS', 'DONO',
            'ESSA', 'ESSE', 'ESTA', 'ESTE', 'ELAS', 'ELES', 'FACA', 'FALA', 'FAMA', 'FASE',
            'FATO', 'FEIA', 'FEIO', 'FENO', 'FERA', 'FILA', 'FOGO', 'FOME', 'FORA', 'FOTO',
            'GALO', 'GATA', 'GATO', 'GELO', 'GIRA', 'GOLA', 'GOTA', 'HORA', 'HOJE', 'ILHA',
            'ISSO', 'JOGO', 'JOIA', 'LADO', 'LAGO', 'LATA', 'LEAO', 'LEVE', 'LIDO', 'LIMA',
            'LISA', 'LISO', 'LOBO', 'LOJA', 'LOGO', 'LOJA', 'LOTE', 'LUCA', 'LUPA', 'LUXO',
            'MACA', 'MAGO', 'MAIO', 'MALA', 'MAPA', 'MAIS', 'MATO', 'MEDO', 'MEIO', 'MESA',
            'META', 'MICO', 'MINA', 'MODO', 'MOLE', 'MOTO', 'MUDO', 'MURO', 'NADA', 'NATA',
            'NAVE', 'NEGO', 'NEVE', 'NETO', 'NIDO', 'NOME', 'NOTA', 'NOVA', 'NOVO', 'NUCA',
            'OBRA', 'OITO', 'ONDE', 'ONDA', 'OURO', 'OSSO', 'OUVI', 'PACO', 'PAGO', 'PAIS',
            'PANO', 'PARA', 'PARE', 'PATA', 'PATO', 'PECA', 'PELE', 'PELO', 'PENA', 'PESO',
            'PICO', 'PIPA', 'PISO', 'PODE', 'POLO', 'POMO', 'PORO', 'POSE', 'POTE', 'PRUA',
            'RABO', 'RAMO', 'RATO', 'RAIO', 'REAL', 'REDE', 'RELA', 'REMO', 'RICA', 'RICO',
            'RIMA', 'RIOS', 'RISO', 'ROBO', 'RODA', 'ROLA', 'ROSA', 'ROTA', 'RUDE', 'RUIM',
            'SACO', 'SALA', 'SACO', 'SAIA', 'SAIR', 'SEDE', 'SELO', 'SETA', 'SETE', 'SINO',
            'SOBE', 'SOLO', 'SOMA', 'SONO', 'SOPA', 'SUCO', 'SUJO', 'TACA', 'TALO', 'TAPA',
            'TATU', 'TAXA', 'TEIA', 'TELA', 'TEMA', 'TETO', 'TIPO', 'TOCA', 'TODO', 'TOMA',
            'TOPO', 'TUDO', 'TUBO', 'URNA', 'USAR', 'VACA', 'VAGA', 'VALE', 'VASO', 'VEIA',
            'VELA', 'VEJO', 'VIDA', 'VIDE', 'VILA', 'VIRA', 'VIVE', 'VIVO', 'VOCE', 'VOTO',
            'XALE', 'ZERO', 'ZONA', 'ARCO', 'ARTE', 'ASNO', 'BALA', 'BECO', 'BIBI', 'BIFE',
            'CABO', 'CACO', 'CALO', 'CANO', 'CAPO', 'CARO', 'CASO', 'CAVA', 'CELA', 'CEPO',
            'CHAO', 'COCO', 'COLO', 'COMO', 'CONE', 'COPO', 'CORO', 'COTA', 'COVA', 'COXA',
            'CUBO', 'DAMA', 'DANO', 'DITA', 'DITO', 'DIVA', 'DOCA', 'DOMO', 'DOSE', 'DOTE',
            'DURO', 'EIXO', 'ERRA', 'FADO', 'FARO', 'FAVA', 'FICO', 'FIGO', 'FINA', 'FINO',
            'FITA', 'FOCO', 'FURO', 'GADO', 'GALO', 'GANA', 'GAZE', 'GENE', 'GIRO', 'GOLE',
            'GOMA', 'GOZO', 'GUIA', 'HINO', 'IOGA', 'JADE', 'JATO', 'JUIZ', 'JURA', 'JURO',
            'LACA', 'LACO', 'LAMA', 'LAPA', 'LAVA', 'LEAL', 'LEIA', 'LEME', 'LENO', 'LERO',
            'LEVA', 'LIDE', 'LIMO', 'LIRA', 'LITE', 'LOCA', 'LONA', 'LOTE', 'LOTO', 'LOUA'
        ];
        
        this.numWords = 4;
        this.maxAttempts = 9;
        this.wordLength = 4;
        this.running = false;
        
        this.reset();
        this.setupControls();
    }

    reset() {
        const shuffled = [...this.words].sort(() => Math.random() - 0.5);
        this.targetWords = shuffled.slice(0, this.numWords).map(w => w.toUpperCase());
        this.solvedWords = new Array(this.numWords).fill(false);
        this.attempts = [];
        this.currentAttempt = '';
        this.gameOver = false;
        this.won = false;
        this.score = 0;
        this.shake = false;
        this.shakeTimer = 0;
        this.revealIndex = -1;
        this.message = '';
        this.messageTimer = 0;
        
        this.updateScoreDisplay();
    }

    setupControls() {
        this.keyHandler = (e) => {
            if (this.gameOver || this.won) {
                if (e.key === ' ' || e.key === 'Enter') {
                    this.reset();
                    this.start();
                }
                return;
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                this.currentAttempt = this.currentAttempt.slice(0, -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.submitAttempt();
            } else if (/^[a-zA-ZçÇ]$/.test(e.key) && this.currentAttempt.length < this.wordLength) {
                let letter = e.key.toUpperCase();
                letter = letter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (letter === 'Ç') letter = 'C';
                this.currentAttempt += letter;
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }

    submitAttempt() {
        if (this.currentAttempt.length !== this.wordLength) {
            this.showMessage('Palavra incompleta!');
            this.shake = true;
            this.shakeTimer = 300;
            return;
        }

        const attempt = this.currentAttempt.toUpperCase();
        this.attempts.push(attempt);
        this.currentAttempt = '';
        
        for (let i = 0; i < this.numWords; i++) {
            if (!this.solvedWords[i] && attempt === this.targetWords[i]) {
                this.solvedWords[i] = true;
            }
        }
        
        this.revealIndex = 0;
        this.revealTimer = setInterval(() => {
            this.revealIndex++;
            if (this.revealIndex >= this.wordLength) {
                clearInterval(this.revealTimer);
                this.checkGameEnd();
            }
        }, 80);
    }

    checkGameEnd() {
        const allSolved = this.solvedWords.every(s => s);
        
        if (allSolved) {
            this.won = true;
            const baseScore = 4000;
            const attemptBonus = (this.maxAttempts - this.attempts.length + 1) * 400;
            this.score = baseScore + attemptBonus;
            this.onScore(this.score);
            this.showMessage('Parabéns! 🎉');
        } else if (this.attempts.length >= this.maxAttempts) {
            this.gameOver = true;
            this.score = 0;
            this.onScore(this.score);
            const unsolved = this.targetWords.filter((_, i) => !this.solvedWords[i]);
            this.showMessage(`Faltou: ${unsolved.slice(0, 2).join(', ')}...`);
        }
        
        this.updateScoreDisplay();
    }

    showMessage(msg) {
        this.message = msg;
        this.messageTimer = 2000;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastUpdate = Date.now();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.revealTimer) {
            clearInterval(this.revealTimer);
        }
        document.removeEventListener('keydown', this.keyHandler);
    }

    gameLoop() {
        if (!this.running) return;

        const now = Date.now();
        const delta = now - this.lastUpdate;
        
        if (this.shake) {
            this.shakeTimer -= delta;
            if (this.shakeTimer <= 0) this.shake = false;
        }
        
        if (this.messageTimer > 0) this.messageTimer -= delta;
        
        this.draw();
        this.lastUpdate = now;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    getLetterStatus(letter, index, attempt, targetWord) {
        if (targetWord[index] === letter) {
            return 'correct';
        } else if (targetWord.includes(letter)) {
            let letterCount = 0;
            let matchedCount = 0;
            
            for (let i = 0; i < targetWord.length; i++) {
                if (targetWord[i] === letter) letterCount++;
            }
            
            for (let i = 0; i < attempt.length; i++) {
                if (attempt[i] === letter && targetWord[i] === letter) {
                    matchedCount++;
                }
            }
            
            let wrongSpotCount = 0;
            for (let i = 0; i < index; i++) {
                if (attempt[i] === letter && targetWord[i] !== letter && targetWord.includes(letter)) {
                    wrongSpotCount++;
                }
            }
            
            if (wrongSpotCount < letterCount - matchedCount) {
                return 'present';
            }
        }
        
        return 'absent';
    }

    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Background
        this.ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        this.ctx.font = 'bold 22px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TERMO QUARTETO', this.canvas.width / 2, 30);
        
        // Subtitle
        this.ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        this.ctx.font = '11px Arial';
        this.ctx.fillText('Adivinhe 4 palavras aleatórias ao mesmo tempo!', this.canvas.width / 2, 48);
        
        // Grid settings - 2x2 layout with all attempts visible in each grid
        const tileSize = 28;
        const gap = 3;
        const gridWidth = this.wordLength * tileSize + (this.wordLength - 1) * gap;
        const gridHeight = this.maxAttempts * tileSize + (this.maxAttempts - 1) * gap;
        const gridSpacingX = 20;
        const gridSpacingY = 15;
        const totalWidth = 2 * gridWidth + gridSpacingX;
        const totalHeight = 2 * gridHeight + gridSpacingY;
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = 55;
        
        // Draw grids in 2x2 layout - each grid shows all attempts for its word
        for (let wordIdx = 0; wordIdx < this.numWords; wordIdx++) {
            const gridCol = wordIdx % 2;
            const gridRow = Math.floor(wordIdx / 2);
            const gridStartX = startX + gridCol * (gridWidth + gridSpacingX);
            const gridStartY = startY + gridRow * (gridHeight + gridSpacingY);
            const targetWord = this.targetWords[wordIdx];
            const isSolved = this.solvedWords[wordIdx];
            
            // Show all attempts in each grid
            for (let row = 0; row < this.maxAttempts; row++) {
                const isCurrentRow = row === this.attempts.length && !this.gameOver && !this.won;
                const isCompletedRow = row < this.attempts.length;
                const attempt = isCompletedRow ? this.attempts[row] : (isCurrentRow ? this.currentAttempt : '');
                
                let rowOffsetX = 0;
                if (isCurrentRow && this.shake) {
                    rowOffsetX = Math.sin(Date.now() / 20) * 3;
                }
                
                for (let col = 0; col < this.wordLength; col++) {
                    const x = gridStartX + col * (tileSize + gap) + rowOffsetX;
                    const y = gridStartY + row * (tileSize + gap);
                    const letter = attempt[col] || '';
                    
                    let bgColor, borderColor, textColor;
                    
                    if (isSolved && row >= this.attempts.findIndex(a => a === targetWord)) {
                        if (row === this.attempts.findIndex(a => a === targetWord)) {
                            bgColor = '#22c55e';
                            borderColor = '#16a34a';
                            textColor = '#ffffff';
                        } else {
                            bgColor = isDark ? '#1e293b' : '#ffffff';
                            borderColor = isDark ? '#334155' : '#e2e8f0';
                            textColor = isDark ? '#e2e8f0' : '#1e293b';
                        }
                    } else if (isCompletedRow) {
                        const isRevealed = row < this.attempts.length - 1 || col <= this.revealIndex;
                        
                        if (isRevealed) {
                            const status = this.getLetterStatus(letter, col, attempt, targetWord);
                            
                            if (status === 'correct') {
                                bgColor = '#22c55e';
                                borderColor = '#16a34a';
                            } else if (status === 'present') {
                                bgColor = '#eab308';
                                borderColor = '#ca8a04';
                            } else {
                                bgColor = isDark ? '#475569' : '#94a3b8';
                                borderColor = isDark ? '#334155' : '#64748b';
                            }
                            textColor = '#ffffff';
                        } else {
                            bgColor = isDark ? '#1e293b' : '#ffffff';
                            borderColor = isDark ? '#475569' : '#cbd5e1';
                            textColor = isDark ? '#e2e8f0' : '#1e293b';
                        }
                    } else if (isCurrentRow && letter) {
                        bgColor = isDark ? '#1e293b' : '#ffffff';
                        borderColor = isDark ? '#64748b' : '#94a3b8';
                        textColor = isDark ? '#e2e8f0' : '#1e293b';
                    } else {
                        bgColor = isDark ? '#1e293b' : '#ffffff';
                        borderColor = isDark ? '#334155' : '#e2e8f0';
                        textColor = isDark ? '#e2e8f0' : '#1e293b';
                    }
                    
                    this.ctx.fillStyle = bgColor;
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y, tileSize, tileSize, 3);
                    this.ctx.fill();
                    
                    this.ctx.strokeStyle = borderColor;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    if (letter) {
                        this.ctx.fillStyle = textColor;
                        this.ctx.font = 'bold 14px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(letter, x + tileSize / 2, y + tileSize / 2 + 1);
                    }
                }
            }
            
            // Draw solved indicator
            if (isSolved) {
                this.ctx.fillStyle = '#22c55e';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('✓', gridStartX + gridWidth + 8, gridStartY + gridHeight / 2);
            }
        }
        
        // Draw helper text at bottom
        this.ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Use o teclado para digitar • ENTER para confirmar • BACKSPACE para apagar', this.canvas.width / 2, this.canvas.height - 10);
        
        // Draw message
        if (this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 500);
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
            this.ctx.beginPath();
            this.ctx.roundRect(this.canvas.width / 2 - 120, this.canvas.height / 2 - 20, 240, 40, 8);
            this.ctx.fill();
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.message, this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Game over / Won overlay
        if (this.gameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 26px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? '🎉 PARABÉNS!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
            
            this.ctx.font = '16px Arial';
            if (this.won) {
                this.ctx.fillText(`Você acertou em ${this.attempts.length} tentativas!`, this.canvas.width / 2, this.canvas.height / 2 - 10);
            } else {
                const unsolved = this.targetWords.filter((_, i) => !this.solvedWords[i]);
                this.ctx.fillText(`Palavras: ${unsolved.join(', ')}`, this.canvas.width / 2, this.canvas.height / 2 - 10);
            }
            
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            
            this.ctx.font = '13px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ENTER ou ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const infoEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        const solved = this.solvedWords.filter(s => s).length;
        if (infoEl) infoEl.textContent = `Tentativa ${Math.min(this.attempts.length + 1, this.maxAttempts)}/${this.maxAttempts} | ${solved}/${this.numWords}`;
    }
}

class WordSearchGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 650;
        this.canvas.height = 500;
        
        this.words = [
            ['BICICLETA', 'PEDAL', 'RODA', 'FREIO', 'GUIDAO'],
            ['CAPACETE', 'CORRENTE', 'SELIM', 'PNEU', 'RAIO'],
            ['CICLISTA', 'GARFO', 'CUBO', 'ARO', 'MESA'],
            ['QUADRO', 'CAMBIO', 'MANOPLA', 'BANCO', 'CABO']
        ];
        
        this.gridSize = 12;
        this.cellSize = 32;
        this.running = false;
        this.level = 0;
        this.score = 0;
        
        this.reset();
        this.setupControls();
    }
    
    reset() {
        this.grid = [];
        this.targetWords = this.words[this.level % this.words.length];
        this.foundWords = [];
        this.selection = { start: null, end: null };
        this.selecting = false;
        this.gameOver = false;
        this.won = false;
        
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = '';
            }
        }
        
        this.placeWords();
        this.fillEmptyCells();
        this.updateScoreDisplay();
    }
    
    placeWords() {
        const directions = [
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 1, dy: 1 },
            { dx: 1, dy: -1 }
        ];
        
        this.wordPositions = [];
        
        for (const word of this.targetWords) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const dir = directions[Math.floor(Math.random() * directions.length)];
                const maxX = this.gridSize - (dir.dx > 0 ? word.length : 1);
                const maxY = this.gridSize - (dir.dy > 0 ? word.length : 1);
                const minY = dir.dy < 0 ? word.length - 1 : 0;
                
                const startX = Math.floor(Math.random() * (maxX + 1));
                const startY = minY + Math.floor(Math.random() * (maxY - minY + 1));
                
                let canPlace = true;
                for (let i = 0; i < word.length; i++) {
                    const x = startX + i * dir.dx;
                    const y = startY + i * dir.dy;
                    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
                        canPlace = false;
                        break;
                    }
                    if (this.grid[y][x] !== '' && this.grid[y][x] !== word[i]) {
                        canPlace = false;
                        break;
                    }
                }
                
                if (canPlace) {
                    for (let i = 0; i < word.length; i++) {
                        const x = startX + i * dir.dx;
                        const y = startY + i * dir.dy;
                        this.grid[y][x] = word[i];
                    }
                    this.wordPositions.push({
                        word,
                        start: { x: startX, y: startY },
                        end: { x: startX + (word.length - 1) * dir.dx, y: startY + (word.length - 1) * dir.dy }
                    });
                    placed = true;
                }
                attempts++;
            }
        }
    }
    
    fillEmptyCells() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === '') {
                    this.grid[i][j] = letters[Math.floor(Math.random() * letters.length)];
                }
            }
        }
    }
    
    setupControls() {
        this.mouseDownHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cell = this.getCellFromCoords(x, y);
            if (cell) {
                this.selecting = true;
                this.selection.start = cell;
                this.selection.end = cell;
            }
        };
        
        this.mouseMoveHandler = (e) => {
            if (!this.selecting) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cell = this.getCellFromCoords(x, y);
            if (cell) {
                this.selection.end = cell;
            }
        };
        
        this.mouseUpHandler = (e) => {
            if (this.selecting) {
                this.checkSelection();
                this.selecting = false;
                this.selection = { start: null, end: null };
            }
        };
        
        this.keyHandler = (e) => {
            if ((this.gameOver || this.won) && (e.key === ' ' || e.key === 'Enter')) {
                this.level++;
                this.reset();
                this.start();
            }
        };
        
        this.canvas.addEventListener('mousedown', this.mouseDownHandler);
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.addEventListener('mouseup', this.mouseUpHandler);
        document.addEventListener('keydown', this.keyHandler);
    }
    
    getCellFromCoords(x, y) {
        const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
        const offsetY = 60;
        const col = Math.floor((x - offsetX) / this.cellSize);
        const row = Math.floor((y - offsetY) / this.cellSize);
        if (col >= 0 && col < this.gridSize && row >= 0 && row < this.gridSize) {
            return { x: col, y: row };
        }
        return null;
    }
    
    getSelectedWord() {
        if (!this.selection.start || !this.selection.end) return '';
        
        const dx = Math.sign(this.selection.end.x - this.selection.start.x);
        const dy = Math.sign(this.selection.end.y - this.selection.start.y);
        
        if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return '';
        
        let word = '';
        let x = this.selection.start.x;
        let y = this.selection.start.y;
        const length = Math.max(
            Math.abs(this.selection.end.x - this.selection.start.x),
            Math.abs(this.selection.end.y - this.selection.start.y)
        ) + 1;
        
        for (let i = 0; i < length; i++) {
            if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
                word += this.grid[y][x];
            }
            x += dx;
            y += dy;
        }
        
        return word;
    }
    
    checkSelection() {
        const selectedWord = this.getSelectedWord();
        const reversedWord = selectedWord.split('').reverse().join('');
        
        for (const word of this.targetWords) {
            if ((selectedWord === word || reversedWord === word) && !this.foundWords.includes(word)) {
                this.foundWords.push(word);
                this.score += word.length * 100;
                this.updateScoreDisplay();
                
                if (this.foundWords.length === this.targetWords.length) {
                    this.won = true;
                    this.score += 500;
                    this.onScore(this.score);
                }
            }
        }
    }
    
    start() {
        if (this.running) return;
        this.running = true;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
        this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('keydown', this.keyHandler);
    }
    
    gameLoop() {
        if (!this.running) return;
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        this.ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CAÇA PALAVRAS', this.canvas.width / 2, 30);
        
        const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
        const offsetY = 60;
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const x = offsetX + col * this.cellSize;
                const y = offsetY + row * this.cellSize;
                
                let isSelected = false;
                if (this.selection.start && this.selection.end) {
                    const dx = Math.sign(this.selection.end.x - this.selection.start.x);
                    const dy = Math.sign(this.selection.end.y - this.selection.start.y);
                    const length = Math.max(
                        Math.abs(this.selection.end.x - this.selection.start.x),
                        Math.abs(this.selection.end.y - this.selection.start.y)
                    ) + 1;
                    
                    let sx = this.selection.start.x;
                    let sy = this.selection.start.y;
                    for (let i = 0; i < length; i++) {
                        if (sx === col && sy === row) {
                            isSelected = true;
                            break;
                        }
                        sx += dx;
                        sy += dy;
                    }
                }
                
                let isFound = false;
                for (const wp of this.wordPositions) {
                    if (this.foundWords.includes(wp.word)) {
                        const dx = Math.sign(wp.end.x - wp.start.x);
                        const dy = Math.sign(wp.end.y - wp.start.y);
                        let wx = wp.start.x;
                        let wy = wp.start.y;
                        for (let i = 0; i < wp.word.length; i++) {
                            if (wx === col && wy === row) {
                                isFound = true;
                                break;
                            }
                            wx += dx;
                            wy += dy;
                        }
                    }
                }
                
                if (isFound) {
                    this.ctx.fillStyle = '#22c55e';
                } else if (isSelected) {
                    this.ctx.fillStyle = '#3b82f6';
                } else {
                    this.ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
                }
                
                this.ctx.fillRect(x, y, this.cellSize - 2, this.cellSize - 2);
                this.ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
                this.ctx.strokeRect(x, y, this.cellSize - 2, this.cellSize - 2);
                
                this.ctx.fillStyle = (isSelected || isFound) ? '#ffffff' : (isDark ? '#e2e8f0' : '#1e293b');
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(this.grid[row][col], x + this.cellSize / 2 - 1, y + this.cellSize / 2);
            }
        }
        
        const listY = offsetY + this.gridSize * this.cellSize + 20;
        this.ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Encontre as palavras:', this.canvas.width / 2, listY);
        
        let wordX = (this.canvas.width - this.targetWords.length * 100) / 2 + 50;
        for (const word of this.targetWords) {
            const found = this.foundWords.includes(word);
            this.ctx.fillStyle = found ? '#22c55e' : (isDark ? '#e2e8f0' : '#1e293b');
            this.ctx.font = found ? 'bold 12px Arial' : '12px Arial';
            this.ctx.fillText(found ? `✓ ${word}` : word, wordX, listY + 25);
            wordX += 100;
        }
        
        if (this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎉 PARABÉNS!', this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText(`Você encontrou todas as palavras!`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ENTER ou ESPAÇO para próximo nível', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
    }
    
    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const infoEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (infoEl) infoEl.textContent = `Nível ${this.level + 1} | ${this.foundWords.length}/${this.targetWords.length}`;
    }
}

class CrosswordGame {
    constructor(canvas, onScore, manager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onScore = onScore;
        this.manager = manager;
        
        this.canvas.width = 650;
        this.canvas.height = 550;
        
        this.puzzles = [
            {
                grid: [
                    ['B','I','C','I','C','L','E','T','A','#'],
                    ['#','#','A','#','#','#','#','#','R','#'],
                    ['P','E','D','A','L','#','R','O','D','A'],
                    ['#','#','E','#','#','#','#','#','O','#'],
                    ['F','R','E','I','O','#','C','A','B','O'],
                    ['#','#','I','#','#','#','#','#','#','#'],
                    ['S','E','L','I','M','#','C','U','B','O'],
                    ['#','#','A','#','#','#','#','#','#','#']
                ],
                clues: {
                    across: [
                        { num: 1, clue: 'Veículo de duas rodas', answer: 'BICICLETA', row: 0, col: 0 },
                        { num: 3, clue: 'Onde apoiamos o pé', answer: 'PEDAL', row: 2, col: 0 },
                        { num: 4, clue: 'Parte circular', answer: 'RODA', row: 2, col: 6 },
                        { num: 5, clue: 'Para parar', answer: 'FREIO', row: 4, col: 0 },
                        { num: 6, clue: 'Fio condutor', answer: 'CABO', row: 4, col: 6 },
                        { num: 7, clue: 'Assento', answer: 'SELIM', row: 6, col: 0 },
                        { num: 8, clue: 'Forma geométrica', answer: 'CUBO', row: 6, col: 6 }
                    ],
                    down: [
                        { num: 2, clue: 'Proteção de metal', answer: 'CADEIA', row: 0, col: 2 },
                        { num: 3, clue: 'Parte traseira', answer: 'ARO', row: 0, col: 8 }
                    ]
                }
            }
        ];
        
        this.cellSize = 36;
        this.running = false;
        this.level = 0;
        this.score = 0;
        
        this.reset();
        this.setupControls();
    }
    
    reset() {
        const puzzle = this.puzzles[this.level % this.puzzles.length];
        this.solution = puzzle.grid;
        this.clues = puzzle.clues;
        this.rows = this.solution.length;
        this.cols = this.solution[0].length;
        
        this.userGrid = [];
        for (let i = 0; i < this.rows; i++) {
            this.userGrid[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.userGrid[i][j] = this.solution[i][j] === '#' ? '#' : '';
            }
        }
        
        this.selectedCell = { row: 0, col: 0 };
        while (this.solution[this.selectedCell.row][this.selectedCell.col] === '#') {
            this.selectedCell.col++;
            if (this.selectedCell.col >= this.cols) {
                this.selectedCell.col = 0;
                this.selectedCell.row++;
            }
        }
        
        this.direction = 'across';
        this.gameOver = false;
        this.won = false;
        
        this.updateScoreDisplay();
    }
    
    setupControls() {
        this.keyHandler = (e) => {
            if (this.won) {
                if (e.key === ' ' || e.key === 'Enter') {
                    this.level++;
                    this.reset();
                    this.start();
                }
                return;
            }
            
            const { row, col } = this.selectedCell;
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.moveSelection(-1, 0);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.moveSelection(1, 0);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.moveSelection(0, -1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.moveSelection(0, 1);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.direction = this.direction === 'across' ? 'down' : 'across';
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                if (this.userGrid[row][col] !== '' && this.userGrid[row][col] !== '#') {
                    this.userGrid[row][col] = '';
                } else {
                    if (this.direction === 'across') {
                        this.moveSelection(0, -1);
                    } else {
                        this.moveSelection(-1, 0);
                    }
                    if (this.userGrid[this.selectedCell.row][this.selectedCell.col] !== '#') {
                        this.userGrid[this.selectedCell.row][this.selectedCell.col] = '';
                    }
                }
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                e.preventDefault();
                this.userGrid[row][col] = e.key.toUpperCase();
                
                if (this.direction === 'across') {
                    this.moveSelection(0, 1);
                } else {
                    this.moveSelection(1, 0);
                }
                
                this.checkWin();
            }
        };
        
        this.clickHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const offsetX = 20;
            const offsetY = 50;
            
            const col = Math.floor((x - offsetX) / this.cellSize);
            const row = Math.floor((y - offsetY) / this.cellSize);
            
            if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                if (this.solution[row][col] !== '#') {
                    if (this.selectedCell.row === row && this.selectedCell.col === col) {
                        this.direction = this.direction === 'across' ? 'down' : 'across';
                    } else {
                        this.selectedCell = { row, col };
                    }
                }
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
        this.canvas.addEventListener('click', this.clickHandler);
    }
    
    moveSelection(dRow, dCol) {
        let newRow = this.selectedCell.row + dRow;
        let newCol = this.selectedCell.col + dCol;
        
        while (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
            if (this.solution[newRow][newCol] !== '#') {
                this.selectedCell = { row: newRow, col: newCol };
                return;
            }
            newRow += dRow;
            newCol += dCol;
        }
    }
    
    checkWin() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.solution[i][j] !== '#' && this.userGrid[i][j] !== this.solution[i][j]) {
                    return;
                }
            }
        }
        
        this.won = true;
        this.score += 1000 + this.level * 200;
        this.onScore(this.score);
    }
    
    start() {
        if (this.running) return;
        this.running = true;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.removeEventListener('keydown', this.keyHandler);
        this.canvas.removeEventListener('click', this.clickHandler);
    }
    
    gameLoop() {
        if (!this.running) return;
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    draw() {
        const isDark = document.documentElement.classList.contains('dark');
        
        this.ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CRUZADINHA', this.canvas.width / 2, 30);
        
        const offsetX = 20;
        const offsetY = 50;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = offsetX + col * this.cellSize;
                const y = offsetY + row * this.cellSize;
                const cell = this.solution[row][col];
                
                if (cell === '#') {
                    this.ctx.fillStyle = isDark ? '#1e293b' : '#334155';
                } else {
                    const isSelected = row === this.selectedCell.row && col === this.selectedCell.col;
                    const isCorrect = this.userGrid[row][col] === this.solution[row][col];
                    
                    if (isSelected) {
                        this.ctx.fillStyle = '#3b82f6';
                    } else if (this.userGrid[row][col] && isCorrect) {
                        this.ctx.fillStyle = isDark ? '#166534' : '#dcfce7';
                    } else if (this.userGrid[row][col] && !isCorrect) {
                        this.ctx.fillStyle = isDark ? '#991b1b' : '#fee2e2';
                    } else {
                        this.ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
                    }
                }
                
                this.ctx.fillRect(x, y, this.cellSize - 2, this.cellSize - 2);
                
                if (cell !== '#') {
                    this.ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
                    this.ctx.strokeRect(x, y, this.cellSize - 2, this.cellSize - 2);
                    
                    if (this.userGrid[row][col]) {
                        const isSelected = row === this.selectedCell.row && col === this.selectedCell.col;
                        this.ctx.fillStyle = isSelected ? '#ffffff' : (isDark ? '#e2e8f0' : '#1e293b');
                        this.ctx.font = 'bold 18px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(this.userGrid[row][col], x + this.cellSize / 2 - 1, y + this.cellSize / 2);
                    }
                }
            }
        }
        
        const clueX = offsetX + this.cols * this.cellSize + 30;
        let clueY = offsetY;
        
        this.ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Horizontal:', clueX, clueY);
        clueY += 20;
        
        this.ctx.font = '11px Arial';
        for (const clue of this.clues.across) {
            this.ctx.fillText(`${clue.num}. ${clue.clue}`, clueX, clueY);
            clueY += 16;
        }
        
        clueY += 15;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('Vertical:', clueX, clueY);
        clueY += 20;
        
        this.ctx.font = '11px Arial';
        for (const clue of this.clues.down) {
            this.ctx.fillText(`${clue.num}. ${clue.clue}`, clueX, clueY);
            clueY += 16;
        }
        
        this.ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Use as setas para navegar • Tab para mudar direção • Digite as letras', this.canvas.width / 2, this.canvas.height - 15);
        
        if (this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎉 PARABÉNS!', this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText('Cruzadinha completa!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
            
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('Pressione ENTER ou ESPAÇO para próximo nível', this.canvas.width / 2, this.canvas.height / 2 + 70);
        }
    }
    
    updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const infoEl = document.getElementById('game-phase');
        if (scoreEl) scoreEl.textContent = this.score;
        if (infoEl) infoEl.textContent = `Nível ${this.level + 1}`;
    }
}

window.JogosManager = JogosManager;
