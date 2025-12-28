export const Modals = {
    currentModal: null,

    show(title, content) {
        this.close();
        
        const modalHtml = `
            <div id="dynamic-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-300">
                <div class="modal-content bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform scale-95 transition-transform duration-300">
                    <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
                        <h2 class="text-xl font-semibold text-slate-800 dark:text-slate-200">${title}</h2>
                        <button onclick="Modals.close()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="p-6">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.currentModal = document.getElementById('dynamic-modal');
        
        lucide.createIcons();
        
        setTimeout(() => {
            this.currentModal.classList.remove('opacity-0');
            this.currentModal.querySelector('.modal-content').classList.remove('scale-95');
            this.currentModal.querySelector('.modal-content').classList.add('scale-100');
        }, 10);
    },

    close() {
        if (this.currentModal) {
            this.currentModal.classList.add('opacity-0');
            this.currentModal.querySelector('.modal-content').classList.remove('scale-100');
            this.currentModal.querySelector('.modal-content').classList.add('scale-95');
            
            setTimeout(() => {
                this.currentModal.remove();
                this.currentModal = null;
            }, 300);
        }
    },

    async alert(message, title = 'Aviso') {
        return this.showAlert(message, title);
    },

    showConfirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm-modal');
            const MODAL_ANIMATION_DURATION = 300;
            const MODAL_CLOSE_BUFFER = 50; // Extra buffer for safety
            
            // Aguardar se o modal ainda estiver visível (fechando)
            const waitForClose = () => {
                return new Promise((res) => {
                    if (modal.classList.contains('hidden')) {
                        res();
                    } else {
                        // Aguardar a animação de fechamento terminar
                        setTimeout(() => res(), MODAL_ANIMATION_DURATION + MODAL_CLOSE_BUFFER);
                    }
                });
            };
            
            waitForClose().then(() => {
                const titleEl = document.getElementById('confirm-title');
                const messageEl = document.getElementById('confirm-message');
                const oldOkBtn = document.getElementById('confirm-ok-btn');
                const oldCancelBtn = document.getElementById('confirm-cancel-btn');

                // Clone buttons to remove all old event listeners
                const okBtn = oldOkBtn.cloneNode(true);
                const cancelBtn = oldCancelBtn.cloneNode(true);
                oldOkBtn.parentNode.replaceChild(okBtn, oldOkBtn);
                oldCancelBtn.parentNode.replaceChild(cancelBtn, oldCancelBtn);

                // Desabilitar botões inicialmente
                okBtn.disabled = true;
                cancelBtn.disabled = true;

                titleEl.textContent = title;
                messageEl.textContent = message;

                let isProcessing = false;
                let buttonsEnabled = false;

                const handleOk = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (isProcessing || !buttonsEnabled) return;
                    isProcessing = true;
                    cleanup().then(() => resolve(true));
                };

                const handleCancel = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (isProcessing || !buttonsEnabled) return;
                    isProcessing = true;
                    cleanup().then(() => resolve(false));
                };

                const cleanup = () => {
                    return new Promise((res) => {
                        const modalContent = modal.querySelector('.modal-content');
                        if (modalContent) {
                            modalContent.classList.remove('scale-100');
                            modalContent.classList.add('scale-95');
                        }
                        modal.classList.remove('show');
                        
                        setTimeout(() => {
                            modal.classList.add('hidden');
                            modal.removeEventListener('click', handleBackdropClick);
                            res();
                        }, MODAL_ANIMATION_DURATION);
                    });
                };

                // Prevenir cliques no backdrop
                const handleBackdropClick = (e) => {
                    if (e.target === modal && !isProcessing && buttonsEnabled) {
                        // Não fazer nada - forçar uso dos botões
                        e.preventDefault();
                        e.stopPropagation();
                    }
                };

                okBtn.addEventListener('click', handleOk, { once: true, capture: true });
                cancelBtn.addEventListener('click', handleCancel, { once: true, capture: true });
                modal.addEventListener('click', handleBackdropClick);

                modal.classList.remove('hidden');
                
                // Delay maior antes de mostrar e habilitar botões
                setTimeout(() => {
                    modal.classList.add('show');
                    const modalContent = modal.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.classList.remove('scale-95');
                        modalContent.classList.add('scale-100');
                    }
                    
                    // Habilitar botões após animação completa
                    setTimeout(() => {
                        okBtn.disabled = false;
                        cancelBtn.disabled = false;
                        buttonsEnabled = true;
                    }, 150);
                }, 50);
            });
        });
    },

    showAlert(message, title = 'Aviso') {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-alert-modal');
            const titleEl = document.getElementById('alert-title');
            const messageEl = document.getElementById('alert-message');
            const oldOkBtn = document.getElementById('alert-ok-btn');

            // Clone button to remove all old event listeners
            const okBtn = oldOkBtn.cloneNode(true);
            oldOkBtn.parentNode.replaceChild(okBtn, oldOkBtn);

            titleEl.textContent = title;
            messageEl.textContent = message;

            let isProcessing = false;

            const handleOk = (e) => {
                e.stopPropagation();
                if (isProcessing) return;
                isProcessing = true;
                cleanup();
                resolve();
            };

            const cleanup = () => {
                modal.querySelector('.modal-content').classList.remove('scale-100');
                modal.querySelector('.modal-content').classList.add('scale-95');
                modal.classList.remove('show');
                
                setTimeout(() => {
                    modal.classList.add('hidden');
                }, 300);
            };

            // Use { once: true } to ensure the listener only executes once
            okBtn.addEventListener('click', handleOk, { once: true });

            modal.classList.remove('hidden');
            
            // Small delay before showing modal to avoid accidental clicks
            setTimeout(() => {
                modal.classList.add('show');
                modal.querySelector('.modal-content').classList.remove('scale-95');
                modal.querySelector('.modal-content').classList.add('scale-100');
            }, 50);
        });
    },

    confirm(message, title = 'Confirmação', onConfirm) {
        this.showConfirm(message, title).then((confirmed) => {
            if (confirmed && typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    },

    showInputPrompt(message, title = 'Entrada') {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-alert-modal');
            const titleEl = document.getElementById('alert-title');
            const messageEl = document.getElementById('alert-message');
            const oldOkBtn = document.getElementById('alert-ok-btn');

            // Clone button to remove all old event listeners
            const okBtn = oldOkBtn.cloneNode(true);
            oldOkBtn.parentNode.replaceChild(okBtn, oldOkBtn);

            titleEl.textContent = title;
            
            const inputHtml = `
                <p class="text-slate-600 dark:text-slate-400 mb-4">${message}</p>
                <input type="text" id="modal-input-field" class="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Digite aqui..." />
            `;
            messageEl.innerHTML = inputHtml;

            const inputField = document.getElementById('modal-input-field');
            
            let isProcessing = false;

            const handleOk = (e) => {
                if (e) e.stopPropagation();
                if (isProcessing) return;
                isProcessing = true;
                cleanup();
                resolve(inputField.value || null);
            };

            const handleKeyPress = (e) => {
                if (e.key === 'Enter') {
                    handleOk(e);
                    inputField.removeEventListener('keypress', handleKeyPress);
                }
            };

            const cleanup = () => {
                modal.querySelector('.modal-content').classList.remove('scale-100');
                modal.querySelector('.modal-content').classList.add('scale-95');
                modal.classList.remove('show');
                
                setTimeout(() => {
                    modal.classList.add('hidden');
                    okBtn.textContent = 'OK';
                }, 300);
                
                inputField.removeEventListener('keypress', handleKeyPress);
            };

            // Use { once: true } to ensure the listener only executes once
            okBtn.addEventListener('click', handleOk, { once: true });
            inputField.addEventListener('keypress', handleKeyPress);
            okBtn.textContent = 'Confirmar';

            modal.classList.remove('hidden');
            
            // Small delay before showing modal to avoid accidental clicks
            setTimeout(() => {
                modal.classList.add('show');
                modal.querySelector('.modal-content').classList.remove('scale-95');
                modal.querySelector('.modal-content').classList.add('scale-100');
                inputField.focus();
            }, 50);
        });
    }
};

window.Modals = Modals;
