import { FileStorage } from './file-storage.js';
import { Utils } from './utils.js';

const isElectron = typeof window !== 'undefined' && window.electron;

let fileStorageAvailable = false;

async function checkFileStorage() {
    if (!isElectron) {
        fileStorageAvailable = await FileStorage.isAvailable();
        if (fileStorageAvailable) {
            console.log('✅ API de arquivos disponível - dados serão salvos em: dados/navegador/');
        } else {
            console.log('ℹ️ API de arquivos indisponível - usando localStorage');
        }
    } else {
        const storagePath = await window.electron.getStoragePath();
        console.log('💾 Electron Desktop - dados em:', storagePath);
    }
}

checkFileStorage();

function normalizeClients(clients) {
    let needsSave = false;
    clients.forEach(client => {
        if (!client.id) {
            client.id = Utils.generateUUID();
            needsSave = true;
        }
    });
    return { clients, needsSave };
}

export const Storage = {
    async saveClients(clients) {
        if (isElectron) {
            await window.electron.saveClients(clients);
        } else {
            localStorage.setItem('bicicletario_clients', JSON.stringify(clients));
            if (fileStorageAvailable) {
                for (const client of clients) {
                    try {
                        await FileStorage.saveClient(client);
                    } catch (error) {
                        console.warn('Erro ao salvar cliente em arquivo:', error);
                    }
                }
            }
        }
    },

    async loadClients() {
        let clients = [];
        
        if (isElectron) {
            clients = await window.electron.loadClients();
        } else {
            if (fileStorageAvailable) {
                try {
                    clients = await FileStorage.loadAllClients();
                    localStorage.setItem('bicicletario_clients', JSON.stringify(clients));
                } catch (error) {
                    console.warn('Erro ao carregar clientes de arquivo:', error);
                    const data = localStorage.getItem('bicicletario_clients');
                    clients = data ? JSON.parse(data) : [];
                }
            } else {
                const data = localStorage.getItem('bicicletario_clients');
                clients = data ? JSON.parse(data) : [];
            }
        }
        
        const { clients: normalizedClients, needsSave } = normalizeClients(clients);
        if (needsSave) {
            await this.saveClients(normalizedClients);
        }
        
        return normalizedClients;
    },

    async saveClient(client) {
        if (isElectron) {
            const clients = await this.loadClients();
            const index = clients.findIndex(c => c.id === client.id);
            if (index >= 0) {
                clients[index] = client;
            } else {
                clients.push(client);
            }
            await window.electron.saveClients(clients);
            return clients;
        } else {
            const clients = this.loadClientsSync();
            const index = clients.findIndex(c => c.id === client.id);
            if (index >= 0) {
                clients[index] = client;
            } else {
                clients.push(client);
            }
            localStorage.setItem('bicicletario_clients', JSON.stringify(clients));
            
            if (fileStorageAvailable) {
                try {
                    await FileStorage.saveClient(client);
                } catch (error) {
                    console.warn('Erro ao salvar cliente em arquivo:', error);
                }
            }
            
            return clients;
        }
    },

    loadClientsSync() {
        const data = localStorage.getItem('bicicletario_clients');
        if (!data) return [];
        
        const clients = JSON.parse(data);
        const { clients: normalizedClients, needsSave } = normalizeClients(clients);
        
        if (needsSave) {
            localStorage.setItem('bicicletario_clients', JSON.stringify(normalizedClients));
        }
        
        return normalizedClients;
    },

    async deleteClient(cpf) {
        if (isElectron) {
            const clients = await this.loadClients();
            const filtered = clients.filter(c => c.cpf.replace(/\D/g, '') !== cpf.replace(/\D/g, ''));
            await window.electron.saveClients(filtered);
            return { success: true };
        } else {
            const clients = this.loadClientsSync();
            const filtered = clients.filter(c => c.cpf.replace(/\D/g, '') !== cpf.replace(/\D/g, ''));
            localStorage.setItem('bicicletario_clients', JSON.stringify(filtered));
            
            if (fileStorageAvailable) {
                try {
                    await FileStorage.deleteClient(cpf);
                } catch (error) {
                    console.warn('Erro ao deletar cliente de arquivo:', error);
                }
            }
            
            return { success: true };
        }
    },

    async saveRegistros(registros) {
        if (isElectron) {
            await window.electron.saveRegistros(registros);
        } else {
            localStorage.setItem('bicicletario_registros', JSON.stringify(registros));
            this.organizeRegistrosByDate(registros);
            
            if (fileStorageAvailable) {
                for (const registro of registros) {
                    try {
                        await FileStorage.saveRegistro(registro);
                    } catch (error) {
                        console.warn('Erro ao salvar registro em arquivo:', error);
                    }
                }
            }
        }
    },

    async saveRegistro(registro) {
        if (isElectron) {
            const registros = await this.loadRegistros();
            const index = registros.findIndex(r => r.id === registro.id);
            if (index >= 0) {
                registros[index] = registro;
            } else {
                registros.push(registro);
            }
            await window.electron.saveRegistros(registros);
            return { success: true };
        } else {
            const registros = this.loadRegistrosSync();
            const index = registros.findIndex(r => r.id === registro.id);
            if (index >= 0) {
                registros[index] = registro;
            } else {
                registros.push(registro);
            }
            localStorage.setItem('bicicletario_registros', JSON.stringify(registros));
            this.organizeRegistrosByDate(registros);
            
            if (fileStorageAvailable) {
                try {
                    await FileStorage.saveRegistro(registro);
                } catch (error) {
                    console.warn('Erro ao salvar registro em arquivo:', error);
                }
            }
            
            return { success: true };
        }
    },

    async loadRegistros() {
        if (isElectron) {
            return await window.electron.loadRegistros();
        } else {
            if (fileStorageAvailable) {
                try {
                    const registros = await FileStorage.loadAllRegistros();
                    localStorage.setItem('bicicletario_registros', JSON.stringify(registros));
                    this.organizeRegistrosByDate(registros);
                    return registros;
                } catch (error) {
                    console.warn('Erro ao carregar registros de arquivo:', error);
                }
            }
            const data = localStorage.getItem('bicicletario_registros');
            return data ? JSON.parse(data) : [];
        }
    },

    loadRegistrosSync() {
        const data = localStorage.getItem('bicicletario_registros');
        return data ? JSON.parse(data) : [];
    },

    organizeRegistrosByDate(registros) {
        const organized = {};
        
        registros.forEach(registro => {
            const entryDate = new Date(registro.dataHoraEntrada);
            const year = entryDate.getFullYear().toString();
            const month = String(entryDate.getMonth() + 1).padStart(2, '0');
            const day = String(entryDate.getDate()).padStart(2, '0');
            
            if (!organized[year]) organized[year] = {};
            if (!organized[year][month]) organized[year][month] = {};
            if (!organized[year][month][day]) organized[year][month][day] = [];
            
            organized[year][month][day].push(registro);
        });
        
        if (!isElectron) {
            localStorage.setItem('bicicletario_registros_organizados', JSON.stringify(organized));
            const summary = this.generateStorageSummary(organized);
            localStorage.setItem('bicicletario_registros_resumo', JSON.stringify(summary));
        }
        
        return organized;
    },

    generateStorageSummary(organized) {
        const summary = {
            totalRegistros: 0,
            anos: {}
        };
        
        Object.keys(organized).forEach(year => {
            summary.anos[year] = {
                totalMeses: Object.keys(organized[year]).length,
                meses: {}
            };
            
            Object.keys(organized[year]).forEach(month => {
                const monthName = this.getMonthName(parseInt(month));
                summary.anos[year].meses[month] = {
                    nome: monthName,
                    totalDias: Object.keys(organized[year][month]).length,
                    totalRegistros: 0,
                    dias: {}
                };
                
                Object.keys(organized[year][month]).forEach(day => {
                    const dayRegistros = organized[year][month][day].length;
                    summary.anos[year].meses[month].totalRegistros += dayRegistros;
                    summary.anos[year].meses[month].dias[day] = dayRegistros;
                    summary.totalRegistros += dayRegistros;
                });
            });
        });
        
        return summary;
    },

    getMonthName(month) {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return months[month - 1];
    },

    async loadRegistrosByDate(year, month, day) {
        if (isElectron) {
            const allRegistros = await window.electron.loadRegistros();
            return allRegistros.filter(reg => {
                const date = new Date(reg.dataHoraEntrada);
                const matchYear = !year || date.getFullYear() === parseInt(year);
                const matchMonth = !month || (date.getMonth() + 1) === parseInt(month);
                const matchDay = !day || date.getDate() === parseInt(day);
                return matchYear && matchMonth && matchDay;
            });
        } else {
            const organized = localStorage.getItem('bicicletario_registros_organizados');
            if (!organized) return [];
            
            const data = JSON.parse(organized);
            
            if (year && month && day) {
                return data[year]?.[month]?.[day] || [];
            } else if (year && month) {
                const monthData = data[year]?.[month] || {};
                return Object.values(monthData).flat();
            } else if (year) {
                const yearData = data[year] || {};
                return Object.values(yearData).map(month => Object.values(month).flat()).flat();
            }
            
            return [];
        }
    },

    async loadStorageSummary() {
        if (isElectron) {
            const allRegistros = await window.electron.loadRegistros();
            const organized = this.organizeRegistrosByDate(allRegistros);
            return this.generateStorageSummary(organized);
        } else {
            const data = localStorage.getItem('bicicletario_registros_resumo');
            return data ? JSON.parse(data) : null;
        }
    },

    generateSummaryFromStructure(structure) {
        const summary = {
            totalRegistros: 0,
            anos: {}
        };

        Object.keys(structure).forEach(year => {
            summary.anos[year] = {
                totalMeses: Object.keys(structure[year]).length,
                meses: {}
            };
            
            Object.keys(structure[year]).forEach(month => {
                const monthName = this.getMonthName(parseInt(month));
                summary.anos[year].meses[month] = {
                    nome: monthName,
                    totalDias: structure[year][month].length,
                    totalRegistros: 0,
                    dias: {}
                };
                
                structure[year][month].forEach(day => {
                    summary.anos[year].meses[month].dias[day] = 1;
                    summary.totalRegistros += 1;
                    summary.anos[year].meses[month].totalRegistros += 1;
                });
            });
        });
        
        return summary;
    },

    async getOrganizedRegistros() {
        if (isElectron) {
            const allRegistros = await window.electron.loadRegistros();
            return this.organizeRegistrosByDate(allRegistros);
        } else {
            const data = localStorage.getItem('bicicletario_registros_organizados');
            return data ? JSON.parse(data) : {};
        }
    },

    async getStoragePath() {
        if (isElectron) {
            return await window.electron.getStoragePath();
        }
        return null;
    },

    migrateOldData() {
        if (isElectron) {
            return null;
        }

        const oldData = localStorage.getItem('bicicletarioData');
        if (oldData && !localStorage.getItem('bicicletario_clients')) {
            try {
                const clientsWithRecords = JSON.parse(oldData);
                const newClients = [];
                const newRegistros = [];

                clientsWithRecords.forEach(client => {
                    const newClient = { ...client, bicicletas: [] };
                    (client.bicicletas || []).forEach(bike => {
                        const newBike = { ...bike };
                        if (bike.registros && Array.isArray(bike.registros)) {
                            bike.registros.forEach(registro => {
                                newRegistros.push({
                                    ...registro,
                                    clientId: client.id,
                                    bikeId: bike.id
                                });
                            });
                        }
                        delete newBike.registros;
                        newClient.bicicletas.push(newBike);
                    });
                    newClients.push(newClient);
                });

                localStorage.setItem('bicicletario_clients', JSON.stringify(newClients));
                localStorage.setItem('bicicletario_registros', JSON.stringify(newRegistros));
                this.organizeRegistrosByDate(newRegistros);
                localStorage.removeItem('bicicletarioData');
                return { clients: newClients, registros: newRegistros };
            } catch (error) {
                localStorage.removeItem('bicicletarioData');
            }
        }
        return null;
    },

    loadCategorias() {
        if (isElectron && window.electron && window.electron.loadCategorias) {
            // No Electron, loadCategorias é geralmente assíncrono, mas aqui estamos em um contexto síncrono ou legado
            // Para simplificar e manter compatibilidade, vamos usar o localStorage como fonte primária na web
        }
        const data = localStorage.getItem('bicicletario_categorias');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
                if (Array.isArray(parsed)) {
                    const obj = {};
                    parsed.forEach(cat => {
                        obj[cat] = this.getDefaultEmoji(cat);
                    });
                    this.saveCategorias(obj);
                    return obj;
                }
            } catch (e) {
                console.error('Erro ao carregar categorias:', e);
            }
        }
        const defaultCategories = {
            'CLIENTE': 'user',
            'LOJISTA': 'store',
            'IFOOD': 'utensils',
            'ACADEMIA': 'dumbbell',
            'MORADOR': 'home',
            'VISITANTE': 'user',
            'VIP': 'star',
            'ENTREGA': 'package'
        };
        this.saveCategorias(defaultCategories);
        return defaultCategories;
    },

    getDefaultIcon(categoryName) {
        const categoryUpper = categoryName.toUpperCase();
        const iconMap = {
            'CLIENTE': 'user',
            'LOJISTA': 'store',
            'IFOOD': 'utensils',
            'ACADEMIA': 'dumbbell',
            'MORADOR': 'home',
            'VISITANTE': 'user',
            'VIP': 'star',
            'ENTREGA': 'package'
        };
        return iconMap[categoryUpper] || 'settings';
    },

    // Keep for backward compatibility during migration
    getDefaultEmoji(categoryName) {
        return this.getDefaultIcon(categoryName);
    },

    async saveCategorias(categorias) {
        // Migrate emojis to icon names if needed
        const migratedCategorias = this.migrateCategorias(categorias);
        
        if (isElectron) {
            await window.electron.saveCategorias(migratedCategorias);
        }
        localStorage.setItem('bicicletario_categorias', JSON.stringify(migratedCategorias));
    },

    migrateCategorias(categorias) {
        const emojiToIconMap = {
            '👤': 'user',
            '👨': 'user',
            '🏢': 'building',
            '🍽️': 'utensils',
            '💪': 'dumbbell',
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
            '☕': 'coffee',
            '💼': 'briefcase',
            '❤️': 'heart',
            '🚚': 'truck',
            '🏠': 'home',
            '🚶': 'user'
        };

        const migrated = {};
        Object.entries(categorias).forEach(([name, value]) => {
            // If value is an emoji, convert it to icon name
            if (emojiToIconMap[value]) {
                migrated[name] = emojiToIconMap[value];
            } else if (typeof value === 'string' && value.length === 1) {
                // If it's a single character emoji not in map, default to settings
                migrated[name] = 'settings';
            } else {
                // Already an icon name, keep it
                migrated[name] = value;
            }
        });
        
        return migrated;
    }
};
