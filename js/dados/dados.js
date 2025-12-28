import { Storage } from '../shared/storage.js';
import { Utils } from '../shared/utils.js';
import { Modals } from '../shared/modals.js';
import { Auth } from '../shared/auth.js';

export class DadosManager {
    constructor(app) {
        this.app = app;
        this.elements = {
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
            deleteClientes: document.getElementById('delete-clientes'),
            deleteRegistros: document.getElementById('delete-registros'),
            deleteCategorias: document.getElementById('delete-categorias'),
            deleteClientesCount: document.getElementById('delete-clientes-count'),
            deleteRegistrosCount: document.getElementById('delete-registros-count'),
            deleteCategoriasCount: document.getElementById('delete-categorias-count'),
            deleteDataBtn: document.getElementById('delete-data-btn'),
            deleteStatus: document.getElementById('delete-status'),
        };
        this.init();
    }

    init() {
        this.addEventListeners();
    }

    addEventListeners() {
        if (this.elements.importFile) {
            this.elements.importFile.addEventListener('change', (e) => {
                this.elements.importBtn.disabled = !e.target.files.length;
            });
        }

        if (this.elements.importBtn) {
            this.elements.importBtn.addEventListener('click', () => this.handleImport());
        }
        
        if (this.elements.exportExcelBtn) {
            this.elements.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
        
        if (this.elements.exportCsvBtn) {
            this.elements.exportCsvBtn.addEventListener('click', () => this.exportToCSV());
        }

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

        if (this.elements.deleteClientes) {
            this.elements.deleteClientes.addEventListener('change', () => this.updateDeleteButtonState());
        }
        if (this.elements.deleteRegistros) {
            this.elements.deleteRegistros.addEventListener('change', () => this.updateDeleteButtonState());
        }
        if (this.elements.deleteCategorias) {
            this.elements.deleteCategorias.addEventListener('change', () => this.updateDeleteButtonState());
        }
        if (this.elements.deleteDataBtn) {
            this.elements.deleteDataBtn.addEventListener('click', () => this.handleDeleteData());
        }
        
        this.updateDeleteCounts();
    }

    updateDeleteCounts() {
        if (this.elements.deleteClientesCount) {
            this.elements.deleteClientesCount.textContent = this.app.data.clients?.length || 0;
        }
        if (this.elements.deleteRegistrosCount) {
            this.elements.deleteRegistrosCount.textContent = this.app.data.registros?.length || 0;
        }
        if (this.elements.deleteCategoriasCount) {
            const categorias = Storage.loadCategorias();
            this.elements.deleteCategoriasCount.textContent = Object.keys(categorias).length;
        }
    }

    updateDeleteButtonState() {
        const anyChecked = 
            this.elements.deleteClientes?.checked || 
            this.elements.deleteRegistros?.checked || 
            this.elements.deleteCategorias?.checked;
        
        if (this.elements.deleteDataBtn) {
            this.elements.deleteDataBtn.disabled = !anyChecked;
        }
    }

    async handleDeleteData() {
        try {
            Auth.requirePermission('dados', 'importarSistema');
        } catch (error) {
            Modals.alert(error.message, 'Permissao Negada');
            return;
        }

        const deleteClientes = this.elements.deleteClientes?.checked;
        const deleteRegistros = this.elements.deleteRegistros?.checked;
        const deleteCategorias = this.elements.deleteCategorias?.checked;

        if (!deleteClientes && !deleteRegistros && !deleteCategorias) {
            Modals.alert('Selecione pelo menos um tipo de dado para apagar.', 'Aviso');
            return;
        }

        const items = [];
        if (deleteClientes) items.push('Clientes');
        if (deleteRegistros) items.push('Registros de Acesso');
        if (deleteCategorias) items.push('Categorias');

        const confirmed = await Modals.showConfirm(
            `Tem certeza que deseja apagar permanentemente: ${items.join(', ')}?\n\nEsta acao NAO pode ser desfeita!`
        );

        if (!confirmed) return;

        // Aguardar um momento antes de mostrar o segundo modal
        const MODAL_TRANSITION_DELAY = 400; // Tempo para garantir que o primeiro modal fechou completamente
        await new Promise(resolve => setTimeout(resolve, MODAL_TRANSITION_DELAY));

        const doubleConfirmed = await Modals.showConfirm(
            'ATENCAO FINAL: Todos os dados selecionados serao REMOVIDOS PERMANENTEMENTE. Confirma a exclusao?'
        );

        if (!doubleConfirmed) return;

        try {
            const statusEl = this.elements.deleteStatus;
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.className = 'text-sm text-blue-600 dark:text-blue-400';
                statusEl.textContent = 'Apagando dados...';
            }

            const results = [];

            if (deleteClientes) {
                const count = this.app.data.clients.length;
                this.app.data.clients = [];
                await Storage.saveClients([]);
                results.push(`${count} clientes`);
            }

            if (deleteRegistros) {
                const count = this.app.data.registros.length;
                this.app.data.registros = [];
                await Storage.saveRegistros([]);
                results.push(`${count} registros`);
            }

            if (deleteCategorias) {
                const categorias = Storage.loadCategorias();
                const count = Object.keys(categorias).length;
                Storage.saveCategorias({});
                results.push(`${count} categorias`);
            }

            if (this.elements.deleteClientes) this.elements.deleteClientes.checked = false;
            if (this.elements.deleteRegistros) this.elements.deleteRegistros.checked = false;
            if (this.elements.deleteCategorias) this.elements.deleteCategorias.checked = false;
            this.updateDeleteButtonState();
            this.updateDeleteCounts();

            if (this.app.clientesManager) {
                this.app.clientesManager.renderClientList();
            }
            if (this.app.registrosDiariosManager) {
                this.app.registrosDiariosManager.renderRegistros();
            }
            if (this.app.configuracaoManager) {
                this.app.configuracaoManager.renderCategorias();
            }

            if (statusEl) {
                statusEl.className = 'text-sm text-green-600 dark:text-green-400';
                statusEl.textContent = `Dados apagados com sucesso: ${results.join(', ')}.`;
                setTimeout(() => {
                    statusEl.classList.add('hidden');
                }, 5000);
            }

            Modals.alert(`Dados removidos com sucesso!\n\n${results.join('\n')}`, 'Sucesso');

        } catch (error) {
            console.error('Erro ao apagar dados:', error);
            const statusEl = this.elements.deleteStatus;
            if (statusEl) {
                statusEl.className = 'text-sm text-red-600 dark:text-red-400';
                statusEl.textContent = `Erro ao apagar: ${error.message}`;
            }
            Modals.alert(`Erro ao apagar dados: ${error.message}`, 'Erro');
        }
    }

