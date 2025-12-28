import { ClientesManager } from './cadastros/clientes.js';
import { BicicletasManager } from './cadastros/bicicletas.js';
import { RegistrosManager } from './registros/registros-diarios.js';
import { ConfiguracaoManager } from './configuracao/configuracao.js';
import { DadosManager } from './dados/dados.js';
import { JogosManager } from './jogos/jogos.js';
import { Storage } from './shared/storage.js';
import { Debug } from './shared/debug.js';
import { Auth } from './shared/auth.js';
import { Usuarios } from './usuarios/usuarios.js';
import { Utils } from './shared/utils.js';

class App {
    constructor() {
        this.data = {
            clients: [],
            registros: [],
            selectedClientId: null,
            activeTab: 'clientes',
            currentDailyRecords: [],
        };
        
        this.elements = {
            clientesTab: document.getElementById('clientes-tab'),
            registrosDiariosTab: document.getElementById('registros-diarios-tab'),
            dadosTab: document.getElementById('dados-tab'),
            configuracaoTab: document.getElementById('configuracao-tab'),
            jogosTab: document.getElementById('jogos-tab'),
            clientesTabContent: document.getElementById('clientes-tab-content'),
            registrosDiariosTabContent: document.getElementById('registros-diarios-tab-content'),
            dadosTabContent: document.getElementById('dados-tab-content'),
            configuracaoTabContent: document.getElementById('configuracao-tab-content'),
            jogosTabContent: document.getElementById('jogos-tab-content'),
        };
    }

