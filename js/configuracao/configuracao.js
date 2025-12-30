import { Storage } from '../shared/storage.js';
import { Utils } from '../shared/utils.js';
import { Modals } from '../shared/modals.js';
import { Auth } from '../shared/auth.js';

export class ConfiguracaoManager {
    constructor(app) {
        if (typeof value !== 'string') return value;
        let sanitized = value.trim();
        sanitized = sanitized.replace(/^["']+|["']+$/g, '');
        sanitized = sanitized.replace(/["']/g, '');
        return sanitized.trim();
    }

    escapeHtmlAttr(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    constructor(app) {
        this.app = app;
        this.elements = {
            themeRadios: document.querySelectorAll('input[name="theme"]'),
            globalSearch: document.getElementById('global-search'),
            globalSearchResults: document.getElementById('global-search-results'),
            importFile: document.getElementById('import-file'),
            importBtn: document.getElementById('import-btn'),
            importStatus: document.getElementById('import-status'),
            exportExcelBtn: document.getElementById('export-excel-btn'),
            exportCsvBtn: document.getElementById('export-csv-config-btn'),
            exportDataInicio: document.getElementById('export-data-inicio'),
            exportDataFim: document.getElementById('export-data-fim'),
            exportSystemExcelBtn: document.getElementById('export-system-excel-btn'),
            exportSystemCsvBtn: document.getElementById('export-system-csv-btn'),
            exportSystemDataInicio: document.getElementById('export-system-data-inicio'),
            exportSystemDataFim: document.getElementById('export-system-data-fim'),
            importSystemFile: document.getElementById('import-system-file'),
            importSystemBtn: document.getElementById('import-system-btn'),
            importSystemStatus: document.getElementById('import-system-status'),
            historicoOrganizado: document.getElementById('historico-organizado'),
            historicoSummary: document.getElementById('historico-summary'),
        };
        this.expandedYears = new Set();
        this.expandedMonths = new Set();
        this.init();
    }

    init() {
        this.cleanupCategoriesWithQuotes();
        this.addEventListeners();
        this.setupSystemThemeListener();
        this.loadThemePreference();
        this.renderHistoricoOrganizado();
        
        // Pequeno atraso para garantir que o Storage carregou tudo (especialmente se houver async no futuro)
        setTimeout(() => {
            this.renderCategorias();
        }, 100);
    }

    cleanupCategoriesWithQuotes() {
        const categorias = Storage.loadCategorias();
        const clientes = Storage.loadClientsSync();
        let categoriasChanged = false;
        let clientesChanged = false;
        
        const newCategorias = {};
        Object.entries(categorias).forEach(([nome, emoji]) => {
            const cleanName = this.sanitizeCategory(nome);
            if (cleanName && cleanName !== nome) {
                newCategorias[cleanName] = emoji;
                categoriasChanged = true;
            } else if (cleanName) {
                newCategorias[cleanName] = emoji;
            }
        });
        
        if (categoriasChanged) {
            Storage.saveCategorias(newCategorias);
        }
        
        const updatedClientes = clientes.map(cliente => {
            let updatedClient = { ...cliente };
            let changed = false;
            
            if (cliente.nome) {
                const cleanNome = this.sanitizeCategory(cliente.nome);
                if (cleanNome !== cliente.nome) {
                    updatedClient.nome = cleanNome;
                    changed = true;
                }
            }
            
            if (cliente.categoria) {
                const cleanCategoria = this.sanitizeCategory(cliente.categoria);
                if (cleanCategoria !== cliente.categoria) {
                    updatedClient.categoria = cleanCategoria;
                    changed = true;
                }
            }
            
            if (changed) {
                clientesChanged = true;
                return updatedClient;
            }
            return cliente;
        });
        
        if (clientesChanged) {
            Storage.saveClients(updatedClientes);
            if (this.app && this.app.data) {
                this.app.data.clients = updatedClientes;
            }
        }
    }

    loadThemePreference() {
        const savedTheme = localStorage.getItem('themePreference') || 'system';
        
        setTimeout(() => {
            const allRadios = document.querySelectorAll('input[name="theme"]');
            allRadios.forEach(radio => {
                radio.checked = radio.value === savedTheme;
            });
            
            this.updateThemeLabels(savedTheme);
            this.applyTheme(savedTheme);
        }, 100);
    }

    setupSystemThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            const currentPreference = localStorage.getItem('themePreference');
            if (currentPreference === 'system') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    addEventListeners() {
        setTimeout(() => {
            document.querySelectorAll('input[name="theme"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.handleThemeChange(e.target.value);
                });
            });
        }, 50);

        this.elements.globalSearch.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            this.handleGlobalSearch(e.target.value);
        });

        this.elements.importFile.addEventListener('change', (e) => {
            this.elements.importBtn.disabled = !e.target.files.length;
        });

        this.elements.importBtn.addEventListener('click', () => this.handleImport());
        this.elements.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        this.elements.exportCsvBtn.addEventListener('click', () => this.exportToCSV());

        if (this.elements.importSystemFile) {
            this.elements.importSystemFile.addEventListener('change', (e) => {
                this.elements.importSystemBtn.disabled = !e.target.files.length;
            });
        }

        if (this.elements.importSystemBtn) {
            this.elements.importSystemBtn.addEventListener('click', () => this.handleSystemImport());
        }
        
        if (this.elements.exportSystemExcelBtn) {
            this.elements.exportSystemExcelBtn.addEventListener('click', () => this.exportSystemToExcel());
        }
        
        if (this.elements.exportSystemCsvBtn) {
            this.elements.exportSystemCsvBtn.addEventListener('click', () => this.exportSystemToCSV());
        }

        const customThemeBtn = document.getElementById('custom-theme-btn');
        if (customThemeBtn) {
            customThemeBtn.addEventListener('click', () => this.openCustomThemeModal());
        }

        const addCategoriaBtn = document.getElementById('add-categoria-btn');
        const novaCategoriaInput = document.getElementById('nova-categoria');
        
        if (addCategoriaBtn) {
            addCategoriaBtn.addEventListener('click', () => this.addCategoria());
        }
        
        if (novaCategoriaInput) {
            novaCategoriaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addCategoria();
                }
            });
        }
    }

    getIconName(iconNameOrValue) {
        // If it's already a valid icon name (string without emojis), return it
        // Otherwise default to 'circle'
        if (typeof iconNameOrValue === 'string' && iconNameOrValue.length > 1 && !/[\u{1F300}-\u{1F9FF}]/u.test(iconNameOrValue)) {
            return iconNameOrValue;
        }
        return 'circle';
    }

    renderCategorias() {
        const categoriasList = document.getElementById('categorias-list');
        if (!categoriasList) return;

        let categorias = Storage.loadCategorias();
        
        // Garantir que categorias seja um objeto válido
        if (!categorias || typeof categorias !== 'object' || Array.isArray(categorias)) {
            console.error('Categorias inválidas carregadas:', categorias);
            categorias = {};
        }
        
        const entries = Object.entries(categorias);
        if (entries.length === 0) {
            categoriasList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhuma categoria cadastrada</p>';
            this.renderCategoriasStats();
            return;
        }

        categoriasList.innerHTML = entries.map(([nome, iconName]) => {
            const escapedNome = this.escapeHtmlAttr(nome);
            return `
            <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                <div class="flex items-center gap-2">
                    <i data-lucide="${iconName}" class="w-5 h-5 text-slate-700 dark:text-slate-300"></i>
                    <span class="text-sm font-medium text-slate-800 dark:text-slate-200">${nome}</span>
                </div>
                <div class="flex gap-2">
                    <button class="edit-categoria-btn text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" data-categoria="${escapedNome}">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-categoria-btn text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors" data-categoria="${escapedNome}">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');

        lucide.createIcons();

        categoriasList.querySelectorAll('.edit-categoria-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoria = btn.dataset.categoria;
                this.editCategoria(categoria);
            });
        });

        categoriasList.querySelectorAll('.delete-categoria-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoria = btn.dataset.categoria;
                this.deleteCategoria(categoria);
            });
        });

        this.updateCategoryDropdowns();
        this.renderCategoriasStats();
    }

    renderCategoriasStats() {
        const statsContainer = document.getElementById('categorias-stats');
        if (!statsContainer) return;

        let categorias = Storage.loadCategorias();
        
        // Garantir que categorias seja um objeto válido
        if (!categorias || typeof categorias !== 'object' || Array.isArray(categorias)) {
            categorias = {};
        }

        const clientes = Storage.loadClientsSync();
        
        const categoriaCounts = {};
        Object.keys(categorias).forEach(categoria => {
            categoriaCounts[categoria] = 0;
        });
        
        let semCategoria = 0;
        
        Object.values(clientes).forEach(cliente => {
            const categoria = cliente.categoria || '';
            if (categoria && categoria in categoriaCounts) {
                categoriaCounts[categoria]++;
            } else {
                semCategoria++;
            }
        });

        const totalClientes = Object.keys(clientes).length;

        if (totalClientes === 0) {
            statsContainer.innerHTML = `
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <i data-lucide="info" class="w-4 h-4"></i>
                    <span>Nenhum cliente cadastrado</span>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        let statsHTML = '';
        let semCategoriaHTML = '';
        
        if (Object.keys(categorias).length > 0) {
            statsHTML = Object.entries(categoriaCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([nome, count]) => {
                    const iconName = categorias[nome] || 'circle';
                    const percentual = totalClientes > 0 ? ((count / totalClientes) * 100).toFixed(1) : '0.0';
                    const escapedNome = this.escapeHtmlAttr(nome);
                    return `
                        <div class="categoria-stats-row flex items-center justify-between p-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors" data-categoria="${escapedNome}">
                            <div class="flex items-center gap-2">
                                <i data-lucide="${iconName}" class="w-4 h-4 text-slate-700 dark:text-slate-300"></i>
                                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${nome}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">${count}</span>
                                <span class="text-xs text-slate-500 dark:text-slate-500">(${percentual}%)</span>
                            </div>
                        </div>
                    `;
                })
                .join('');

            const semCategoriaPercentual = totalClientes > 0 ? ((semCategoria / totalClientes) * 100).toFixed(1) : '0.0';
            semCategoriaHTML = `
                <div class="categoria-stats-row flex items-center justify-between p-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors pt-2 mt-2 border-t border-slate-300 dark:border-slate-600" data-categoria="">
                    <div class="flex items-center gap-2">
                        <i data-lucide="settings" class="w-4 h-4 text-slate-700 dark:text-slate-300"></i>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Sem categoria</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-600 dark:text-slate-400">${semCategoria}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-500">(${semCategoriaPercentual}%)</span>
                    </div>
                </div>
            `;
        } else {
            semCategoriaHTML = `
                <div class="categoria-stats-row flex items-center justify-between p-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors" data-categoria="">
                    <div class="flex items-center gap-2">
                        <i data-lucide="settings" class="w-4 h-4 text-slate-700 dark:text-slate-300"></i>
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Sem categoria</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-600 dark:text-slate-400">${semCategoria}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-500">(100.0%)</span>
                    </div>
                </div>
            `;
        }

        statsContainer.innerHTML = `
            <div class="space-y-2">
                ${statsHTML}
                ${semCategoriaHTML}
            </div>
        `;
        
        lucide.createIcons();

        statsContainer.querySelectorAll('.categoria-stats-row').forEach(row => {
            row.addEventListener('click', () => {
                const categoria = row.dataset.categoria;
                this.showClientsByCategory(categoria);
            });
        });
    }

    showClientsByCategory(categoria) {
        const clientes = Storage.loadClientsSync();
        let categorias = Storage.loadCategorias();
        
        if (!categorias || typeof categorias !== 'object' || Array.isArray(categorias)) {
            categorias = {};
        }
        
        const clientesFiltrados = clientes.filter(cliente => {
            const clienteCategoria = cliente.categoria || '';
            if (categoria === '') {
                return !clienteCategoria || !(clienteCategoria in categorias);
            }
            return clienteCategoria === categoria;
        });

        const titulo = categoria ? `Clientes: ${categoria}` : 'Clientes: Sem Categoria';
        const iconName = categoria ? (categorias[categoria] || 'settings') : 'settings';
        
        let listaHTML = '';
        
        if (clientesFiltrados.length === 0) {
            listaHTML = `
                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                    <i data-lucide="users" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>Nenhum cliente nesta categoria</p>
                </div>
            `;
        } else {
            listaHTML = `
                <div class="space-y-2 max-h-[400px] overflow-y-auto">
                    ${clientesFiltrados.map(cliente => `
                        <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">${cliente.nome}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400">${Utils.formatCPF(cliente.cpf)} • ${Utils.formatTelefone(cliente.telefone)}</p>
                            </div>
                            <button class="edit-client-categoria-btn p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" data-client-id="${cliente.id}" title="Editar cliente">
                                <i data-lucide="pencil" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const content = `
            <div class="space-y-4">
                <div class="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div class="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <i data-lucide="${iconName}" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                    </div>
                    <div>
                        <p class="text-lg font-semibold text-slate-800 dark:text-slate-200">${categoria || 'Sem Categoria'}</p>
                        <p class="text-sm text-slate-500 dark:text-slate-400">${clientesFiltrados.length} cliente${clientesFiltrados.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                ${listaHTML}
                <div class="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" id="close-clients-categoria-btn" class="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">Fechar</button>
                </div>
            </div>
        `;

        Modals.show(titulo, content);

        const self = this;
        setTimeout(() => {
            lucide.createIcons();

            document.querySelectorAll('.edit-client-categoria-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const clientId = btn.getAttribute('data-client-id');
                    if (!clientId) return;
                    
                    Modals.close();
                    setTimeout(() => {
                        if (self.app && self.app.clientesManager) {
                            self.app.clientesManager.openEditClientModal(clientId);
                        }
                    }, 350);
                });
            });

            const closeBtn = document.getElementById('close-clients-categoria-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => Modals.close());
            }
        }, 50);
    }

    async addCategoria() {
        const input = document.getElementById('nova-categoria');
        const categoria = input.value.trim().toUpperCase();

        if (!categoria) {
            Modals.alert('Por favor, digite um nome para a categoria.', 'Campo vazio');
            return;
        }

        const categorias = Storage.loadCategorias();
        
        if (categoria in categorias) {
            Modals.alert('Esta categoria já existe.', 'Categoria duplicada');
            return;
        }

        const iconName = Storage.getDefaultIcon(categoria);
        categorias[categoria] = iconName;
        await Storage.saveCategorias(categorias);
        input.value = '';
        this.renderCategorias();
    }

    deleteCategoria(categoria) {
        Modals.confirm(
            `Tem certeza que deseja remover a categoria "${categoria}"?`,
            'Confirmar Remoção',
            async () => {
                let categorias = Storage.loadCategorias();
                delete categorias[categoria];
                await Storage.saveCategorias(categorias);
                this.renderCategorias();
            }
        );
    }

    async editCategoria(categoria) {
        const categorias = Storage.loadCategorias();
        const iconAtual = categorias[categoria];
        
        const iconOptions = [
            { icon: 'user', label: 'Usuário' },
            { icon: 'building', label: 'Edifício' },
            { icon: 'utensils', label: 'Restaurante' },
            { icon: 'briefcase', label: 'Trabalho' },
            { icon: 'dumbbell', label: 'Academia' },
            { icon: 'store', label: 'Loja' },
            { icon: 'settings', label: 'Configurações' },
            { icon: 'target', label: 'Alvo' },
            { icon: 'smartphone', label: 'Celular' },
            { icon: 'bar-chart', label: 'Gráfico' },
            { icon: 'wrench', label: 'Ferramenta' },
            { icon: 'palette', label: 'Arte' },
            { icon: 'star', label: 'Destaque' },
            { icon: 'package', label: 'Pacote' },
            { icon: 'rocket', label: 'Rápido' },
            { icon: 'shopping-bag', label: 'Compras' },
            { icon: 'coffee', label: 'Café' },
            { icon: 'heart', label: 'Favorito' },
            { icon: 'truck', label: 'Entrega' },
            { icon: 'home', label: 'Casa' }
        ];
        
        const content = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome da Categoria</label>
                    <input type="text" id="edit-cat-nome" value="${categoria}" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxlength="30">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione um Ícone</label>
                    <div class="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
                        ${iconOptions.map(option => `
                            <button type="button" class="icon-option p-3 rounded-lg border-2 transition-all ${option.icon === iconAtual ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30'} hover:border-blue-500 flex flex-col items-center justify-center gap-1" data-icon="${option.icon}" title="${option.label}">
                                <i data-lucide="${option.icon}" class="w-6 h-6 text-slate-700 dark:text-slate-300"></i>
                                <span class="text-xs text-slate-600 dark:text-slate-400">${option.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="flex gap-2 justify-end pt-4">
                    <button type="button" id="cancel-edit-cat" class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                    <button type="button" id="save-edit-cat" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Salvar</button>
                </div>
            </div>
        `;
        
        Modals.show('Editar Categoria', content);
        
        setTimeout(() => {
            lucide.createIcons();
        }, 0);
        
        let iconSelecionado = iconAtual;
        
        document.querySelectorAll('.icon-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30'));
                btn.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30');
                iconSelecionado = btn.dataset.icon;
            });
        });
        
        document.getElementById('cancel-edit-cat').addEventListener('click', () => {
            Modals.close();
        });
        
        document.getElementById('save-edit-cat').addEventListener('click', async () => {
            const novoNome = document.getElementById('edit-cat-nome').value.trim().toUpperCase();
            
            if (!novoNome) {
                Modals.alert('Por favor, digite um nome para a categoria.', 'Campo vazio');
                return;
            }
            
            if (novoNome !== categoria && novoNome in categorias) {
                Modals.alert('Uma categoria com este nome já existe.', 'Categoria duplicada');
                return;
            }
            
            if (novoNome !== categoria) {
                delete categorias[categoria];
            }
            
            categorias[novoNome] = iconSelecionado;
            await Storage.saveCategorias(categorias);
            Modals.close();
            this.renderCategorias();
        });
    }

    updateCategoryDropdowns() {
        const categorias = Storage.loadCategorias();
        const selectIds = ['categoria', 'edit-client-categoria', 'registro-categoria', 'edit-registro-categoria'];

        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Selecione uma categoria (opcional)</option>' +
                    Object.entries(categorias).map(([nome, iconName]) => {
                        return `<option value="${nome}">${nome}</option>`;
                    }).join('');
                if (currentValue && currentValue in categorias) {
                    select.value = currentValue;
                }
            }
        });
        
        this.updateCustomDropdowns(categorias);
    }

    updateCustomDropdowns(categorias) {
        const dropdownConfigs = [
            { id: 'categoria-dropdown', windowKey: 'categoriaDropdown' },
            { id: 'registro-categoria-dropdown', windowKey: 'registroCategoriaDropdown' },
            { id: 'edit-client-categoria-dropdown', windowKey: 'editClientCategoriaDropdown' },
            { id: 'edit-registro-categoria-dropdown', windowKey: 'editRegistroCategoriaDropdown' }
        ];

        dropdownConfigs.forEach(config => {
            const dropdown = document.getElementById(config.id);
            if (!dropdown) return;

            const menu = dropdown.querySelector('.dropdown-menu');
            if (!menu) return;

            menu.innerHTML = '<div class="dropdown-option" data-value=""><i data-lucide="settings" class="w-4 h-4 inline mr-2"></i>Selecione uma categoria (opcional)</div>' +
                Object.entries(categorias).map(([nome, iconName]) => {
                    return `
                    <div class="dropdown-option" data-value="${nome}">
                        <i data-lucide="${iconName}" class="w-4 h-4 inline mr-2"></i>${nome}
                    </div>
                `;
                }).join('');

            setTimeout(() => {
                lucide.createIcons();
                if (window[config.windowKey]) {
                    window[config.windowKey].init();
                }
            }, 0);
        });
    }

    updateThemeLabels(selectedTheme) {
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            const label = radio.closest('label');
            if (radio.value === selectedTheme) {
                label.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-500', 'dark:border-blue-400');
                label.classList.remove('border-slate-200', 'dark:border-slate-600');
            } else {
                label.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-500', 'dark:border-blue-400');
                label.classList.add('border-slate-200', 'dark:border-slate-600');
            }
        });
    }

    handleThemeChange(theme) {
        this.applyTheme(theme);
        this.updateThemeLabels(theme);
    }

    applyTheme(theme) {
        const htmlElement = document.documentElement;
        
        // Sempre salvar a preferência do usuário
        localStorage.setItem('themePreference', theme);
        
        // Determinar o tema real a ser aplicado
        let realTheme = theme;
        if (theme === 'system') {
            realTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        // Aplicar classe dark apenas se for dark
        if (realTheme === 'dark') {
            htmlElement.classList.add('dark');
        } else {
            htmlElement.classList.remove('dark');
        }

        // Aplica cores customizadas do usuário atual se existirem
        const session = Auth.getCurrentSession();
        const username = session ? session.username : null;
        const storageKey = username ? `customThemeColors_${username}` : 'customThemeColors';
        
        const customColors = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (customColors.primary) {
            document.documentElement.style.setProperty('--color-primary', customColors.primary);
        }
        if (customColors.secondary) {
            document.documentElement.style.setProperty('--color-secondary', customColors.secondary);
        }
        if (customColors.accent) {
            document.documentElement.style.setProperty('--color-accent', customColors.accent);
        }
    }

    openCustomThemeModal() {
        const session = Auth.getCurrentSession();
        const username = session ? session.username : null;
        const storageKey = username ? `customThemeColors_${username}` : 'customThemeColors';
        
        const customColors = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        const themes = [
            { name: 'Padrão (Slate)', primary: '#2563eb', secondary: '#1e40af', accent: '#0ea5e9' },
            { name: 'Oceano', primary: '#0891b2', secondary: '#0369a1', accent: '#06b6d4' },
            { name: 'Floresta', primary: '#16a34a', secondary: '#15803d', accent: '#22c55e' },
            { name: 'Pôr do Sol', primary: '#ea580c', secondary: '#c2410c', accent: '#f97316' },
            { name: 'Ametista', primary: '#a855f7', secondary: '#9333ea', accent: '#d946ef' }
        ];

        const content = `
            <div class="space-y-6">
                <div>
                    <p class="text-sm font-medium text-slate-100 mb-4">Temas Pré-prontos</p>
                    <div class="space-y-2">
                        ${themes.map(t => `
                            <button type="button" class="preset-theme-btn w-full flex items-center gap-4 p-3 rounded-lg border border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-all text-left" data-primary="${t.primary}" data-secondary="${t.secondary}" data-accent="${t.accent}">
                                <div class="flex gap-2">
                                    <div class="w-6 h-6 rounded" style="background-color: ${t.primary}"></div>
                                    <div class="w-6 h-6 rounded" style="background-color: ${t.secondary}"></div>
                                    <div class="w-6 h-6 rounded" style="background-color: ${t.accent}"></div>
                                </div>
                                <span class="text-sm font-medium text-slate-100 flex-1">${t.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-600">
                    <p class="text-sm font-medium text-slate-100 mb-4">Personalizar Cores</p>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <label class="text-xs text-slate-300">Cor Primária</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="primary-color-input" value="${customColors.primary || '#2563eb'}" class="w-10 h-8 p-1 rounded border border-slate-500 bg-slate-700 cursor-pointer">
                                <input type="text" id="primary-color-text" value="${customColors.primary || '#2563eb'}" class="w-20 px-2 py-1 text-xs rounded border border-slate-500 bg-slate-700 text-slate-100" readonly>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <label class="text-xs text-slate-300">Cor Secundária</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="secondary-color-input" value="${customColors.secondary || '#1e40af'}" class="w-10 h-8 p-1 rounded border border-slate-500 bg-slate-700 cursor-pointer">
                                <input type="text" id="secondary-color-text" value="${customColors.secondary || '#1e40af'}" class="w-20 px-2 py-1 text-xs rounded border border-slate-500 bg-slate-700 text-slate-100" readonly>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <label class="text-xs text-slate-300">Cor de Destaque</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="accent-color-input" value="${customColors.accent || '#0ea5e9'}" class="w-10 h-8 p-1 rounded border border-slate-500 bg-slate-700 cursor-pointer">
                                <input type="text" id="accent-color-text" value="${customColors.accent || '#0ea5e9'}" class="w-20 px-2 py-1 text-xs rounded border border-slate-500 bg-slate-700 text-slate-100" readonly>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3 pt-4">
                    <button type="button" id="cancel-theme-btn" class="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded font-medium transition-all">Cancelar</button>
                    <button type="button" id="save-theme-btn" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-lg shadow-blue-500/20 transition-all">Salvar Tema</button>
                </div>
            </div>
        `;

        Modals.show('Personalizar Tema', content);

        setTimeout(() => {
            const primaryInput = document.getElementById('primary-color-input');
            const primaryText = document.getElementById('primary-color-text');
            const secondaryInput = document.getElementById('secondary-color-input');
            const secondaryText = document.getElementById('secondary-color-text');
            const accentInput = document.getElementById('accent-color-input');
            const accentText = document.getElementById('accent-color-text');
            const saveBtn = document.getElementById('save-theme-btn');
            const cancelBtn = document.getElementById('cancel-theme-btn');
            const presetBtns = document.querySelectorAll('.preset-theme-btn');

            // Sincronizar color input com text input
            primaryInput.addEventListener('change', () => { primaryText.value = primaryInput.value; });
            secondaryInput.addEventListener('change', () => { secondaryText.value = secondaryInput.value; });
            accentInput.addEventListener('change', () => { accentText.value = accentInput.value; });

            const saveThemeColors = () => {
                const primary = primaryInput.value;
                const secondary = secondaryInput.value;
                const accent = accentInput.value;
                document.documentElement.style.setProperty('--color-primary', primary);
                document.documentElement.style.setProperty('--color-secondary', secondary);
                document.documentElement.style.setProperty('--color-accent', accent);
                
                const session = Auth.getCurrentSession();
                const username = session ? session.username : null;
                const key = username ? `customThemeColors_${username}` : 'customThemeColors';
                localStorage.setItem(key, JSON.stringify({ primary, secondary, accent }));
                
                Modals.close();
                Modals.alert('Tema salvo com sucesso!', 'Tema Atualizado');
            };

            saveBtn.addEventListener('click', saveThemeColors);
            cancelBtn.addEventListener('click', () => Modals.close());

            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    primaryInput.value = btn.dataset.primary;
                    primaryText.value = btn.dataset.primary;
                    secondaryInput.value = btn.dataset.secondary;
                    secondaryText.value = btn.dataset.secondary;
                    accentInput.value = btn.dataset.accent;
                    accentText.value = btn.dataset.accent;
                });
            });
        }, 50);
    }

    handleGlobalSearch(query) {
        const resultsContainer = this.elements.globalSearchResults;
        
        if (!query.trim()) {
            resultsContainer.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Digite para buscar clientes</p>';
            return;
        }

        const searchTerm = query.toLowerCase();
        const numericSearch = query.replace(/\D/g, '');
        
        const results = this.app.data.clients.filter(client => {
            const name = client.nome.toLowerCase();
            const cpf = client.cpf.replace(/\D/g, '');
            const telefone = client.telefone.replace(/\D/g, '');
            
            const matchesName = name.includes(searchTerm);
            const matchesCPF = numericSearch.length > 0 && cpf.includes(numericSearch);
            const matchesTelefone = numericSearch.length > 0 && telefone.includes(numericSearch);
            
            return matchesName || matchesCPF || matchesTelefone;
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum cliente encontrado para "<span class="font-semibold">' + query + '</span>"</p>';
            return;
        }
        
        const resultCountMsg = `<p class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-3">${results.length} cliente(s) encontrado(s)</p>`;

        resultsContainer.innerHTML = resultCountMsg + results.map(client => `
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div class="cursor-pointer" data-client-id="${client.id}">
                    <p class="font-semibold text-slate-800 dark:text-slate-100">${client.nome}</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${Utils.formatCPF(client.cpf)}</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${Utils.formatTelefone(client.telefone)}</p>
                </div>
                <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 flex gap-2">
                    <button class="export-client-pdf-btn flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1" data-client-id="${client.id}">
                        <i data-lucide="file-text" class="w-3 h-3"></i>
                        Exportar PDF
                    </button>
                    <button class="export-client-excel-btn flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1" data-client-id="${client.id}">
                        <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                        Exportar Excel
                    </button>
                </div>
            </div>
        `).join('');

        resultsContainer.querySelectorAll('[data-client-id]').forEach(el => {
            if (!el.classList.contains('export-client-pdf-btn') && !el.classList.contains('export-client-excel-btn')) {
                el.addEventListener('click', () => {
                    const clientId = el.dataset.clientId;
                    this.app.data.selectedClientId = clientId;
                    this.app.switchTab('clientes');
                    this.app.clientesManager.renderClientDetails(clientId);
                });
            }
        });

        resultsContainer.querySelectorAll('.export-client-pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientId = btn.dataset.clientId;
                this.exportClientRecordsToPDF(clientId);
            });
        });

        resultsContainer.querySelectorAll('.export-client-excel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientId = btn.dataset.clientId;
                this.exportClientRecordsToExcel(clientId);
            });
        });

        lucide.createIcons();
    }

    async handleImport() {
        try {
            Auth.requirePermission('configuracao', 'importar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const file = this.elements.importFile.files[0];
        if (!file) return;

        const statusEl = this.elements.importStatus;
        statusEl.classList.remove('hidden');
        statusEl.innerHTML = '<p class="text-blue-600 dark:text-blue-400">Importando...</p>';

        try {
            const data = await this.readFile(file);
            const imported = this.processImportData(data);
            
            if (imported > 0) {
                Storage.saveClients(this.app.data.clients);
                this.app.clientesManager.renderClientList();
                statusEl.innerHTML = `<p class="text-green-600 dark:text-green-400">✓ ${imported} cliente(s) importado(s) com sucesso!</p>`;
                this.elements.importFile.value = '';
                this.elements.importBtn.disabled = true;
            } else {
                statusEl.innerHTML = '<p class="text-yellow-600 dark:text-yellow-400">Nenhum cliente válido encontrado no arquivo.</p>';
            }
        } catch (error) {
            console.error('Erro ao importar:', error);
            statusEl.innerHTML = `<p class="text-red-600 dark:text-red-400">✗ Erro ao importar: ${error.message}</p>`;
        }

        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 5000);
    }

    sanitizeCsvCell(cell) {
        if (typeof cell !== 'string') return cell;
        
        let sanitized = cell.trim();
        
        if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
            sanitized = sanitized.slice(1, -1);
        }
        
        sanitized = sanitized.replace(/""/g, '"');
        
        return sanitized;
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const isCSV = file.name.endsWith('.csv');

            reader.onload = (e) => {
                try {
                    if (isCSV) {
                        const text = e.target.result;
                        const rows = text.split('\n').map(row => 
                            row.split(',').map(cell => this.sanitizeCsvCell(cell))
                        );
                        resolve(rows);
                    } else {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        resolve(jsonData);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            
            if (isCSV) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    processImportData(rows) {
        let imported = 0;
        const categoriasExistentes = Storage.loadCategorias();
        
        rows.forEach((row, index) => {
            if (index === 0 && (row[0]?.toLowerCase().includes('nome') || row[0]?.toLowerCase().includes('name'))) {
                return;
            }

            if (row.length >= 3 && row[0] && row[2]) {
                const nomeRaw = String(row[0]).trim().toUpperCase();
                const nome = this.sanitizeCategory(nomeRaw);
                const telefoneRaw = String(row[1] || '').trim();
                const telefone = telefoneRaw.replace(/\D/g, '');
                const cpf = String(row[2]).replace(/\D/g, '');
                const categoriaRawValue = row.length >= 4 ? String(row[3] || '').trim().toUpperCase() : '';
                const categoriaRaw = this.sanitizeCategory(categoriaRawValue);
                
                let categoria = '';
                if (categoriaRaw) {
                    if (categoriaRaw in categoriasExistentes) {
                        categoria = categoriaRaw;
                    } else {
                        categoriasExistentes[categoriaRaw] = Storage.getDefaultIcon(categoriaRaw);
                        Storage.saveCategorias(categoriasExistentes);
                        categoria = categoriaRaw;
                    }
                }

                if (nome && cpf && Utils.validateCPF(cpf)) {
                    const exists = this.app.data.clients.some(c => c.cpf.replace(/\D/g, '') === cpf);
                    
                    if (!exists) {
                        const newClient = {
                            id: Utils.generateUUID(),
                            nome: nome,
                            cpf: cpf,
                            telefone: telefone,
                            categoria: categoria,
                            comentarios: [],
                            bicicletas: []
                        };
                        this.app.data.clients.push(newClient);
                        imported++;
                    }
                }
            }
        });

        this.renderCategorias();
        return imported;
    }

    exportToExcel() {
        try {
            Auth.requirePermission('configuracao', 'exportar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const dataInicio = this.elements.exportDataInicio.value;
        const dataFim = this.elements.exportDataFim.value;
        
        const exportData = this.prepareSimpleExportData(dataInicio, dataFim);
        const totalClientes = exportData.length - 1;
        
        if (totalClientes === 0) {
            const periodoMsg = dataInicio || dataFim 
                ? ` no período selecionado` 
                : '';
            Modals.alert(`Nenhum cliente encontrado${periodoMsg} para exportar.`, 'Aviso');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");

        const periodoStr = dataInicio && dataFim 
            ? `${dataInicio}_${dataFim}` 
            : new Date().toISOString().split('T')[0];
        const fileName = `clientes_${periodoStr}.xlsx`;
        
        XLSX.writeFile(wb, fileName);
        
        Modals.alert(`Exportação concluída! ${totalClientes} cliente(s) exportado(s).`);
    }

    exportToCSV() {
        try {
            Auth.requirePermission('configuracao', 'exportar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const dataInicio = this.elements.exportDataInicio.value;
        const dataFim = this.elements.exportDataFim.value;
        
        const exportData = this.prepareSimpleExportData(dataInicio, dataFim);
        const totalClientes = exportData.length - 1;
        
        if (totalClientes === 0) {
            const periodoMsg = dataInicio || dataFim 
                ? ` no período selecionado` 
                : '';
            Modals.alert(`Nenhum cliente encontrado${periodoMsg} para exportar.`, 'Aviso');
            return;
        }

        const csvContent = exportData.map(row => 
            row.map(cell => {
                const cellStr = String(cell);
                const escaped = cellStr.replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const periodoStr = dataInicio && dataFim 
            ? `${dataInicio}_${dataFim}` 
            : new Date().toISOString().split('T')[0];
        const fileName = `clientes_${periodoStr}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Modals.alert(`Exportação concluída! ${totalClientes} cliente(s) exportado(s).`);
    }

    prepareSimpleExportData(dataInicio, dataFim) {
        let clientesToExport = this.app.data.clients;
        
        if (dataInicio || dataFim) {
            const inicio = dataInicio ? new Date(dataInicio) : null;
            const fim = dataFim ? new Date(dataFim) : null;
            
            if (inicio) inicio.setHours(0, 0, 0, 0);
            if (fim) fim.setHours(23, 59, 59, 999);
            
            const filteredRegistros = this.app.data.registros.filter(registro => {
                const dataEntrada = new Date(registro.dataHoraEntrada);
                if (inicio && dataEntrada < inicio) return false;
                if (fim && dataEntrada > fim) return false;
                return true;
            });
            
            const clientIds = new Set(filteredRegistros.map(r => r.clientId));
            clientesToExport = this.app.data.clients.filter(c => clientIds.has(c.id));
        }
        
        const headers = ['Nome', 'Telefone', 'CPF', 'Categoria'];
        const rows = clientesToExport.map(client => [
            client.nome,
            client.telefone || '',
            client.cpf,
            client.categoria || ''
        ]);

        return [headers, ...rows];
    }

    getClientRecords(clientId) {
        const client = this.app.data.clients.find(c => c.id === clientId);
        if (!client) return null;

        const clientRecords = this.app.data.registros.filter(r => r.clientId === clientId);
        
        const recordsWithDetails = clientRecords.map(registro => {
            let bikeModel = 'N/A';
            let bikeBrand = 'N/A';
            let bikeColor = 'N/A';

            if (registro.bikeSnapshot) {
                bikeModel = registro.bikeSnapshot.modelo;
                bikeBrand = registro.bikeSnapshot.marca;
                bikeColor = registro.bikeSnapshot.cor;
            } else {
                const bike = client.bicicletas?.find(b => b.id === registro.bikeId);
                if (bike) {
                    bikeModel = bike.modelo;
                    bikeBrand = bike.marca;
                    bikeColor = bike.cor;
                }
            }

            return {
                ...registro,
                clientName: client.nome,
                clientCPF: client.cpf,
                bikeModel: bikeModel,
                bikeBrand: bikeBrand,
                bikeColor: bikeColor
            };
        });

        recordsWithDetails.sort((a, b) => new Date(b.dataHoraEntrada) - new Date(a.dataHoraEntrada));
        
        return {
            client,
            records: recordsWithDetails
        };
    }

    async exportClientRecordsToPDF(clientId) {
        const data = this.getClientRecords(clientId);
        if (!data || data.records.length === 0) {
            await Modals.showAlert('Nenhum registro de acesso encontrado para este cliente.', 'Atenção');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        let yPos = margin;

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Relatório de Registros de Acesso', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 15;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Informações do Cliente', margin, yPos);
        
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Nome: ${data.client.nome}`, margin + 5, yPos);
        yPos += 5;
        doc.text(`CPF: ${Utils.formatCPF(data.client.cpf)}`, margin + 5, yPos);
        yPos += 5;
        doc.text(`Telefone: ${Utils.formatTelefone(data.client.telefone)}`, margin + 5, yPos);
        yPos += 5;
        doc.text(`Total de Registros: ${data.records.length}`, margin + 5, yPos);

        yPos += 12;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Histórico de Registros', margin, yPos);
        
        yPos += 8;

        data.records.forEach((registro, index) => {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`Registro #${index + 1}`, margin, yPos);
            
            yPos += 6;
            doc.setFont(undefined, 'normal');
            doc.text(`Bicicleta: ${registro.bikeModel} (${registro.bikeBrand} - ${registro.bikeColor})`, margin + 5, yPos);
            
            yPos += 5;
            const entradaDate = new Date(registro.dataHoraEntrada);
            doc.text(`Entrada: ${entradaDate.toLocaleString('pt-BR')}`, margin + 5, yPos);
            
            yPos += 5;
            if (registro.dataHoraSaida) {
                const saidaDate = new Date(registro.dataHoraSaida);
                const statusText = registro.accessRemoved ? 'Acesso Removido' : 'Saída Normal';
                doc.text(`Saída: ${saidaDate.toLocaleString('pt-BR')} (${statusText})`, margin + 5, yPos);
            } else {
                doc.text('Saída: Ainda no estacionamento', margin + 5, yPos);
            }

            yPos += 8;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
            yPos += 2;
        });

        doc.save(`registros_${data.client.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    }

    async exportClientRecordsToExcel(clientId) {
        const data = this.getClientRecords(clientId);
        if (!data || data.records.length === 0) {
            await Modals.showAlert('Nenhum registro de acesso encontrado para este cliente.', 'Atenção');
            return;
        }

        const headers = ['Data/Hora Entrada', 'Data/Hora Saída', 'Status', 'Bicicleta', 'Marca', 'Cor'];
        const rows = data.records.map(registro => {
            const entradaDate = new Date(registro.dataHoraEntrada);
            const saidaDate = registro.dataHoraSaida ? new Date(registro.dataHoraSaida) : null;
            const status = !registro.dataHoraSaida ? 'No estacionamento' : 
                          (registro.accessRemoved ? 'Acesso Removido' : 'Saída Normal');
            
            return [
                entradaDate.toLocaleString('pt-BR'),
                saidaDate ? saidaDate.toLocaleString('pt-BR') : '-',
                status,
                registro.bikeModel,
                registro.bikeBrand,
                registro.bikeColor
            ];
        });

        const clientInfo = [
            ['RELATÓRIO DE REGISTROS DE ACESSO'],
            [],
            ['Cliente:', data.client.nome],
            ['CPF:', Utils.formatCPF(data.client.cpf)],
            ['Telefone:', Utils.formatTelefone(data.client.telefone)],
            ['Total de Registros:', data.records.length],
            ['Gerado em:', new Date().toLocaleString('pt-BR')],
            [],
            headers,
            ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(clientInfo);
        
        ws['!cols'] = [
            { wch: 20 },
            { wch: 20 },
            { wch: 18 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registros");
        
        XLSX.writeFile(wb, `registros_${data.client.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    async renderHistoricoOrganizado() {
        const summary = await Storage.loadStorageSummary();
        const organized = await Storage.getOrganizedRegistros();
        
        if (!summary || summary.totalRegistros === 0) {
            this.elements.historicoOrganizado.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum registro encontrado</p>';
            this.elements.historicoSummary.innerHTML = '';
            return;
        }

        this.elements.historicoSummary.innerHTML = `
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600 dark:text-blue-400"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span class="font-semibold text-slate-700 dark:text-slate-200">Total de Registros: ${summary.totalRegistros}</span>
            </div>
        `;

        const years = Object.keys(organized).sort((a, b) => b - a);
        
        this.elements.historicoOrganizado.innerHTML = years.map(year => {
            const yearData = summary.anos[year];
            const isExpanded = this.expandedYears.has(year);
            
            return `
                <div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div class="folder-header flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" data-year="${year}">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-600 dark:text-yellow-400 transition-transform ${isExpanded ? 'rotate-90' : ''}">
                                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                            </svg>
                            <span class="font-semibold text-slate-800 dark:text-slate-100">${year}</span>
                            <span class="text-xs text-slate-500 dark:text-slate-400">(${yearData.totalMeses} ${yearData.totalMeses === 1 ? 'mês' : 'meses'})</span>
                        </div>
                        <span class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                            ${Object.values(yearData.meses).reduce((sum, m) => sum + m.totalRegistros, 0)} registros
                        </span>
                    </div>
                    <div class="year-content ${isExpanded ? '' : 'hidden'} p-2 space-y-2">
                        ${this.renderMonths(year, organized[year], yearData)}
                    </div>
                </div>
            `;
        }).join('');

        this.attachHistoricoEventListeners();
        lucide.createIcons();
    }

    renderMonths(year, monthsData, summaryData) {
        const months = Object.keys(monthsData).sort((a, b) => b - a);
        
        return months.map(month => {
            const monthInfo = summaryData.meses[month];
            const isExpanded = this.expandedMonths.has(`${year}-${month}`);
            
            return `
                <div class="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <div class="month-header flex items-center justify-between p-2 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" data-year="${year}" data-month="${month}">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600 dark:text-blue-400 transition-transform ${isExpanded ? 'rotate-90' : ''}">
                                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                            </svg>
                            <span class="text-sm font-medium text-slate-700 dark:text-slate-200">${monthInfo.nome}</span>
                            <span class="text-xs text-slate-500 dark:text-slate-400">(${monthInfo.totalDias} ${monthInfo.totalDias === 1 ? 'dia' : 'dias'})</span>
                        </div>
                        <span class="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                            ${monthInfo.totalRegistros}
                        </span>
                    </div>
                    <div class="month-content ${isExpanded ? '' : 'hidden'} p-2 pl-6 space-y-1">
                        ${this.renderDays(year, month, monthsData[month], monthInfo)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderDays(year, month, daysData, monthInfo) {
        const days = Object.keys(daysData).sort((a, b) => b - a);
        const categorias = Storage.loadCategorias();
        
        return days.map(day => {
            const dayCount = monthInfo.dias[day];
            const date = new Date(year, month - 1, day);
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
            
            const registrosDay = daysData[day] || [];
            
            const categoriaRegistros = {};
            const categoriaPernoites = {};
            Object.keys(categorias).forEach(cat => {
                categoriaRegistros[cat] = 0;
                categoriaPernoites[cat] = 0;
            });
            let semCategoriaRegistros = 0;
            let semCategoriaPernoites = 0;
            
            registrosDay.forEach(r => {
                const cat = r.categoria || '';
                const isPernoite = r.pernoite === true;
                
                if (cat && cat in categorias) {
                    if (isPernoite) {
                        categoriaPernoites[cat]++;
                    } else {
                        categoriaRegistros[cat]++;
                    }
                } else if (cat === '') {
                    if (isPernoite) {
                        semCategoriaPernoites++;
                    } else {
                        semCategoriaRegistros++;
                    }
                }
            });
            
            const categoriaRegistrosBadges = Object.entries(categoriaRegistros)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([nome, count]) => {
                    const iconName = categorias[nome] || 'circle';
                    return `<span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1" title="Registros ${nome}"><i data-lucide="${iconName}" class="w-3 h-3"></i> ${count}</span>`;
                })
                .join('');
            
            const semCategoriaRegistrosBadge = semCategoriaRegistros > 0 
                ? `<span class="text-xs px-2 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded flex items-center gap-1" title="Sem categoria"><i data-lucide="settings" class="w-3 h-3"></i> ${semCategoriaRegistros}</span>` 
                : '';
            
            const categoriaPernoitesBadges = Object.entries(categoriaPernoites)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([nome, count]) => {
                    const iconName = categorias[nome] || 'circle';
                    return `<span class="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded flex items-center gap-1" title="Pernoites ${nome}"><i data-lucide="moon" class="w-3 h-3"></i> <i data-lucide="${iconName}" class="w-3 h-3"></i> ${count}</span>`;
                })
                .join('');
            
            const semCategoriaPernoitesBadge = semCategoriaPernoites > 0 
                ? `<span class="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded flex items-center gap-1" title="Pernoites sem categoria"><i data-lucide="moon" class="w-3 h-3"></i> <i data-lucide="settings" class="w-3 h-3"></i> ${semCategoriaPernoites}</span>` 
                : '';
            
            const totalPernoites = Object.values(categoriaPernoites).reduce((sum, c) => sum + c, 0) + semCategoriaPernoites;
            const totalRegistrosNormais = Object.values(categoriaRegistros).reduce((sum, c) => sum + c, 0) + semCategoriaRegistros;
            
            return `
                <div class="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/30 rounded hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 dark:text-slate-400">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                            <line x1="16" x2="16" y1="2" y2="6"/>
                            <line x1="8" x2="8" y1="2" y2="6"/>
                            <line x1="3" x2="21" y1="10" y2="10"/>
                        </svg>
                        <span class="text-sm text-slate-700 dark:text-slate-200">${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400 capitalize">(${dayName})</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap justify-end">
                        ${totalRegistrosNormais > 0 ? `<span class="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium" title="Total de registros normais">${totalRegistrosNormais} ${totalRegistrosNormais === 1 ? 'registro' : 'registros'}</span>` : ''}
                        ${categoriaRegistrosBadges}
                        ${semCategoriaRegistrosBadge}
                        ${totalPernoites > 0 ? `<span class="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded font-medium flex items-center gap-1" title="Total de pernoites"><i data-lucide="moon" class="w-3 h-3"></i> ${totalPernoites}</span>` : ''}
                        ${categoriaPernoitesBadges}
                        ${semCategoriaPernoitesBadge}
                    </div>
                </div>
            `;
        }).join('');
    }

    attachHistoricoEventListeners() {
        document.querySelectorAll('.folder-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const year = e.currentTarget.dataset.year;
                const content = e.currentTarget.nextElementSibling;
                const icon = e.currentTarget.querySelector('svg');
                
                if (this.expandedYears.has(year)) {
                    this.expandedYears.delete(year);
                    content.classList.add('hidden');
                    icon.classList.remove('rotate-90');
                } else {
                    this.expandedYears.add(year);
                    content.classList.remove('hidden');
                    icon.classList.add('rotate-90');
                }
            });
        });

        document.querySelectorAll('.month-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const year = e.currentTarget.dataset.year;
                const month = e.currentTarget.dataset.month;
                const key = `${year}-${month}`;
                const content = e.currentTarget.nextElementSibling;
                const icon = e.currentTarget.querySelector('svg');
                
                if (this.expandedMonths.has(key)) {
                    this.expandedMonths.delete(key);
                    content.classList.add('hidden');
                    icon.classList.remove('rotate-90');
                } else {
                    this.expandedMonths.add(key);
                    content.classList.remove('hidden');
                    icon.classList.add('rotate-90');
                }
            });
        });
    }

    exportSystemToExcel() {
        try {
            Auth.requirePermission('configuracao', 'exportar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const dataInicio = this.elements.exportSystemDataInicio?.value || '';
        const dataFim = this.elements.exportSystemDataFim?.value || '';
        
        const systemData = this.prepareSystemExportData(dataInicio, dataFim);
        const wb = XLSX.utils.book_new();

        if (systemData.clientes && systemData.clientes.length > 1) {
            const clientesWs = XLSX.utils.aoa_to_sheet(systemData.clientes);
            XLSX.utils.book_append_sheet(wb, clientesWs, "Clientes");
        }

        if (systemData.bicicletas && systemData.bicicletas.length > 1) {
            const bicicletasWs = XLSX.utils.aoa_to_sheet(systemData.bicicletas);
            XLSX.utils.book_append_sheet(wb, bicicletasWs, "Bicicletas");
        }

        if (systemData.categorias && systemData.categorias.length > 1) {
            const categoriasWs = XLSX.utils.aoa_to_sheet(systemData.categorias);
            XLSX.utils.book_append_sheet(wb, categoriasWs, "Categorias");
        }

        if (systemData.registros && systemData.registros.length > 1) {
            const registrosWs = XLSX.utils.aoa_to_sheet(systemData.registros);
            XLSX.utils.book_append_sheet(wb, registrosWs, "Registros");
        }

        if (systemData.usuarios && systemData.usuarios.length > 1) {
            const usuariosWs = XLSX.utils.aoa_to_sheet(systemData.usuarios);
            XLSX.utils.book_append_sheet(wb, usuariosWs, "Usuarios");
        }

        const periodoStr = dataInicio && dataFim 
            ? `${dataInicio}_${dataFim}` 
            : new Date().toISOString().split('T')[0];
        const fileName = `backup_sistema_${periodoStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        const periodoMsg = dataInicio || dataFim 
            ? ` (período: ${dataInicio || 'início'} até ${dataFim || 'hoje'})` 
            : '';
        Modals.alert(`Backup exportado com sucesso${periodoMsg} para ${fileName}`);
    }

    exportSystemToCSV() {
        try {
            Auth.requirePermission('configuracao', 'exportar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const dataInicio = this.elements.exportSystemDataInicio?.value || '';
        const dataFim = this.elements.exportSystemDataFim?.value || '';
        
        const systemData = this.prepareSystemExportData(dataInicio, dataFim);
        
        const sections = [];
        if (systemData.clientes && systemData.clientes.length > 1) {
            sections.push({ name: 'Clientes', data: systemData.clientes });
        }
        if (systemData.bicicletas && systemData.bicicletas.length > 1) {
            sections.push({ name: 'Bicicletas', data: systemData.bicicletas });
        }
        if (systemData.categorias && systemData.categorias.length > 1) {
            sections.push({ name: 'Categorias', data: systemData.categorias });
        }
        if (systemData.registros && systemData.registros.length > 1) {
            sections.push({ name: 'Registros', data: systemData.registros });
        }
        if (systemData.usuarios && systemData.usuarios.length > 1) {
            sections.push({ name: 'Usuarios', data: systemData.usuarios });
        }

        let csvContent = '';
        sections.forEach((section, index) => {
            if (index > 0) csvContent += '\n\n';
            csvContent += `=== ${section.name} ===\n`;
            csvContent += section.data.map(row => 
                row.map(cell => {
                    const cellStr = String(cell);
                    const escaped = cellStr.replace(/"/g, '""');
                    return `"${escaped}"`;
                }).join(',')
            ).join('\n');
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const periodoStr = dataInicio && dataFim 
            ? `${dataInicio}_${dataFim}` 
            : new Date().toISOString().split('T')[0];
        const fileName = `backup_sistema_${periodoStr}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        const periodoMsg = dataInicio || dataFim 
            ? ` (período: ${dataInicio || 'início'} até ${dataFim || 'hoje'})` 
            : '';
        Modals.alert(`Backup exportado com sucesso${periodoMsg} para ${fileName}`);
    }

    prepareSystemExportData(dataInicio = '', dataFim = '') {
        let registrosFiltrados = this.app.data.registros;
        let clienteIds = new Set();
        
        if (dataInicio || dataFim) {
            registrosFiltrados = this.app.data.registros.filter(registro => {
                const dataEntrada = Utils.getLocalDateString(registro.dataHoraEntrada);
                if (dataInicio && dataEntrada < dataInicio) return false;
                if (dataFim && dataEntrada > dataFim) return false;
                return true;
            });
            
            registrosFiltrados.forEach(reg => clienteIds.add(reg.clientId));
        }
        
        const clientesFiltrados = (dataInicio || dataFim) 
            ? this.app.data.clients.filter(c => clienteIds.has(c.id))
            : this.app.data.clients;

        const clientesHeaders = ['ID', 'Nome', 'CPF', 'Telefone', 'Categoria', 'Comentários', 'Bicicletas'];
        const clientesRows = clientesFiltrados.map(client => [
            client.id,
            client.nome,
            client.cpf,
            client.telefone || '',
            client.categoria || '',
            client.comentarios ? JSON.stringify(client.comentarios) : '[]',
            client.bicicletas ? JSON.stringify(client.bicicletas) : '[]'
        ]);

        const bicicletasHeaders = ['ID', 'Cliente ID', 'Marca', 'Modelo', 'Cor'];
        const bicicletasRows = [];
        clientesFiltrados.forEach(client => {
            if (client.bicicletas && client.bicicletas.length > 0) {
                client.bicicletas.forEach(bike => {
                    bicicletasRows.push([
                        bike.id,
                        client.id,
                        bike.marca,
                        bike.modelo,
                        bike.cor
                    ]);
                });
            }
        });

        const categoriasHeaders = ['Nome', 'Emoji'];
        const categorias = Storage.loadCategorias();
        const categoriasRows = Object.entries(categorias).map(([nome, emoji]) => [
            nome,
            emoji
        ]);

        const registrosHeaders = ['ID', 'Cliente ID', 'Bicicleta ID', 'Categoria', 'Data Entrada', 'Data Saída', 'Pernoite', 'Acesso Removido', 'Registro Original ID', 'Bike Snapshot'];
        const registrosRows = registrosFiltrados.map(registro => [
            registro.id,
            registro.clientId,
            registro.bikeId,
            registro.categoria || '',
            registro.dataHoraEntrada,
            registro.dataHoraSaida || '',
            registro.pernoite ? 'Sim' : 'Não',
            registro.acessoRemovido ? 'Sim' : 'Não',
            registro.registroOriginalId || '',
            registro.bikeSnapshot ? JSON.stringify(registro.bikeSnapshot) : '{}'
        ]);

        const usuarios = Auth.getAllUsers();
        const usuariosHeaders = ['ID', 'Username', 'Password', 'Nome', 'Tipo', 'Ativo', 'Permissões'];
        const usuariosRows = usuarios.map(user => [
            user.id,
            user.username,
            user.password,
            user.nome,
            user.tipo,
            user.ativo ? 'Sim' : 'Não',
            JSON.stringify(user.permissoes)
        ]);

        return {
            clientes: [clientesHeaders, ...clientesRows],
            bicicletas: [bicicletasHeaders, ...bicicletasRows],
            categorias: [categoriasHeaders, ...categoriasRows],
            registros: [registrosHeaders, ...registrosRows],
            usuarios: [usuariosHeaders, ...usuariosRows]
        };
    }

    mergeSystemData(importedData) {
        const stats = {
            clientesNovos: 0,
            clientesMesclados: 0,
            bicicletasAdicionadas: 0,
            registrosNovos: 0,
            usuariosNovos: 0,
            categoriasImportadas: 0
        };

        const existingClients = this.app.data.clients;
        const existingRegistros = this.app.data.registros;
        const existingUsuarios = Auth.getAllUsers();

        const clientesByCPF = new Map();
        existingClients.forEach(client => {
            const cpfClean = client.cpf.replace(/\D/g, '');
            clientesByCPF.set(cpfClean, client);
        });

        importedData.clients.forEach(importedClient => {
            const cpfClean = importedClient.cpf.replace(/\D/g, '');
            const existingClient = clientesByCPF.get(cpfClean);

            if (existingClient) {
                const existingBikesIds = new Set(existingClient.bicicletas.map(b => b.id));
                importedClient.bicicletas.forEach(bike => {
                    if (!existingBikesIds.has(bike.id)) {
                        existingClient.bicicletas.push(bike);
                        existingBikesIds.add(bike.id);
                        stats.bicicletasAdicionadas++;
                    }
                });
                stats.clientesMesclados++;
            } else {
                existingClients.push(importedClient);
                clientesByCPF.set(cpfClean, importedClient);
                stats.clientesNovos++;
                stats.bicicletasAdicionadas += importedClient.bicicletas.length;
            }
        });

        const existingRegistrosIds = new Set(existingRegistros.map(r => r.id));
        importedData.registros.forEach(registro => {
            if (!existingRegistrosIds.has(registro.id)) {
                existingRegistros.push(registro);
                existingRegistrosIds.add(registro.id);
                stats.registrosNovos++;
            }
        });

        const existingUsuariosUsernames = new Set(existingUsuarios.map(u => u.username));
        const usuariosToAdd = [];
        importedData.usuarios.forEach(usuario => {
            if (!existingUsuariosUsernames.has(usuario.username)) {
                usuariosToAdd.push(usuario);
                existingUsuariosUsernames.add(usuario.username);
                stats.usuariosNovos++;
            }
        });
        
        const mergedUsuarios = [...existingUsuarios, ...usuariosToAdd];
        
        let mergedCategorias = null;
        if (importedData.categorias) {
            mergedCategorias = importedData.categorias;
            stats.categoriasImportadas = Object.keys(mergedCategorias).length;
        }
        
        return {
            clients: existingClients,
            registros: existingRegistros,
            usuarios: mergedUsuarios,
            categorias: mergedCategorias,
            stats: stats
        };
    }

    async handleSystemImport() {
        try {
            Auth.requirePermission('configuracao', 'importar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const file = this.elements.importSystemFile.files[0];
        if (!file) return;

        const confirmed = await Modals.showConfirm(
            'Esta operação irá MESCLAR os dados do arquivo com os dados existentes no sistema. Clientes duplicados (mesmo CPF) terão suas bicicletas mescladas, registros e usuários duplicados (mesmo ID/username) serão ignorados. Deseja continuar?'
        );
        
        if (!confirmed) return;

        try {
            this.showImportSystemStatus('Importando dados...', 'info');
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let importedData;

            if (fileExtension === 'csv') {
                importedData = await this.processSystemCSVImport(file);
            } else {
                importedData = await this.processSystemExcelImport(file);
            }

            const mergedData = this.mergeSystemData(importedData);

            await Storage.saveClients(mergedData.clients);
            await Storage.saveRegistros(mergedData.registros);
            Auth.saveUsers(mergedData.usuarios);
            if (mergedData.categorias) {
                Storage.saveCategorias(mergedData.categorias);
            }

            this.app.data.clients = mergedData.clients;
            this.app.data.registros = mergedData.registros;

            this.showImportSystemStatus(`✅ Backup importado com sucesso! ${mergedData.stats.clientesNovos} clientes novos, ${mergedData.stats.clientesMesclados} mesclados, ${mergedData.stats.bicicletasAdicionadas} bicicletas adicionadas, ${mergedData.stats.registrosNovos} registros novos, ${mergedData.stats.usuariosNovos} usuários novos, ${mergedData.stats.categoriasImportadas} categorias.`, 'success');
            
            this.app.clientesManager.renderClientList();
            
            setTimeout(() => {
                Modals.alert('Dados importados com sucesso! A página será recarregada.');
                setTimeout(() => window.location.reload(), 1500);
            }, 1000);

        } catch (error) {
            console.error('Erro ao importar backup:', error);
            this.showImportSystemStatus(`❌ Erro ao importar: ${error.message}`, 'error');
        }
    }

    async processSystemExcelImport(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const clientesSheet = workbook.Sheets['Clientes'];
                    const registrosSheet = workbook.Sheets['Registros'];
                    const usuariosSheet = workbook.Sheets['Usuarios'];
                    const bicicletasSheet = workbook.Sheets['Bicicletas'];
                    const categoriasSheet = workbook.Sheets['Categorias'];

                    if (!clientesSheet || !registrosSheet) {
                        throw new Error('Arquivo inválido. Certifique-se de que contém ao menos as abas: Clientes e Registros');
                    }

                    const clientesData = XLSX.utils.sheet_to_json(clientesSheet, { header: 1 });
                    const registrosData = XLSX.utils.sheet_to_json(registrosSheet, { header: 1 });
                    const usuariosData = usuariosSheet ? XLSX.utils.sheet_to_json(usuariosSheet, { header: 1 }) : [];
                    const bicicletasData = bicicletasSheet ? XLSX.utils.sheet_to_json(bicicletasSheet, { header: 1 }) : [];
                    const categoriasData = categoriasSheet ? XLSX.utils.sheet_to_json(categoriasSheet, { header: 1 }) : [];

                    const clients = this.parseClientesData(clientesData, bicicletasData);
                    const registros = this.parseRegistrosData(registrosData);
                    const usuarios = this.parseUsuariosData(usuariosData);
                    const categorias = this.parseCategoriasData(categoriasData);

                    resolve({
                        clients,
                        registros,
                        usuarios,
                        categorias
                    });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    async processSystemCSVImport(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const sections = text.split(/\n\n=== /);
                    
                    let clientesData = [];
                    let bicicletasData = [];
                    let categoriasData = [];
                    let registrosData = [];
                    let usuariosData = [];
                    
                    sections.forEach(section => {
                        const lines = section.split('\n');
                        const sectionName = lines[0].replace('=== ', '').replace(' ===', '').trim();
                        
                        const rows = lines.slice(1).filter(line => line.trim()).map(line => {
                            return this.parseCSVLine(line);
                        });
                        
                        if (sectionName === 'Clientes') {
                            clientesData = rows;
                        } else if (sectionName === 'Bicicletas') {
                            bicicletasData = rows;
                        } else if (sectionName === 'Categorias') {
                            categoriasData = rows;
                        } else if (sectionName === 'Registros') {
                            registrosData = rows;
                        } else if (sectionName === 'Usuarios') {
                            usuariosData = rows;
                        }
                    });
                    
                    if (clientesData.length === 0) {
                        throw new Error('Arquivo CSV inválido. Certifique-se de que contém dados de Clientes');
                    }
                    
                    const clients = this.parseClientesData(clientesData, bicicletasData);
                    const registros = this.parseRegistrosData(registrosData);
                    const usuarios = this.parseUsuariosData(usuariosData);
                    const categorias = this.parseCategoriasData(categoriasData);
                    
                    resolve({
                        clients,
                        registros,
                        usuarios,
                        categorias
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo CSV'));
            reader.readAsText(file);
        });
    }

    parseClientesData(clientesData, bicicletasData) {
        const clientesMap = new Map();
        
        for (let i = 1; i < clientesData.length; i++) {
            const row = clientesData[i];
            if (!row[0]) continue;

            let bicicletas = [];
            let categoria = '';
            let comentarios = [];
            
            // Detectar formato pela quantidade total de colunas (incluindo vazias)
            // Formato novo: 7 colunas (ID, Nome, CPF, Telefone, Categoria, Comentários, Bicicletas)
            // Formato antigo: 5 colunas (ID, Nome, CPF, Telefone, Bicicletas)
            
            if (row.length >= 7) {
                // Formato novo detectado
                categoria = row[4] || '';
                
                // Parse comentários com validação
                if (row[5] && row[5].trim()) {
                    try {
                        const parsed = JSON.parse(row[5]);
                        comentarios = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.warn(`Erro ao parsear comentários para cliente ${row[0]} (valor: "${row[5]}"): ${e.message}`);
                        comentarios = [];
                    }
                }
                
                // Parse bicicletas com validação
                if (row[6] && row[6].trim()) {
                    try {
                        const parsed = JSON.parse(row[6]);
                        bicicletas = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.warn(`Erro ao parsear bicicletas para cliente ${row[0]} (valor: "${row[6]}"): ${e.message}`);
                        bicicletas = [];
                    }
                }
            } else if (row.length >= 5) {
                // Formato antigo detectado
                if (row[4] && row[4].trim()) {
                    try {
                        const parsed = JSON.parse(row[4]);
                        bicicletas = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.warn(`Erro ao parsear bicicletas (formato antigo) para cliente ${row[0]} (valor: "${row[4]}"): ${e.message}`);
                        bicicletas = [];
                    }
                }
            } else {
                console.warn(`Formato inesperado de cliente na linha ${i + 1}: ${row.length} colunas encontradas. Cliente será importado sem bicicletas.`);
            }

            clientesMap.set(row[0], {
                id: row[0],
                nome: row[1],
                cpf: row[2],
                telefone: row[3] || '',
                categoria: categoria,
                comentarios: comentarios,
                bicicletas: bicicletas
            });
        }

        // Se houver aba de bicicletas separada (formato antigo), processa também
        if (bicicletasData && bicicletasData.length > 1) {
            for (let i = 1; i < bicicletasData.length; i++) {
                const row = bicicletasData[i];
                if (!row[0]) continue;

                const clienteId = row[1];
                const client = clientesMap.get(clienteId);
                
                if (client) {
                    client.bicicletas.push({
                        id: row[0],
                        modelo: row[2],
                        marca: row[3],
                        cor: row[4]
                    });
                }
            }
        }

        return Array.from(clientesMap.values());
    }

    parseRegistrosData(registrosData) {
        const registros = [];
        
        for (let i = 1; i < registrosData.length; i++) {
            const row = registrosData[i];
            if (!row[0]) continue;

            // Detectar formato pela quantidade total de colunas (incluindo vazias)
            // Formato novo: 10 colunas (ID, Cliente ID, Bicicleta ID, Categoria, Data Entrada, Data Saída, Pernoite, Acesso Removido, Registro Original ID, Bike Snapshot)
            // Formato antigo: 8 colunas (ID, Cliente ID, Bicicleta ID, Data Entrada, Data Saída, Pernoite, Acesso Removido, Registro Original ID)
            
            if (row.length >= 10) {
                // Formato novo detectado
                let bikeSnapshot = null;
                
                // Parse bikeSnapshot com validação
                if (row[9]) {
                    try {
                        const parsed = JSON.parse(row[9]);
                        bikeSnapshot = (parsed && typeof parsed === 'object') ? parsed : null;
                    } catch (e) {
                        console.warn(`Erro ao parsear bikeSnapshot para registro ${row[0]}:`, e);
                        bikeSnapshot = null;
                    }
                }
                
                registros.push({
                    id: row[0],
                    clientId: row[1],
                    bikeId: row[2],
                    categoria: row[3] || '',
                    dataHoraEntrada: row[4],
                    dataHoraSaida: row[5] || null,
                    pernoite: row[6] === 'Sim',
                    acessoRemovido: row[7] === 'Sim',
                    registroOriginalId: row[8] || null,
                    bikeSnapshot: bikeSnapshot
                });
            } else if (row.length >= 8) {
                // Formato antigo detectado
                registros.push({
                    id: row[0],
                    clientId: row[1],
                    bikeId: row[2],
                    categoria: '',
                    dataHoraEntrada: row[3],
                    dataHoraSaida: row[4] || null,
                    pernoite: row[5] === 'Sim',
                    acessoRemovido: row[6] === 'Sim',
                    registroOriginalId: row[7] || null,
                    bikeSnapshot: null
                });
            } else {
                console.error(`Formato inesperado de registro na linha ${i + 1}: ${row.length} colunas encontradas. Registro ignorado.`);
            }
        }

        return registros;
    }

    parseUsuariosData(usuariosData) {
        const usuarios = [];
        
        for (let i = 1; i < usuariosData.length; i++) {
            const row = usuariosData[i];
            if (!row[0]) continue;

            usuarios.push({
                id: row[0],
                username: row[1],
                password: row[2],
                nome: row[3],
                tipo: row[4],
                ativo: row[5] === 'Sim',
                permissoes: JSON.parse(row[6])
            });
        }

        return usuarios;
    }

    parseCategoriasData(categoriasData) {
        const categorias = {};
        
        for (let i = 1; i < categoriasData.length; i++) {
            const row = categoriasData[i];
            if (!row[0]) continue;

            categorias[row[0]] = row[1];
        }

        return categorias;
    }

    showImportSystemStatus(message, type) {
        const statusEl = this.elements.importSystemStatus;
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `text-sm ${
            type === 'success' ? 'text-green-600 dark:text-green-400' :
            type === 'error' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400'
        }`;
        statusEl.classList.remove('hidden');
    }

    applyPermissionsToUI() {
        const canExport = Auth.hasPermission('configuracao', 'exportar');
        const canImport = Auth.hasPermission('configuracao', 'importar');

        if (!canExport) {
            if (this.elements.exportExcelBtn) this.elements.exportExcelBtn.style.display = 'none';
            if (this.elements.exportCsvBtn) this.elements.exportCsvBtn.style.display = 'none';
            if (this.elements.exportSystemExcelBtn) this.elements.exportSystemExcelBtn.style.display = 'none';
            if (this.elements.exportSystemCsvBtn) this.elements.exportSystemCsvBtn.style.display = 'none';
        }

        if (!canImport) {
            if (this.elements.importFile) this.elements.importFile.style.display = 'none';
            if (this.elements.importBtn) this.elements.importBtn.style.display = 'none';
            if (this.elements.importSystemFile) this.elements.importSystemFile.style.display = 'none';
            if (this.elements.importSystemBtn) this.elements.importSystemBtn.style.display = 'none';
            
            const importSection = document.querySelector('#configuracao-tab-content .bg-white.rounded-lg.shadow-sm.p-6:nth-of-type(2)');
            if (importSection) importSection.style.display = 'none';
            
            const systemImportSection = document.querySelector('#configuracao-tab-content .bg-white.rounded-lg.shadow-sm.p-6:nth-of-type(3)');
            if (systemImportSection) systemImportSection.style.display = 'none';
        }
    }
}
