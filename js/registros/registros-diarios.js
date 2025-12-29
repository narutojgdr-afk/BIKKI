import { Utils } from '../shared/utils.js';
import { Storage } from '../shared/storage.js';
import { Modals } from '../shared/modals.js';
import { Auth } from '../shared/auth.js';
import { logAction } from '../shared/audit-logger.js';

export class RegistrosManager {
    constructor(app) {
        this.app = app;
        this.elements = {
            addRegistroModal: document.getElementById('add-registro-modal'),
            addRegistroForm: document.getElementById('add-registro-form'),
            cancelAddRegistroBtn: document.getElementById('cancel-add-registro'),
            registroClientIdInput: document.getElementById('registro-client-id'),
            registroBikeIdInput: document.getElementById('registro-bike-id'),
            registroClientName: document.getElementById('registro-client-name'),
            registroBikeInfo: document.getElementById('registro-bike-info'),
            dailyRecordsDateInput: document.getElementById('daily-records-date'),
            dailyRecordsSearchInput: document.getElementById('daily-records-search'),
            dailyRecordsList: document.getElementById('daily-records-list'),
            exportBtn: document.getElementById('export-btn'),
            exportOptions: document.getElementById('export-options'),
            exportCsvBtn: document.getElementById('export-csv'),
            exportPdfBtn: document.getElementById('export-pdf'),
            editRegistroModal: document.getElementById('edit-registro-modal'),
            editRegistroForm: document.getElementById('edit-registro-form'),
            cancelEditRegistroBtn: document.getElementById('cancel-edit-registro'),
            editRegistroIdInput: document.getElementById('edit-registro-id'),
            editRegistroClientSelect: document.getElementById('edit-registro-client'),
            editRegistroBikeSelect: document.getElementById('edit-registro-bike'),
            editRegistroCategoriaSelect: document.getElementById('edit-registro-categoria'),
            editRegistroEntradaInput: document.getElementById('edit-registro-entrada'),
            editRegistroSaidaInput: document.getElementById('edit-registro-saida'),
            categoriaModal: document.getElementById('categoria-modal'),
            categoriaModalTitle: document.getElementById('categoria-modal-title'),
            categoriaModalList: document.getElementById('categoria-modal-list'),
            closeCategoriaModalBtn: document.getElementById('close-categoria-modal-btn'),
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.addRegistroForm.addEventListener('submit', this.handleAddRegistro.bind(this));
        this.elements.cancelAddRegistroBtn.addEventListener('click', () => this.app.toggleModal('add-registro-modal', false));
        this.elements.dailyRecordsDateInput.addEventListener('change', this.renderDailyRecords.bind(this));
        this.elements.dailyRecordsSearchInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            this.renderDailyRecords();
        });
        this.elements.dailyRecordsList.addEventListener('click', this.handleRegisterSaida.bind(this));
        this.elements.dailyRecordsList.addEventListener('click', this.handleReverterAcao.bind(this));
        this.elements.dailyRecordsList.addEventListener('click', this.handleReverterPernoite.bind(this));
        this.elements.dailyRecordsList.addEventListener('click', this.handleEditRegistroClick.bind(this));
        this.elements.dailyRecordsList.addEventListener('click', this.handleViewComments.bind(this));
        this.elements.dailyRecordsList.addEventListener('click', this.handleCategoriaBoxClick.bind(this));
        this.elements.dailyRecordsList.addEventListener('change', this.handleActionChange.bind(this));
        this.elements.dailyRecordsList.addEventListener('click', this.handleActionDropdownClick.bind(this));
        this.elements.editRegistroForm.addEventListener('submit', this.handleEditRegistroSubmit.bind(this));
        this.elements.cancelEditRegistroBtn.addEventListener('click', () => this.app.toggleModal('edit-registro-modal', false));
        this.elements.editRegistroClientSelect.addEventListener('change', this.handleClientChange.bind(this));
        if (this.elements.closeCategoriaModalBtn) {
            this.elements.closeCategoriaModalBtn.addEventListener('click', () => this.app.toggleModal('categoria-modal', false));
        }
        this.elements.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleExportMenu();
        });
        this.elements.exportCsvBtn.addEventListener('click', () => this.exportToCSV());
        this.elements.exportPdfBtn.addEventListener('click', () => this.exportToPDF());
        
        window.addEventListener('click', (e) => {
            this.toggleExportMenu(false);
            // Close all action dropdowns when clicking outside
            if (!e.target.closest('.action-dropdown')) {
                document.querySelectorAll('.action-dropdown .dropdown-menu').forEach(menu => {
                    menu.classList.add('hidden');
                    const button = menu.closest('.action-dropdown').querySelector('.dropdown-button');
                    if (button) button.classList.remove('active');
                });
            }
        });
    }

    handleViewComments(e) {
        if (e.target.closest('.view-comments-btn')) {
            const btn = e.target.closest('.view-comments-btn');
            const clientId = btn.dataset.clientId;
            this.app.openCommentsModal(clientId, () => this.renderDailyRecords());
        }
    }

    handleCategoriaBoxClick(e) {
        const categoriaBox = e.target.closest('.categoria-box');
        if (categoriaBox) {
            const categoria = categoriaBox.dataset.categoria;
            this.openCategoriaModal(categoria);
        }
    }

    openCategoriaModal(categoria) {
        if (!this.elements.categoriaModal || !this.elements.categoriaModalList) return;

        // Filter records for this category
        const dailyRecords = this.app.data.currentDailyRecords || [];
        const categoriaRecords = dailyRecords.filter(({ registro }) => {
            const recordCategoria = registro.categoria || 'Sem Categoria';
            return recordCategoria === categoria;
        });

        // Update modal title
        if (this.elements.categoriaModalTitle) {
            this.elements.categoriaModalTitle.textContent = categoria;
        }

        // Build list HTML
        const categorias = Storage.loadCategorias();
        const listHtml = categoriaRecords.map(({ client, bike, registro }) => {
            const categoriaEmoji = categoria !== 'Sem Categoria' && categorias[categoria] ? categorias[categoria] : '';
            return `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div class="flex-1">
                        <p class="font-medium text-slate-800 dark:text-slate-100">${client.nome}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${client.cpf}</p>
                        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            <i data-lucide="bike" class="w-3 h-3 inline"></i>
                            ${bike.modelo} - ${bike.marca}
                        </p>
                    </div>
                    <button class="edit-categoria-registro-btn p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" data-registro-id="${registro.id}" title="Editar registro">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
        }).join('');

        this.elements.categoriaModalList.innerHTML = listHtml || '<p class="text-sm text-slate-500 dark:text-slate-400">Nenhuma pessoa registrada nesta categoria.</p>';
        
        // Recreate icons
        lucide.createIcons();
        
        // Add event listeners to edit buttons
        this.elements.categoriaModalList.querySelectorAll('.edit-categoria-registro-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const registroId = btn.dataset.registroId;
                this.app.toggleModal('categoria-modal', false);
                this.openEditRegistroModal(registroId);
            });
        });

        this.app.toggleModal('categoria-modal', true);
    }

    async handleAddRegistro(e) {
        e.preventDefault();
        
        try {
            Auth.requirePermission('registros', 'adicionar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const clientId = this.elements.registroClientIdInput.value;
        const bikeId = this.elements.registroBikeIdInput.value;
        const client = this.app.data.clients.find(c => c.id === clientId);
        const bike = client?.bicicletas.find(b => b.id === bikeId);
        const categoriaSelect = document.getElementById('registro-categoria');
        const categoria = categoriaSelect ? categoriaSelect.value : (client?.categoria || '');
        
        if(bike) {
            const newRegistro = { 
                id: Utils.generateUUID(), 
                dataHoraEntrada: Utils.getLocalISOString(), 
                dataHoraSaida: null,
                clientId: clientId,
                bikeId: bikeId,
                categoria: categoria,
                bikeSnapshot: {
                    modelo: bike.modelo,
                    marca: bike.marca,
                    cor: bike.cor
                }
            };
            this.app.data.registros.push(newRegistro);
            await Storage.saveRegistros(this.app.data.registros);
            
            logAction('register_entry', 'registro', newRegistro.id, {
                cliente: client.nome,
                clienteCpf: client.cpf,
                modelo: bike.modelo,
                marca: bike.marca,
                categoria: categoria,
                dataHoraEntrada: newRegistro.dataHoraEntrada
            });
            
            this.app.bicicletasManager.renderClientDetails();
            if (this.app.data.activeTab === 'registros-diarios') {
                this.renderDailyRecords();
            }
            this.app.toggleModal('add-registro-modal', false);
        }
    }

    openAddRegistroModal(clientId, bikeId) {
        const client = this.app.data.clients.find(c => c.id === clientId);
        const bike = client?.bicicletas.find(b => b.id === bikeId);

        if (client && bike) {
            this.elements.addRegistroForm.reset();
            this.elements.registroClientIdInput.value = clientId;
            this.elements.registroBikeIdInput.value = bikeId;
            this.elements.registroClientName.textContent = client.nome;
            this.elements.registroBikeInfo.textContent = `${bike.modelo} (${bike.marca} - ${bike.cor})`;
            
            if (this.app.configuracaoManager) {
                this.app.configuracaoManager.updateCategoryDropdowns();
            }
            
            const categoriaSelect = document.getElementById('registro-categoria');
            if (categoriaSelect && client.categoria) {
                categoriaSelect.value = client.categoria;
            }
            
            this.app.toggleModal('add-registro-modal', true);
        }
    }

    async handleRegisterSaida(e) {
        if (e.target.closest('.register-saida-btn')) {
            try {
                Auth.requirePermission('registros', 'editar');
            } catch (error) {
                Modals.alert(error.message, 'Permissão Negada');
                return;
            }

            const btn = e.target.closest('.register-saida-btn');
            const registroId = btn.dataset.registroId;
            const registro = this.app.data.registros.find(r => r.id === registroId);
            
            if (registro && !registro.dataHoraSaida) {
                registro.dataHoraSaida = Utils.getLocalISOString();
                await Storage.saveRegistros(this.app.data.registros);
                this.renderDailyRecords();
                this.app.bicicletasManager.renderClientDetails();
            }
        }
    }

    async handleActionChange(e) {
        if (e.target.classList.contains('action-select')) {
            const select = e.target;
            const action = select.value;
            const registroId = select.dataset.registroId;
            const clientId = select.dataset.clientId;
            const bikeId = select.dataset.bikeId;
            
            if (!action) return;

            const requiresEdit = ['saida', 'remover', 'pernoite', 'alterar'].includes(action);
            const requiresAdd = action === 'adicionar';

            if (requiresEdit && !Auth.hasPermission('registros', 'editar')) {
                Modals.alert('Você não tem permissão para editar registros.', 'Permissão Negada');
                select.value = '';
                return;
            }

            if (requiresAdd && !Auth.hasPermission('registros', 'adicionar')) {
                Modals.alert('Você não tem permissão para adicionar registros.', 'Permissão Negada');
                select.value = '';
                return;
            }

            switch(action) {
                case 'saida':
                    await this.registerSaida(registroId);
                    break;
                case 'remover':
                    await this.removerAcesso(registroId);
                    break;
                case 'alterar':
                    await this.alterarRegistro(registroId);
                    break;
                case 'adicionar':
                    await this.adicionarBike(clientId, registroId);
                    break;
                case 'pernoite':
                    await this.registrarPernoite(registroId);
                    break;
            }
            
            select.value = '';
        }
    }

    async handleActionDropdownClick(e) {
        // Toggle dropdown menu
        const dropdownButton = e.target.closest('.dropdown-button');
        if (dropdownButton) {
            e.stopPropagation();
            const dropdown = dropdownButton.closest('.action-dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            const isOpen = !menu.classList.contains('hidden');
            
            // Close all other action dropdowns
            document.querySelectorAll('.action-dropdown .dropdown-menu').forEach(m => {
                if (m !== menu) {
                    m.classList.add('hidden');
                    m.closest('.action-dropdown').querySelector('.dropdown-button').classList.remove('active');
                }
            });
            
            // Toggle this dropdown
            if (isOpen) {
                menu.classList.add('hidden');
                dropdownButton.classList.remove('active');
            } else {
                menu.classList.remove('hidden');
                dropdownButton.classList.add('active');
            }
            return;
        }

        // Handle option selection
        const dropdownOption = e.target.closest('.dropdown-option');
        if (dropdownOption) {
            const action = dropdownOption.dataset.value;
            const dropdown = dropdownOption.closest('.action-dropdown');
            const registroId = dropdown.dataset.registroId;
            const clientId = dropdown.dataset.clientId;
            const bikeId = dropdown.dataset.bikeId;
            const menu = dropdown.querySelector('.dropdown-menu');
            const button = dropdown.querySelector('.dropdown-button');
            
            // Close dropdown
            menu.classList.add('hidden');
            button.classList.remove('active');
            
            if (!action) return;

            const requiresEdit = ['saida', 'remover', 'pernoite', 'alterar'].includes(action);
            const requiresAdd = action === 'adicionar';

            if (requiresEdit && !Auth.hasPermission('registros', 'editar')) {
                Modals.alert('Você não tem permissão para editar registros.', 'Permissão Negada');
                return;
            }

            if (requiresAdd && !Auth.hasPermission('registros', 'adicionar')) {
                Modals.alert('Você não tem permissão para adicionar registros.', 'Permissão Negada');
                return;
            }

            switch(action) {
                case 'saida':
                    await this.registerSaida(registroId);
                    break;
                case 'remover':
                    await this.removerAcesso(registroId);
                    break;
                case 'alterar':
                    await this.alterarRegistro(registroId);
                    break;
                case 'adicionar':
                    await this.adicionarBike(clientId, registroId);
                    break;
                case 'pernoite':
                    await this.registrarPernoite(registroId);
                    break;
            }
        }
    }

    async registerSaida(registroId) {
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (registro && !registro.dataHoraSaida) {
            registro.dataHoraSaida = Utils.getLocalISOString();
            await Storage.saveRegistros(this.app.data.registros);
            
            const client = this.app.data.clients.find(c => c.id === registro.clientId);
            logAction('register_exit', 'registro', registroId, {
                cliente: client?.nome || 'Desconhecido',
                clienteCpf: client?.cpf || '',
                modelo: registro.bikeSnapshot.modelo,
                marca: registro.bikeSnapshot.marca,
                dataHoraEntrada: registro.dataHoraEntrada,
                dataHoraSaida: registro.dataHoraSaida
            });
            
            this.renderDailyRecords();
            this.app.bicicletasManager.renderClientDetails();
        }
    }

    async removerAcesso(registroId) {
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const confirmed = await Modals.showConfirm('Tem certeza que deseja remover o acesso desta bicicleta?', 'Remover Acesso');
        if (confirmed) {
            const registro = this.app.data.registros.find(r => r.id === registroId);
            if (registro && !registro.dataHoraSaida) {
                registro.dataHoraSaida = Utils.getLocalISOString();
                registro.acessoRemovido = true;
                await Storage.saveRegistros(this.app.data.registros);
                this.renderDailyRecords();
                this.app.bicicletasManager.renderClientDetails();
                await Modals.showAlert('Acesso removido com sucesso!', 'Sucesso');
            }
        }
    }

    async handleReverterAcao(e) {
        if (e.target.closest('.reverter-acao-btn')) {
            try {
                Auth.requirePermission('registros', 'editar');
            } catch (error) {
                Modals.alert(error.message, 'Permissão Negada');
                return;
            }

            const btn = e.target.closest('.reverter-acao-btn');
            const registroId = btn.dataset.registroId;
            await this.reverterAcao(registroId);
        }
    }

    async reverterAcao(registroId) {
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (!registro || !registro.dataHoraSaida) {
            return;
        }

        const tipoAcao = registro.acessoRemovido ? 'remoção de acesso' : 'saída';
        const confirmed = await Modals.showConfirm(`Tem certeza que deseja reverter a ${tipoAcao}?`, 'Reverter Ação');
        if (confirmed) {
            registro.dataHoraSaida = null;
            if (registro.acessoRemovido) {
                delete registro.acessoRemovido;
            }
            await Storage.saveRegistros(this.app.data.registros);
            this.renderDailyRecords();
            this.app.bicicletasManager.renderClientDetails();
        }
    }

    async handleReverterPernoite(e) {
        if (e.target.closest('.reverter-pernoite-btn')) {
            try {
                Auth.requirePermission('registros', 'editar');
            } catch (error) {
                Modals.alert(error.message, 'Permissão Negada');
                return;
            }

            const btn = e.target.closest('.reverter-pernoite-btn');
            const registroId = btn.dataset.registroId;
            await this.reverterPernoite(registroId);
        }
    }

    handleEditRegistroClick(e) {
        if (e.target.closest('.edit-registro-btn')) {
            const btn = e.target.closest('.edit-registro-btn');
            const registroId = btn.dataset.registroId;
            this.openEditRegistroModal(registroId);
        }
    }

    openEditRegistroModal(registroId) {
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (!registro) return;

        this.elements.editRegistroIdInput.value = registroId;

        this.elements.editRegistroClientSelect.innerHTML = '<option value="">Selecione um cliente</option>';
        this.app.data.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.nome} (${client.cpf})`;
            if (client.id === registro.clientId) {
                option.selected = true;
            }
            this.elements.editRegistroClientSelect.appendChild(option);
        });

        this.populateBikeSelect(registro.clientId, registro.bikeId);

        const categorias = Storage.loadCategorias();
        this.elements.editRegistroCategoriaSelect.innerHTML = '<option value="">Selecione uma categoria (opcional)</option>';
        Object.entries(categorias).forEach(([nome, emoji]) => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = `${emoji} ${nome}`;
            if (registro.categoria === nome) {
                option.selected = true;
            }
            this.elements.editRegistroCategoriaSelect.appendChild(option);
        });

        // Update the custom dropdown visual
        this.updateEditCategoriaDropdown(categorias, registro.categoria);

        const entradaDate = new Date(registro.dataHoraEntrada);
        this.elements.editRegistroEntradaInput.value = this.formatDateTimeLocal(entradaDate);

        if (registro.dataHoraSaida) {
            const saidaDate = new Date(registro.dataHoraSaida);
            this.elements.editRegistroSaidaInput.value = this.formatDateTimeLocal(saidaDate);
        } else {
            this.elements.editRegistroSaidaInput.value = '';
        }

        this.app.toggleModal('edit-registro-modal', true);
    }

    handleClientChange(e) {
        const clientId = e.target.value;
        this.populateBikeSelect(clientId);
    }

    updateEditCategoriaDropdown(categorias, selectedCategoria) {
        const dropdown = document.getElementById('edit-registro-categoria-dropdown');
        if (!dropdown) return;

        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        const dropdownText = dropdown.querySelector('.dropdown-text');
        if (!dropdownMenu) return;

        const iconMap = {
            '👤': 'user',
            '🏢': 'building',
            '🍽️': 'utensils',
            '💪': 'dumbbell',
            '👨': 'user',
            '🏪': 'store',
            '⚙️': 'settings',
            '🎯': 'target',
            '📱': 'smartphone',
            '📊': 'bar-chart',
            '🔧': 'wrench',
            '🎨': 'palette',
            '⭐': 'star',
            '📦': 'package',
            '🚀': 'rocket',
            '🛍️': 'shopping-bag',
            '☕': 'coffee'
        };

        // Build the dropdown options HTML
        let optionsHtml = `
            <div class="dropdown-option ${!selectedCategoria ? 'selected' : ''}" data-value="">
                <i data-lucide="settings" class="w-4 h-4 inline mr-2"></i>
                Selecione uma categoria (opcional)
            </div>
        `;

        Object.entries(categorias).forEach(([nome, emoji]) => {
            const iconName = iconMap[emoji] || 'circle';
            const isSelected = selectedCategoria === nome;
            optionsHtml += `
                <div class="dropdown-option ${isSelected ? 'selected' : ''}" data-value="${nome}">
                    <i data-lucide="${iconName}" class="w-4 h-4 inline mr-2"></i>
                    ${emoji} ${nome}
                </div>
            `;
        });

        dropdownMenu.innerHTML = optionsHtml;

        // Update the button text
        if (dropdownText) {
            if (selectedCategoria && categorias[selectedCategoria]) {
                const emoji = categorias[selectedCategoria];
                const iconName = iconMap[emoji] || 'circle';
                dropdownText.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 inline mr-2"></i>${emoji} ${selectedCategoria}`;
            } else {
                dropdownText.innerHTML = `<i data-lucide="settings" class="w-4 h-4 inline mr-2"></i>Selecione uma categoria (opcional)`;
            }
        }

        // Recreate icons
        lucide.createIcons();

        // Re-initialize the dropdown
        if (window.editRegistroCategoriaDropdown) {
            window.editRegistroCategoriaDropdown.init();
        }
    }

    populateBikeSelect(clientId, selectedBikeId = null) {
        this.elements.editRegistroBikeSelect.innerHTML = '<option value="">Selecione uma bicicleta</option>';
        
        if (!clientId) return;

        const client = this.app.data.clients.find(c => c.id === clientId);
        if (!client || !client.bicicletas) return;

        client.bicicletas.forEach(bike => {
            const option = document.createElement('option');
            option.value = bike.id;
            option.textContent = `${bike.modelo} (${bike.marca} - ${bike.cor})`;
            if (bike.id === selectedBikeId) {
                option.selected = true;
            }
            this.elements.editRegistroBikeSelect.appendChild(option);
        });
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async handleEditRegistroSubmit(e) {
        e.preventDefault();
        
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const registroId = this.elements.editRegistroIdInput.value;
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (!registro) return;

        const newClientId = this.elements.editRegistroClientSelect.value;
        const newBikeId = this.elements.editRegistroBikeSelect.value;
        const newCategoria = this.elements.editRegistroCategoriaSelect.value;
        const newEntrada = this.elements.editRegistroEntradaInput.value;
        const newSaida = this.elements.editRegistroSaidaInput.value;

        if (!newClientId || !newBikeId || !newEntrada) {
            await Modals.showAlert('Preencha todos os campos obrigatórios!', 'Atenção');
            return;
        }

        const client = this.app.data.clients.find(c => c.id === newClientId);
        const bike = client?.bicicletas.find(b => b.id === newBikeId);

        if (!bike) {
            await Modals.showAlert('Bicicleta não encontrada!', 'Erro');
            return;
        }

        registro.clientId = newClientId;
        registro.bikeId = newBikeId;
        registro.categoria = newCategoria !== '' ? newCategoria : (registro.categoria || client.categoria || '');
        registro.bikeSnapshot = {
            modelo: bike.modelo,
            marca: bike.marca,
            cor: bike.cor
        };
        registro.dataHoraEntrada = Utils.getLocalISOString(new Date(newEntrada));
        
        if (newSaida) {
            registro.dataHoraSaida = Utils.getLocalISOString(new Date(newSaida));
        } else {
            registro.dataHoraSaida = null;
            if (registro.acessoRemovido) {
                delete registro.acessoRemovido;
            }
        }

        await Storage.saveRegistros(this.app.data.registros);
        this.renderDailyRecords();
        this.app.bicicletasManager.renderClientDetails();
        this.app.toggleModal('edit-registro-modal', false);
        await Modals.showAlert('Registro atualizado com sucesso!', 'Sucesso');
    }

    async alterarRegistro(registroId) {
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (!registro) return;

        const client = this.app.data.clients.find(c => c.id === registro.clientId);
        if (!client || !client.bicicletas || client.bicicletas.length === 0) {
            await Modals.showAlert('Cliente não tem bicicletas cadastradas.', 'Atenção');
            return;
        }

        if (client.bicicletas.length === 1) {
            await Modals.showAlert('Cliente tem apenas uma bicicleta cadastrada. Não é possível trocar.', 'Atenção');
            return;
        }

        const bikeAtual = client.bicicletas.find(b => b.id === registro.bikeId);
        const outrasBikes = client.bicicletas.filter(b => b.id !== registro.bikeId);

        let options = outrasBikes.map((bike, idx) => 
            `${idx + 1}. ${bike.modelo} (${bike.marca} - ${bike.cor})`
        ).join('\n');

        const bikeAtualInfo = bikeAtual ? `${bikeAtual.modelo} (${bikeAtual.marca} - ${bikeAtual.cor})` : 'Desconhecida';
        
        const escolhaText = `Bicicleta atual: ${bikeAtualInfo}\n\nEscolha a nova bicicleta:\n${options}\n\nDigite o número:`;
        const escolha = await Modals.showInputPrompt(escolhaText, 'Trocar Bicicleta');
        
        if (escolha !== null && escolha.trim() !== '') {
            const index = parseInt(escolha) - 1;
            if (index >= 0 && index < outrasBikes.length) {
                const novaBike = outrasBikes[index];
                registro.bikeId = novaBike.id;
                registro.bikeSnapshot = {
                    modelo: novaBike.modelo,
                    marca: novaBike.marca,
                    cor: novaBike.cor
                };
                await Storage.saveRegistros(this.app.data.registros);
                this.renderDailyRecords();
                this.app.bicicletasManager.renderClientDetails();
                await Modals.showAlert('Bicicleta trocada com sucesso!', 'Sucesso');
            } else {
                await Modals.showAlert('Opção inválida! Selecione um número válido.', 'Erro');
            }
        }
    }

    async adicionarBike(clientId, registroId) {
        try {
            Auth.requirePermission('registros', 'adicionar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const client = this.app.data.clients.find(c => c.id === clientId);
        if (!client || !client.bicicletas || client.bicicletas.length === 0) {
            await Modals.showAlert('Cliente não tem bicicletas cadastradas.', 'Atenção');
            return;
        }

        const registroOriginal = this.app.data.registros.find(r => r.id === registroId);
        
        const bikesDisponiveis = client.bicicletas.filter(bike => {
            const temRegistroAberto = this.app.data.registros.some(r => 
                r.bikeId === bike.id && !r.dataHoraSaida
            );
            return !temRegistroAberto;
        });

        if (bikesDisponiveis.length === 0) {
            await Modals.showAlert('Todas as bicicletas deste cliente já estão com registro aberto.', 'Atenção');
            return;
        }

        let options = bikesDisponiveis.map((bike, idx) => 
            `${idx + 1}. ${bike.modelo} (${bike.marca} - ${bike.cor})`
        ).join('\n');
        
        const escolha = await Modals.showInputPrompt(`Escolha uma bicicleta para adicionar:\n${options}\n\nDigite o número:`, 'Adicionar Outra Bike');
        
        if (escolha !== null && escolha.trim() !== '') {
            const index = parseInt(escolha) - 1;
            if (index >= 0 && index < bikesDisponiveis.length) {
                const bikeSelecionada = bikesDisponiveis[index];
                const novoRegistro = {
                    id: Utils.generateUUID(),
                    dataHoraEntrada: registroOriginal.dataHoraEntrada,
                    dataHoraSaida: null,
                    clientId: clientId,
                    bikeId: bikeSelecionada.id,
                    bikeSnapshot: {
                        modelo: bikeSelecionada.modelo,
                        marca: bikeSelecionada.marca,
                        cor: bikeSelecionada.cor
                    }
                };
                this.app.data.registros.push(novoRegistro);
                await Storage.saveRegistros(this.app.data.registros);
                this.renderDailyRecords();
                await Modals.showAlert('Bicicleta adicionada ao mesmo registro com sucesso!', 'Sucesso');
            } else {
                await Modals.showAlert('Opção inválida! Selecione um número válido.', 'Erro');
            }
        }
    }

    async registrarPernoite(registroId) {
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (!registro || registro.dataHoraSaida) {
            return;
        }

        const confirmed = await Modals.showConfirm('Confirma registrar este cliente como PERNOITE? O registro aparecerá também no dia seguinte.', 'Registrar Pernoite');
        if (confirmed) {
            const dataEntrada = new Date(registro.dataHoraEntrada);
            const diaSeguinte = new Date(dataEntrada);
            diaSeguinte.setDate(diaSeguinte.getDate() + 1);

            const novoRegistroId = Utils.generateUUID();
            
            const novoRegistro = {
                id: novoRegistroId,
                dataHoraEntrada: Utils.getLocalISOString(diaSeguinte),
                dataHoraSaida: null,
                clientId: registro.clientId,
                bikeId: registro.bikeId,
                bikeSnapshot: registro.bikeSnapshot,
                pernoite: true,
                dataHoraEntradaOriginal: registro.dataHoraEntrada,
                registroOriginalId: registroId
            };

            registro.pernoite = true;
            registro.registroPernoiteId = novoRegistroId;

            this.app.data.registros.push(novoRegistro);
            await Storage.saveRegistros(this.app.data.registros);
            this.renderDailyRecords();
            await Modals.showAlert('Registro de PERNOITE criado com sucesso! Verifique o dia seguinte.', 'Sucesso');
        }
    }

    async reverterPernoite(registroId) {
        try {
            Auth.requirePermission('registros', 'editar');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }
        
        const registro = this.app.data.registros.find(r => r.id === registroId);
        if (!registro || !registro.pernoite) {
            return;
        }

        const confirmed = await Modals.showConfirm('Tem certeza que deseja reverter o PERNOITE?', 'Reverter Pernoite');
        if (confirmed) {
            if (registro.registroPernoiteId) {
                const indexPernoite = this.app.data.registros.findIndex(r => r.id === registro.registroPernoiteId);
                if (indexPernoite >= 0) {
                    this.app.data.registros.splice(indexPernoite, 1);
                }
                delete registro.pernoite;
                delete registro.registroPernoiteId;
            } else if (registro.registroOriginalId) {
                const registroOriginal = this.app.data.registros.find(r => r.id === registro.registroOriginalId);
                if (registroOriginal) {
                    delete registroOriginal.pernoite;
                    delete registroOriginal.registroPernoiteId;
                }
                const indexAtual = this.app.data.registros.findIndex(r => r.id === registroId);
                if (indexAtual >= 0) {
                    this.app.data.registros.splice(indexAtual, 1);
                }
            }
            
            await Storage.saveRegistros(this.app.data.registros);
            this.renderDailyRecords();
            this.app.bicicletasManager.renderClientDetails();
        }
    }

    renderRegistrosTable(bikeId) {
        const bikeRegistros = this.app.data.registros.filter(r => r.bikeId === bikeId);
        if (!bikeRegistros || bikeRegistros.length === 0) {
            return '<p class="text-xs text-slate-500 dark:text-slate-400">Nenhum registro encontrado.</p>';
        }
        
        const sortedRegistros = [...bikeRegistros].sort((a, b) => new Date(b.dataHoraEntrada) - new Date(a.dataHoraEntrada));

        return `
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="text-left">
                        <tr class="border-b border-slate-200 dark:border-slate-700">
                            <th class="font-medium text-slate-500 dark:text-slate-400 py-2 pr-2">Entrada</th>
                            <th class="font-medium text-slate-500 dark:text-slate-400 py-2 px-2">Saída</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedRegistros.map(reg => `
                            <tr class="border-b border-slate-100 dark:border-slate-700/50">
                                <td class="py-2 pr-2 text-slate-600 dark:text-slate-300">${new Date(reg.dataHoraEntrada).toLocaleString('pt-BR')}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-300">
                                    ${reg.dataHoraSaida ? new Date(reg.dataHoraSaida).toLocaleString('pt-BR') : '<span class="text-xs font-medium text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/50 px-2 py-1 rounded-full">Em aberto</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDailyRecords() {
        const selectedDateStr = this.elements.dailyRecordsDateInput.value;
        if (!selectedDateStr) {
            this.elements.dailyRecordsList.innerHTML = `<p class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Selecione uma data para ver os registros.</p>`;
            this.app.data.currentDailyRecords = [];
            return;
        }
        
        const dailyRecordsRaw = this.app.data.registros.filter(registro => {
            const entradaDate = new Date(registro.dataHoraEntrada);
            const localDateStr = Utils.getLocalDateString(entradaDate);
            return localDateStr === selectedDateStr;
        });

        let dailyRecords = dailyRecordsRaw.map(registro => {
            const client = this.app.data.clients.find(c => c.id === registro.clientId);
            if (!client) return null;
            const bike = client.bicicletas.find(b => b.id === registro.bikeId);
            if (!bike) return null;
            return { client, bike, registro };
        }).filter(Boolean);

        const searchTerm = this.elements.dailyRecordsSearchInput.value.toLowerCase();
        if (searchTerm) {
            dailyRecords = dailyRecords.filter(({ client, bike }) => 
                client.nome.toLowerCase().includes(searchTerm) ||
                client.cpf.includes(searchTerm) ||
                bike.modelo.toLowerCase().includes(searchTerm) ||
                bike.marca.toLowerCase().includes(searchTerm)
            );
        }

        this.app.data.currentDailyRecords = dailyRecords;

        if (dailyRecords.length === 0) {
            this.elements.dailyRecordsList.innerHTML = `<p class="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum registro encontrado para esta data.</p>`;
            return;
        }

        const canEditRegistros = Auth.hasPermission('registros', 'editar');
        const canAddRegistros = Auth.hasPermission('registros', 'adicionar');

        // Seção de Registros
        const categorias = Storage.loadCategorias();
        const registrosTable = `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <i data-lucide="clipboard-list" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                        <span>Registro</span>
                    </h3>
                    <table class="w-full text-sm">
                        <thead class="text-left bg-slate-50 dark:bg-slate-700/40">
                            <tr class="border-b border-slate-200 dark:border-slate-700">
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3">Cliente</th>
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3">Categoria</th>
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3">Bicicleta</th>
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3">Entrada</th>
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3">Saída</th>
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3">Ação</th>
                                <th class="font-semibold text-slate-600 dark:text-slate-300 p-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dailyRecords.map(({ client, bike, registro }) => {
                                const categoria = registro.categoria || client.categoria || '';
                                const categoriaEmoji = categoria && categorias[categoria] ? categorias[categoria] : '';
                                const categoriaDisplay = categoria ? (() => {
                                    const iconMap = {
                                        '👤': 'user',
                                        '🏢': 'building',
                                        '🍽️': 'utensils',
                                        '💪': 'dumbbell',
                                        '👨': 'user',
                                        '🏪': 'store',
                                        '⚙️': 'settings',
                                        '🎯': 'target',
                                        '📱': 'smartphone',
                                        '📊': 'bar-chart',
                                        '🔧': 'wrench',
                                        '🎨': 'palette',
                                        '⭐': 'star',
                                        '📦': 'package',
                                        '🚀': 'rocket',
                                        '🛍️': 'shopping-bag',
                                        '☕': 'coffee'
                                    };
                                    const iconName = iconMap[categoriaEmoji] || 'circle';
                                    return `<i data-lucide="${iconName}" class="w-4 h-4 inline mr-2"></i>${categoria}`;
                                })() : '<span class="text-xs text-slate-400">-</span>';
                                
                                return `
                        <tr class="border-b border-slate-100 dark:border-slate-700">
                            <td class="p-3 align-top">
                                <p class="font-medium text-slate-800 dark:text-slate-100">${client.nome}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400">${client.cpf}</p>
                            </td>
                            <td class="p-3 align-top">
                                <span class="text-slate-700 dark:text-slate-200">${categoriaDisplay}</span>
                            </td>
                            <td class="p-3 align-top">
                                <p class="font-medium text-slate-800 dark:text-slate-100">${bike.modelo}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400">${bike.marca} - ${bike.cor}</p>
                            </td>
                            <td class="p-3 align-top text-slate-600 dark:text-slate-300">
                                ${registro.pernoite && registro.dataHoraEntradaOriginal ? 
                                    `${new Date(registro.dataHoraEntradaOriginal).toLocaleString('pt-BR')} <span class="ml-2 text-xs font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 px-2 py-1 rounded-full inline-flex items-center gap-1"><i data-lucide="moon" class="w-3 h-3"></i> PERNOITE</span>` 
                                    : registro.pernoite ? 
                                        `${new Date(registro.dataHoraEntrada).toLocaleString('pt-BR')} <span class="ml-2 text-xs font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 px-2 py-1 rounded-full inline-flex items-center gap-1"><i data-lucide="moon" class="w-3 h-3"></i> PERNOITE</span>`
                                        : new Date(registro.dataHoraEntrada).toLocaleString('pt-BR')}
                            </td>
                            <td class="p-3 align-top text-slate-600 dark:text-slate-300">${registro.dataHoraSaida ? new Date(registro.dataHoraSaida).toLocaleString('pt-BR') : ''}</td>
                            <td class="p-3 align-top">
                                ${!registro.dataHoraSaida && !registro.pernoite && (canEditRegistros || canAddRegistros) ? `
                                    <div class="custom-dropdown-wrapper">
                                        <div class="custom-dropdown action-dropdown" data-registro-id="${registro.id}" data-client-id="${client.id}" data-bike-id="${bike.id}">
                                            <div class="dropdown-button">
                                                <span class="dropdown-text">Selecione uma ação</span>
                                                <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                            </div>
                                            <div class="dropdown-menu hidden">
                                                ${canEditRegistros ? '<div class="dropdown-option" data-value="saida"><i data-lucide="log-out" class="w-4 h-4 inline mr-2"></i>Registrar Saída</div>' : ''}
                                                ${canEditRegistros ? '<div class="dropdown-option" data-value="remover"><i data-lucide="x-circle" class="w-4 h-4 inline mr-2"></i>Remover Acesso</div>' : ''}
                                                ${canEditRegistros ? '<div class="dropdown-option" data-value="pernoite"><i data-lucide="moon" class="w-4 h-4 inline mr-2"></i>Pernoite</div>' : ''}
                                                ${canEditRegistros ? '<div class="dropdown-option" data-value="alterar"><i data-lucide="repeat" class="w-4 h-4 inline mr-2"></i>Trocar Bicicleta</div>' : ''}
                                                ${canAddRegistros ? '<div class="dropdown-option" data-value="adicionar"><i data-lucide="plus-circle" class="w-4 h-4 inline mr-2"></i>Adicionar Outra Bike</div>' : ''}
                                            </div>
                                        </div>
                                    </div>
                                ` : !registro.dataHoraSaida && !registro.pernoite ? '<span class="text-xs text-slate-500">Em aberto</span>' : registro.pernoite && !registro.dataHoraSaida && registro.registroOriginalId && (canEditRegistros || canAddRegistros) ? `
                                    <div class="flex flex-col gap-2">
                                        <div class="custom-dropdown-wrapper">
                                            <div class="custom-dropdown action-dropdown" data-registro-id="${registro.id}" data-client-id="${client.id}" data-bike-id="${bike.id}">
                                                <div class="dropdown-button">
                                                    <span class="dropdown-text">Selecione uma ação</span>
                                                    <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                                <div class="dropdown-menu hidden">
                                                    ${canEditRegistros ? '<div class="dropdown-option" data-value="saida"><i data-lucide="log-out" class="w-4 h-4 inline mr-2"></i>Registrar Saída</div>' : ''}
                                                    ${canEditRegistros ? '<div class="dropdown-option" data-value="remover"><i data-lucide="x-circle" class="w-4 h-4 inline mr-2"></i>Remover Acesso</div>' : ''}
                                                    ${canEditRegistros ? '<div class="dropdown-option" data-value="pernoite"><i data-lucide="moon" class="w-4 h-4 inline mr-2"></i>Pernoite</div>' : ''}
                                                    ${canEditRegistros ? '<div class="dropdown-option" data-value="alterar"><i data-lucide="repeat" class="w-4 h-4 inline mr-2"></i>Trocar Bicicleta</div>' : ''}
                                                    ${canAddRegistros ? '<div class="dropdown-option" data-value="adicionar"><i data-lucide="plus-circle" class="w-4 h-4 inline mr-2"></i>Adicionar Outra Bike</div>' : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 px-2 py-1 rounded-full">PERNOITE Ativo</span>
                                            ${canEditRegistros ? `<button class="reverter-pernoite-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                                                    data-registro-id="${registro.id}"
                                                    title="Reverter pernoite">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                                    <path d="M21 3v5h-5"/>
                                                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                                    <path d="M8 16H3v5"/>
                                                </svg>
                                            </button>` : ''}
                                        </div>
                                    </div>
                                ` : registro.pernoite && !registro.dataHoraSaida && canEditRegistros ? `
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 px-2 py-1 rounded-full">PERNOITE Ativo</span>
                                        <button class="reverter-pernoite-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                                                data-registro-id="${registro.id}"
                                                title="Reverter pernoite">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                                <path d="M21 3v5h-5"/>
                                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                                <path d="M8 16H3v5"/>
                                            </svg>
                                        </button>
                                    </div>
                                ` : registro.pernoite && !registro.dataHoraSaida ? `
                                    <span class="text-xs font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 px-2 py-1 rounded-full">PERNOITE Ativo</span>
                                ` : registro.dataHoraSaida && canEditRegistros ? `
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-medium ${registro.acessoRemovido ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/50' : 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50'} px-2 py-1 rounded-full">${registro.acessoRemovido ? 'Acesso Removido' : 'Concluído'}</span>
                                        <button class="reverter-acao-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                                                data-registro-id="${registro.id}"
                                                title="Reverter ação">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                                <path d="M21 3v5h-5"/>
                                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                                <path d="M8 16H3v5"/>
                                            </svg>
                                        </button>
                                    </div>
                                ` : registro.dataHoraSaida ? `
                                    <span class="text-xs font-medium ${registro.acessoRemovido ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/50' : 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50'} px-2 py-1 rounded-full">${registro.acessoRemovido ? 'Acesso Removido' : 'Concluído'}</span>
                                ` : `
                                    <span class="text-xs text-slate-500">Sem ações disponíveis</span>
                                `}
                            </td>
                            <td class="p-3 align-top flex items-center gap-2">
                                ${client.comentarios && client.comentarios.length > 0 ? `
                                <div class="relative">
                                    <button class="view-comments-btn flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full cursor-pointer" 
                                            data-client-id="${client.id}"
                                            title="Ver comentários">
                                        <i data-lucide="message-circle" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                                    </button>
                                    <span class="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-500 rounded-full">${client.comentarios.length}</span>
                                </div>
                                ` : `
                                <button class="view-comments-btn text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                        data-client-id="${client.id}"
                                        title="Ver comentários">
                                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                                </button>
                                `}
                                ${canEditRegistros ? `
                                <button class="edit-registro-btn text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" 
                                        data-registro-id="${registro.id}"
                                        title="Editar registro">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                        <path d="m15 5 4 4"/>
                                    </svg>
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                }).join('')}
                </tbody>
            </table>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <i data-lucide="tag" class="w-5 h-5 text-blue-600 dark:text-blue-400"></i>
                        <span>Categorias Registradas</span>
                    </h3>
                    ${this.renderCategoriasSummary(dailyRecords)}
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <i data-lucide="moon" class="w-5 h-5 text-purple-600 dark:text-purple-400"></i>
                        <span>Pernoite</span>
                    </h3>
                    ${this.renderPernoiteSummary(dailyRecords)}
                </div>
            </div>
        `;

        this.elements.dailyRecordsList.innerHTML = registrosTable;
        lucide.createIcons();
    }

    renderCategoriasSummary(dailyRecords) {
        const categorias = Storage.loadCategorias();
        
        // Contar registros por categoria
        const categoriasCount = {};
        dailyRecords.forEach(({ registro }) => {
            const categoria = registro.categoria || 'Sem Categoria';
            categoriasCount[categoria] = (categoriasCount[categoria] || 0) + 1;
        });

        if (Object.keys(categoriasCount).length === 0) {
            return `<p class="text-sm text-slate-500 dark:text-slate-400">Nenhuma categoria registrada.</p>`;
        }

        return `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                ${Object.entries(categoriasCount).map(([categoria, count]) => {
                    const emoji = categoria === 'Sem Categoria' ? '⚙️' : (categorias[categoria] || '⚙️');
                    const iconMap = {
                        '👤': 'user',
                        '🏢': 'building',
                        '🍽️': 'utensils',
                        '💪': 'dumbbell',
                        '👨': 'user',
                        '🏪': 'store',
                        '⚙️': 'settings',
                        '🎯': 'target',
                        '📱': 'smartphone',
                        '📊': 'bar-chart',
                        '🔧': 'wrench',
                        '🎨': 'palette',
                        '⭐': 'star',
                        '📦': 'package',
                        '🚀': 'rocket',
                        '🛍️': 'shopping-bag',
                        '☕': 'coffee'
                    };
                    const iconName = iconMap[emoji] || 'circle';
                    return `
                        <div class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer categoria-box" data-categoria="${categoria}">
                            <i data-lucide="${iconName}" class="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0"></i>
                            <div class="flex-1">
                                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">${categoria}</p>
                                <p class="text-lg font-semibold text-slate-800 dark:text-slate-100">${count}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderPernoiteSummary(dailyRecords) {
        const pernoiteRecords = dailyRecords.filter(({ registro }) => registro.pernoite);
        
        if (pernoiteRecords.length === 0) {
            return `<p class="text-sm text-slate-500 dark:text-slate-400">Nenhum pernoite registrado.</p>`;
        }

        const canEditRegistros = Auth.hasPermission('registros', 'editar');
        
        return `
            <div class="space-y-3">
                ${pernoiteRecords.map(({ client, bike, registro }) => `
                    <div class="flex items-center justify-between p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20">
                        <div class="flex-1">
                            <p class="font-medium text-slate-800 dark:text-slate-100">${client.nome}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${bike.modelo} (${bike.marca} - ${bike.cor})</p>
                        </div>
                        <span class="text-xs font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 px-2 py-1 rounded-full inline-flex items-center gap-1"><i data-lucide="moon" class="w-3 h-3"></i> PERNOITE</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    toggleExportMenu(show) {
        const isHidden = this.elements.exportOptions.classList.contains('hidden');
        if (show === undefined) {
            this.elements.exportOptions.classList.toggle('hidden');
        } else if (show && isHidden) {
            this.elements.exportOptions.classList.remove('hidden');
        } else if (!show && !isHidden) {
            this.elements.exportOptions.classList.add('hidden');
        }
    }

    async exportToCSV() {
        try {
            Auth.requirePermission('registros', 'ver');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }

        this.toggleExportMenu(false);
        if (this.app.data.currentDailyRecords.length === 0) {
            await Modals.showAlert('Não há dados para exportar.', 'Atenção');
            return;
        }

        const headers = ['Cliente', 'CPF', 'Bicicleta', 'Marca', 'Cor', 'Entrada', 'Saída'];
        const escapeCsv = (field) => {
            if (field === null || field === undefined) return '';
            let str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = '"' + str.replace(new RegExp('"', 'g'), '""') + '"';
            }
            return str;
        };

        const rows = this.app.data.currentDailyRecords.map(({ client, bike, registro }) => [
            escapeCsv(client.nome),
            escapeCsv(client.cpf),
            escapeCsv(bike.modelo),
            escapeCsv(bike.marca),
            escapeCsv(bike.cor),
            escapeCsv(new Date(registro.dataHoraEntrada).toLocaleString('pt-BR')),
            escapeCsv(registro.dataHoraSaida ? new Date(registro.dataHoraSaida).toLocaleString('pt-BR') : 'Em aberto')
        ]);

        let csvContent = headers.join(",") + "\r\n" + rows.map(e => e.join(",")).join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const selectedDateStr = this.elements.dailyRecordsDateInput.value;
        link.setAttribute("download", `registros_${selectedDateStr || 'data_selecionada'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportToPDF() {
        try {
            Auth.requirePermission('registros', 'ver');
        } catch (error) {
            Modals.alert(error.message, 'Permissão Negada');
            return;
        }

        this.toggleExportMenu(false);
        if (this.app.data.currentDailyRecords.length === 0) {
            await Modals.showAlert('Não há dados para exportar.', 'Atenção');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const categorias = Storage.loadCategorias();
        
        const head = [['Cliente', 'Categoria', 'Bicicleta', 'Entrada', 'Saída']];
        const body = this.app.data.currentDailyRecords.map(({ client, bike, registro }) => {
            const categoria = registro.categoria || client.categoria || '';
            const categoriaDisplay = categoria ? categoria : '-';
            
            return [
                `${client.nome}\n(${client.cpf})`,
                categoriaDisplay,
                `${bike.modelo}\n(${bike.marca} - ${bike.cor})`,
                new Date(registro.dataHoraEntrada).toLocaleString('pt-BR'),
                registro.dataHoraSaida ? new Date(registro.dataHoraSaida).toLocaleString('pt-BR') : 'Em aberto'
            ];
        });
        
        const selectedDateStr = this.elements.dailyRecordsDateInput.value;
        const selectedDate = new Date(selectedDateStr);
        const formattedDate = selectedDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'});

        doc.text(`Registros do dia: ${formattedDate}`, 14, 15);
        doc.autoTable({
            startY: 20,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });

        const categoriaCounts = {};
        const categoriaPernoite = {};
        this.app.data.currentDailyRecords.forEach(({ client, registro }) => {
            const categoria = registro.categoria || client.categoria || 'Sem Categoria';
            categoriaCounts[categoria] = (categoriaCounts[categoria] || 0) + 1;
            if (registro.pernoite || registro.registroOriginalId) {
                categoriaPernoite[categoria] = (categoriaPernoite[categoria] || 0) + 1;
            }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Estatísticas por Categoria:', 14, finalY);
        finalY += 7;
        
        doc.setFontSize(10);
        Object.entries(categoriaCounts).sort((a, b) => b[1] - a[1]).forEach(([nome, count]) => {
            const pernoiteCount = categoriaPernoite[nome] || 0;
            const pernoiteText = pernoiteCount > 0 ? ` (${pernoiteCount} pernoite)` : '';
            doc.text(`${nome}: ${count} registro(s)${pernoiteText}`, 14, finalY);
            finalY += 5;
        });

        doc.save(`registros_${selectedDateStr}.pdf`);
    }

    applyPermissionsToUI() {
        const canView = Auth.hasPermission('registros', 'ver');
        const canAdd = Auth.hasPermission('registros', 'adicionar');
        const canEdit = Auth.hasPermission('registros', 'editar');

        if (!canView) {
            if (this.elements.exportBtn) this.elements.exportBtn.style.display = 'none';
        }

        if (!canAdd) {
            if (this.elements.addRegistroBtn) this.elements.addRegistroBtn.style.display = 'none';
        }

        this.renderDailyRecords();
    }
}