    async init() {
        await Auth.init();
        
        if (!Auth.isLoggedIn()) {
            this.showLoginScreen();
            this.setupLoginForm();
            return;
        }

        const session = Auth.getCurrentSession();
        if (session && session.requirePasswordChange) {
            this.showPasswordChangeModal();
            return;
        }
        
        this.showMainApp();
        await this.loadData();
        
        this.clientesManager = new ClientesManager(this);
        this.bicicletasManager = new BicicletasManager(this);
        this.registrosManager = new RegistrosManager(this);
        this.configuracaoManager = new ConfiguracaoManager(this);
        this.dadosManager = new DadosManager(this);
        this.jogosManager = new JogosManager(this);
        this.usuariosManager = Usuarios;
        
        this.clientesManager.renderClientList();
        this.addEventListeners();
        this.updateUserInfo();
        this.applyPermissions();
        
        this.registrosManager.elements.dailyRecordsDateInput.value = new Date().toISOString().split('T')[0];
        this.registrosManager.renderDailyRecords();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    showLoginScreen() {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
    }

    showMainApp() {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
    }

    updateUserInfo() {
        const session = Auth.getCurrentSession();
        if (session) {
            const userInfoEl = document.getElementById('user-info');
            if (userInfoEl) {
                userInfoEl.textContent = session.nome;
            }
        }
    }

    applyPermissions() {
        const session = Auth.getCurrentSession();
        if (!session) return;

        const clientesTab = document.getElementById('clientes-tab');
        if (clientesTab && !Auth.hasPermission('clientes', 'ver')) {
            clientesTab.classList.add('hidden');
        }

        const registrosDiariosTab = document.getElementById('registros-diarios-tab');
        if (registrosDiariosTab && !Auth.hasPermission('registros', 'ver')) {
            registrosDiariosTab.classList.add('hidden');
        }

        const dadosTab = document.getElementById('dados-tab');
        if (dadosTab && !Auth.hasPermission('dados', 'ver')) {
            dadosTab.classList.add('hidden');
        }

        const configuracaoTab = document.getElementById('configuracao-tab');
        if (configuracaoTab && !Auth.hasPermission('configuracao', 'ver')) {
            configuracaoTab.classList.add('hidden');
        }

        const usuariosTab = document.getElementById('usuarios-tab');
        if (usuariosTab) {
            if (Auth.hasPermission('configuracao', 'gerenciarUsuarios')) {
                usuariosTab.classList.remove('hidden');
            } else {
                usuariosTab.classList.add('hidden');
            }
        }

        const jogosTab = document.getElementById('jogos-tab');
        if (jogosTab) {
            if (Auth.hasPermission('jogos', 'ver')) {
                jogosTab.classList.remove('hidden');
            } else {
                jogosTab.classList.add('hidden');
            }
        }

        this.selectFirstVisibleTab();

        if (this.clientesManager) {
            this.clientesManager.applyPermissionsToUI();
        }
        if (this.registrosManager) {
            this.registrosManager.applyPermissionsToUI();
        }
        if (this.configuracaoManager) {
            this.configuracaoManager.applyPermissionsToUI();
        }
        if (this.dadosManager) {
            this.dadosManager.applyPermissionsToUI();
        }
    }

    selectFirstVisibleTab() {
        const tabs = ['clientes', 'registros-diarios', 'dados', 'configuracao', 'usuarios', 'jogos'];
        const permissions = {
            'clientes': () => Auth.hasPermission('clientes', 'ver'),
            'registros-diarios': () => Auth.hasPermission('registros', 'ver'),
            'dados': () => Auth.hasPermission('dados', 'ver'),
            'configuracao': () => Auth.hasPermission('configuracao', 'ver'),
            'usuarios': () => Auth.hasPermission('configuracao', 'gerenciarUsuarios'),
            'jogos': () => Auth.hasPermission('jogos', 'ver')
        };

        for (const tabName of tabs) {
            if (permissions[tabName]()) {
                this.switchTab(tabName);
                break;
            }
        }
    }

    handleLogout() {
        Auth.logout();
        window.location.reload();
    }

    addEventListeners() {
        this.elements.clientesTab.addEventListener('click', () => this.switchTab('clientes'));
        this.elements.registrosDiariosTab.addEventListener('click', () => this.switchTab('registros-diarios'));
        this.elements.dadosTab.addEventListener('click', () => this.switchTab('dados'));
        this.elements.configuracaoTab.addEventListener('click', () => this.switchTab('configuracao'));
        
        const usuariosTab = document.getElementById('usuarios-tab');
        if (usuariosTab) {
            usuariosTab.addEventListener('click', () => this.switchTab('usuarios'));
        }

        if (this.elements.jogosTab) {
            this.elements.jogosTab.addEventListener('click', () => this.switchTab('jogos'));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';

        try {
            const result = await Auth.login(username, password);
            if (result.success) {
                window.location.reload();
            } else {
                errorEl.textContent = result.message;
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        } catch (error) {
            errorEl.textContent = 'Erro ao fazer login. Tente novamente.';
            errorEl.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    }

    showPasswordChangeModal() {
        const session = Auth.getCurrentSession();
        const html = `
            <div id="password-change-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                    <h2 class="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Mudança de Senha Obrigatória</h2>
                    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">Por segurança, você deve alterar sua senha antes de continuar.</p>
                    <form id="password-change-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nova Senha</label>
                            <input type="password" id="new-password" required minlength="6" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white">
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Mínimo de 6 caracteres</p>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirmar Nova Senha</label>
                            <input type="password" id="confirm-password" required minlength="6" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white">
                        </div>
                        <div id="password-change-error" class="hidden text-red-600 dark:text-red-400 text-sm mb-3"></div>
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                                Alterar Senha
                            </button>
                            <button type="button" id="modal-logout-btn" class="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                Sair
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('password-change-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorEl = document.getElementById('password-change-error');

            if (newPassword !== confirmPassword) {
                errorEl.textContent = 'As senhas não coincidem';
                errorEl.classList.remove('hidden');
                return;
            }

            if (newPassword.length < 6) {
                errorEl.textContent = 'A senha deve ter no mínimo 6 caracteres';
                errorEl.classList.remove('hidden');
                return;
            }

            const result = await Auth.changePassword(session.userId, newPassword);
            if (result.success) {
                document.getElementById('password-change-modal').remove();
                window.location.reload();
            } else {
                errorEl.textContent = result.message;
                errorEl.classList.remove('hidden');
            }
        });

        document.getElementById('modal-logout-btn').addEventListener('click', () => {
            Auth.logout();
            window.location.reload();
        });
    }

    async loadData() {
        const migrated = Storage.migrateOldData();
        if (migrated) {
            this.data.clients = migrated.clients;
            this.data.registros = migrated.registros;
        } else {
            this.data.clients = await Storage.loadClients();
            this.data.registros = await Storage.loadRegistros();
        }
        
        let needsSave = false;
        this.data.clients.forEach(client => {
            if (!client.categoria) {
                client.categoria = '';
                needsSave = true;
            }
            if (!client.comentarios) {
                client.comentarios = [];
                needsSave = true;
            }
        });
        
        if (needsSave) {
            await Storage.saveClients(this.data.clients);
        }
    }

    switchTab(tabName) {
        this.data.activeTab = tabName;
        
        const tabs = {
            clientes: { btn: this.elements.clientesTab, content: this.elements.clientesTabContent },
            'registros-diarios': { btn: this.elements.registrosDiariosTab, content: this.elements.registrosDiariosTabContent },
            'dados': { btn: this.elements.dadosTab, content: this.elements.dadosTabContent },
            'configuracao': { btn: this.elements.configuracaoTab, content: this.elements.configuracaoTabContent },
            'usuarios': { btn: document.getElementById('usuarios-tab'), content: document.getElementById('usuarios-tab-content') },
            'jogos': { btn: this.elements.jogosTab, content: this.elements.jogosTabContent },
        };

        Object.values(tabs).forEach(tab => {
            if (tab.btn && tab.content) {
                tab.btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400', 'dark:border-blue-400');
                tab.btn.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-700', 'hover:border-slate-300');
                tab.content.classList.add('hidden');
            }
        });

        const active = tabs[tabName];
        if (active && active.btn && active.content) {
            active.btn.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400', 'dark:border-blue-400');
            active.btn.classList.remove('border-transparent', 'text-slate-500', 'hover:text-slate-700', 'hover:border-slate-300');
            active.content.classList.remove('hidden');
        }

        if (tabName === 'registros-diarios') {
            this.registrosManager.renderDailyRecords();
        } else if (tabName === 'dados') {
            lucide.createIcons();
        } else if (tabName === 'usuarios') {
            this.usuariosManager.init();
        } else if (tabName === 'jogos') {
            this.jogosManager.init();
            lucide.createIcons();
        }
    }

    toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        const modalContent = modal.querySelector('.modal-content');
        if (show) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('opacity-100');
                modalContent.classList.replace('scale-95', 'scale-100');
            }, 10);
        } else {
            modal.classList.remove('opacity-100');
            modalContent.classList.replace('scale-100', 'scale-95');
            setTimeout(() => { modal.classList.add('hidden'); }, 300);
        }
    }

    openCommentsModal(clientId, refreshCallback) {
        const client = this.data.clients.find(c => c.id === clientId);
        if (!client) return;

        const modal = document.getElementById('comments-modal');
        const clientName = document.getElementById('comments-modal-client-name');
        const clientCpf = document.getElementById('comments-modal-client-cpf');
        const commentsList = document.getElementById('comments-modal-list');
        const commentInput = document.getElementById('comments-modal-input');
        const addCommentBtn = document.getElementById('comments-modal-add-btn');
        const closeBtn = document.getElementById('close-comments-modal-btn');

        if (!modal || !clientName || !clientCpf || !commentsList || !commentInput || !addCommentBtn || !closeBtn) {
            console.error('Comments modal elements not found');
            return;
        }

        clientName.textContent = client.nome.replace(/^"|"$/g, '');
        clientCpf.textContent = Utils.formatCPF(client.cpf) + (client.telefone ? ' • ' + Utils.formatTelefone(client.telefone) : '');

        const renderCommentsList = () => {
            const comentarios = client.comentarios || [];
            const currentSession = Auth.getCurrentSession();
            const currentUsername = currentSession?.username || '';
            const canEditClients = Auth.hasPermission('clientes', 'editar');

            if (comentarios.length === 0) {
                commentsList.innerHTML = '<p class="text-sm text-slate-400 dark:text-slate-400 text-center py-3">Nenhum comentário adicionado</p>';
            } else {
                commentsList.innerHTML = comentarios.map(comment => {
                    const commentDate = new Date(comment.data);
                    const isOwner = currentUsername && comment.usuario === currentUsername;
                    const canDeleteComment = isOwner || canEditClients;
                    return `
                        <div class="flex gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                            <div class="flex-shrink-0">
                                <div class="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <i data-lucide="user" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                                </div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between mb-1">
                                    <p class="text-xs font-medium text-amber-700 dark:text-amber-200">${comment.usuario}</p>
                                    <div class="flex items-center gap-2">
                                        <p class="text-xs text-amber-600 dark:text-amber-400">${commentDate.toLocaleDateString('pt-BR')} ${commentDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</p>
                                        ${canDeleteComment ? `
                                        <button class="delete-modal-comment-btn text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" data-comment-id="${comment.id}" title="Excluir comentário">
                                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <p class="text-sm text-slate-700 dark:text-slate-100 break-words">${comment.texto}</p>
                            </div>
                        </div>
                    `;
                }).join('');

                lucide.createIcons();

                commentsList.querySelectorAll('.delete-modal-comment-btn').forEach(btn => {
                    btn.onclick = () => {
                        const commentId = btn.dataset.commentId;
                        this.clientesManager.deleteComment(client.id, commentId);
                        renderCommentsList();
                        if (refreshCallback) refreshCallback();
                    };
                });
            }
        };

        renderCommentsList();

        const addCommentHandler = () => {
            const comentario = commentInput.value.trim();
            if (comentario) {
                this.clientesManager.addComment(client.id, comentario);
                commentInput.value = '';
                renderCommentsList();
                if (refreshCallback) refreshCallback();
            }
        };

        addCommentBtn.onclick = addCommentHandler;
        
        commentInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCommentHandler();
            }
        };

        closeBtn.onclick = () => {
            this.toggleModal('comments-modal', false);
        };

        this.toggleModal('comments-modal', true);
        lucide.createIcons();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Debug.init();
    lucide.createIcons();
    window.app = new App();
    window.app.init();
});