    async handleImport() {
        try {
            Auth.requirePermission('dados', 'importar');
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
                const nome = String(row[0]).trim().toUpperCase();
                const telefoneRaw = String(row[1] || '').trim();
                const telefone = telefoneRaw.replace(/\D/g, '');
                const cpf = String(row[2]).replace(/\D/g, '');
                const categoriaRaw = row.length >= 4 ? String(row[3] || '').trim().toUpperCase() : '';
                
                let categoria = '';
                if (categoriaRaw) {
                    if (categoriaRaw in categoriasExistentes) {
                        categoria = categoriaRaw;
                    } else {
                        categoriasExistentes[categoriaRaw] = Storage.getDefaultEmoji(categoriaRaw);
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

        if (this.app.configuracaoManager) {
            this.app.configuracaoManager.renderCategorias();
        }
        return imported;
    }

    exportToExcel() {
        try {
            Auth.requirePermission('dados', 'exportarDados');
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
            Auth.requirePermission('dados', 'exportarDados');
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

    exportSystemToExcel() {
        try {
            Auth.requirePermission('dados', 'exportarSistema');
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
            Auth.requirePermission('dados', 'exportarSistema');
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
            Auth.requirePermission('dados', 'importarSistema');
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
            
            if (row.length >= 7) {
                categoria = row[4] || '';
                
                if (row[5] && row[5].trim()) {
                    try {
                        const parsed = JSON.parse(row[5]);
                        comentarios = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.warn(`Erro ao parsear comentários para cliente ${row[0]} (valor: "${row[5]}"): ${e.message}`);
                        comentarios = [];
                    }
                }
                
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

            if (row.length >= 10) {
                let bikeSnapshot = null;
                
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
        const canExportarDados = Auth.hasPermission('dados', 'exportarDados');
        const canExportarSistema = Auth.hasPermission('dados', 'exportarSistema');
        const canImportarDados = Auth.hasPermission('dados', 'importar');
        const canImportarSistema = Auth.hasPermission('dados', 'importarSistema');

        if (!canExportarDados) {
            if (this.elements.exportExcelBtn) this.elements.exportExcelBtn.style.display = 'none';
            if (this.elements.exportCsvBtn) this.elements.exportCsvBtn.style.display = 'none';
        }

        if (!canExportarSistema) {
            if (this.elements.exportSystemExcelBtn) this.elements.exportSystemExcelBtn.style.display = 'none';
            if (this.elements.exportSystemCsvBtn) this.elements.exportSystemCsvBtn.style.display = 'none';
        }

        if (!canImportarDados) {
            if (this.elements.importFile) this.elements.importFile.style.display = 'none';
            if (this.elements.importBtn) this.elements.importBtn.style.display = 'none';
        }

        if (!canImportarSistema) {
            if (this.elements.importSystemFile) this.elements.importSystemFile.style.display = 'none';
            if (this.elements.importSystemBtn) this.elements.importSystemBtn.style.display = 'none';
        }
    }
}
