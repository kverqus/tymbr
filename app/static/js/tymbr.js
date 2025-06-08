class ScriptPlatform {
    constructor() {
        this.currentScript = null;
        this.allScripts = [];
        this.filteredScripts = [];
        this.recentScripts = this.loadRecentScripts();
        this.favoriteScripts = this.loadFavoriteScripts();
        this.init();
    }

    init() {
        this.loadScripts();
        this.bindEvents();
        this.renderRecentScripts();
        this.renderFavoriteScripts();
    }

    loadRecentScripts() {
        try {
            const recent = JSON.parse(localStorage.getItem('recentScripts') || '[]');
            return recent.slice(0, 5); // Keep only last 5, make this a config option?
        } catch {
            return [];
        }
    }

    saveRecentScripts() {
        try {
            localStorage.setItem('recentScripts', JSON.stringify(this.recentScripts));
        } catch {
            // LocalStorage not available, ignore
        }
    }

    addToRecent(script) {
        this.recentScripts = this.recentScripts.filter(s => s.name !== script.name);

        this.recentScripts.unshift({
            ...script,
            lastUsed: new Date().toISOString()
        });

        // Keep only last 5
        this.recentScripts = this.recentScripts.slice(0, 5);

        this.saveRecentScripts();
        this.renderRecentScripts();
    }

    clearRecentScripts() {
        this.recentScripts = [];
        this.saveRecentScripts();
        this.renderRecentScripts();
    }

    renderRecentScripts() {
        const container = document.getElementById('recent-scripts');

        if (this.recentScripts.length === 0) {
            container.innerHTML = `
                <div class="no-recent has-text-grey has-text-centered p-3">
                    <i class="fas fa-history"></i><br>
                    <small>No recent scripts</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recentScripts.map(script => {
            const timeAgo = this.formatTimeAgo(new Date(script.lastUsed));
            return `
                <div class="sidebar-script-item" data-script="${script.name}">
                    <h6 class="has-text-light">${script.title}</h6>
                    <div class="script-time has-text-grey">${timeAgo}</div>
                </div>
            `;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.sidebar-script-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectScript(item.dataset.script);
            });
        });
    }

    // Favorites Management
    loadFavoriteScripts() {
        try {
            return JSON.parse(localStorage.getItem('favoriteScripts') || '[]');
        } catch {
            return [];
        }
    }

    saveFavoriteScripts() {
        try {
            localStorage.setItem('favoriteScripts', JSON.stringify(this.favoriteScripts));
        } catch {
            // LocalStorage not available, ignore
        }
    }

    addToFavorites(script) {
        if (!this.favoriteScripts.find(s => s.name === script.name)) {
            this.favoriteScripts.push({
                ...script,
                favorited: new Date().toISOString()
            });
            this.saveFavoriteScripts();
            this.renderFavoriteScripts();
            this.updateFavoriteButton(true);
        }
    }

    removeFromFavorites(scriptName) {
        this.favoriteScripts = this.favoriteScripts.filter(s => s.name !== scriptName);
        this.saveFavoriteScripts();
        this.renderFavoriteScripts();
        this.updateFavoriteButton(false);
    }

    clearFavoriteScripts() {
        this.favoriteScripts = [];
        this.saveFavoriteScripts();
        this.renderFavoriteScripts();
        this.updateFavoriteButton(false);
    }

    isFavorite(scriptName) {
        return this.favoriteScripts.some(s => s.name === scriptName);
    }

    toggleFavorite(scriptName) {
        if (this.isFavorite(scriptName)) {
            this.removeFromFavorites(scriptName);
        } else {
            const script = this.allScripts.find(s => s.name === scriptName);
            if (script) {
                this.addToFavorites(script);
            }
        }
        this.renderScriptGrid(); // Re-render to update star states
    }

    updateFavoriteButton(isFavorited) {
        const icon = document.getElementById('favorite-icon');
        const button = document.getElementById('toggle-favorite');

        if (isFavorited) {
            icon.className = 'fas fa-star has-text-warning';
            button.className = 'button is-large has-text-warning';
        } else {
            icon.className = 'far fa-star';
            button.className = 'button is-large';
        }
    }

    renderFavoriteScripts() {
        const container = document.getElementById('favorite-scripts');

        if (this.favoriteScripts.length === 0) {
            container.innerHTML = `
                <div class="no-favorites has-text-grey has-text-centered p-3">
                    <i class="far fa-star"></i><br>
                    <small>No favorite scripts</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.favoriteScripts.map(script => `
            <div class="sidebar-script-item" data-script="${script.name}">
                <h6 class="has-text-light">
                    <i class="fas fa-star has-text-warning mr-1"></i>
                    ${script.title}
                </h6>
                <div class="script-time has-text-grey">${script.author || 'Unknown'}</div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.sidebar-script-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectScript(item.dataset.script);
            });
        });
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    async loadScripts() {
        try {
            const response = await fetch('/api/scripts');
            const data = await response.json();

            if (data.error) {
                this.showError('Failed to load scripts: ' + data.error);
                return;
            }

            this.allScripts = data.scripts;
            this.filteredScripts = [...this.allScripts];
            this.renderScriptGrid();
            this.updateScriptCount();
        } catch (error) {
            this.showError('Failed to connect to server');
        }
    }

    renderScriptGrid() {
        const gridElement = document.getElementById('script-grid');

        if (this.filteredScripts.length === 0) {
            if (this.allScripts.length === 0) {
                gridElement.innerHTML = `
                    <div class="column is-full has-text-centered">
                        <div class="box box-dark">
                            <i class="fas fa-folder-open fa-2x mb-3 has-text-grey"></i>
                            <p class="title is-5 has-text-light">No scripts available</p>
                            <p class="subtitle is-6 has-text-grey-light">Add Python scripts to the scripts/ directory</p>
                        </div>
                    </div>
                `;
            } else {
                gridElement.innerHTML = `
                    <div class="column is-full has-text-centered">
                        <div class="box box-dark">
                            <i class="fas fa-search fa-2x mb-3 has-text-grey"></i>
                            <p class="title is-5 has-text-light">No scripts match your search</p>
                            <p class="subtitle is-6 has-text-grey-light">Try a different search term</p>
                        </div>
                    </div>
                `;
            }
            return;
        }

        gridElement.innerHTML = `
            <div class="columns is-multiline">
                ${this.filteredScripts.map(script => {
            const isFavorited = this.isFavorite(script.name);
            return `
                        <div class="column is-one-third-tablet is-one-quarter-desktop">
                            <div class="card script-card box-dark" data-script="${script.name}">
                                <button class="favorite-star ${isFavorited ? 'is-favorited' : ''}" 
                                        data-script="${script.name}" 
                                        onclick="event.stopPropagation()">
                                    <i class="fas fa-star"></i>
                                </button>
                                <div class="card-content">
                                    <div class="content">
                                        <h4 class="title is-5 mb-3 has-text-light">${script.title}</h4>
                                        <p class="has-text-grey-light mb-4">${script.description}</p>
                                        <div class="tags">
                                            <span class="tag is-info">v${script.version || '1.0'}</span>
                                            <span class="tag is-dark">${script.author || 'Unknown'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        // Add click handlers for cards
        gridElement.querySelectorAll('.script-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectScript(card.dataset.script);
            });
        });

        // Add click handlers for favorite stars
        gridElement.querySelectorAll('.favorite-star').forEach(star => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(star.dataset.script);
            });
        });
    }

    updateScriptCount() {
        const countElement = document.getElementById('script-count');
        if (this.filteredScripts.length === this.allScripts.length) {
            countElement.textContent = `${this.allScripts.length} scripts available`;
        } else {
            countElement.textContent = `${this.filteredScripts.length} of ${this.allScripts.length} scripts`;
        }
    }

    filterScripts(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            this.filteredScripts = [...this.allScripts];
        } else {
            this.filteredScripts = this.allScripts.filter(script =>
                script.title.toLowerCase().includes(term) ||
                script.description.toLowerCase().includes(term) ||
                script.name.toLowerCase().includes(term) ||
                (script.author && script.author.toLowerCase().includes(term))
            );
        }

        this.renderScriptGrid();
        this.updateScriptCount();
    }

    async selectScript(scriptName) {
        try {
            const response = await fetch(`/api/scripts/${scriptName}/config`);
            const config = await response.json();

            if (config.error) {
                this.showError('Failed to load script: ' + config.error);
                return;
            }

            this.currentScript = scriptName;

            // Add to recent scripts
            const scriptInfo = this.allScripts.find(s => s.name === scriptName);
            if (scriptInfo) {
                this.addToRecent(scriptInfo);
            }

            this.renderScriptInterface(config);
            this.showScriptInterface();
        } catch (error) {
            this.showError('Failed to load script configuration');
        }
    }

    renderScriptInterface(config) {
        document.getElementById('current-script-name').textContent = config.metadata.name;
        document.getElementById('script-title').textContent = config.metadata.name;
        document.getElementById('script-description').textContent = config.metadata.description;
        document.getElementById('script-version').textContent = `v${config.metadata.version || '1.0'}`;
        document.getElementById('script-author').textContent = config.metadata.author || 'Unknown';

        this.updateFavoriteButton(this.isFavorite(this.currentScript));
        this.renderForm(config.form);
        this.hideResults();
    }

    renderForm(formSchema) {
        const formFields = document.getElementById('form-fields');

        formFields.innerHTML = formSchema.map(field => {
            return this.renderField(field);
        }).join('');
    }

    renderField(field) {
        const required = field.required ? '<span class="has-text-danger">*</span>' : '';
        const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';

        switch (field.type) {
            case 'text':
                return `
                    <div class="field form-field">
                        <label class="label has-text-light">${field.label} ${required}</label>
                        <div class="control">
                            <input class="input" type="text" id="${field.name}" name="${field.name}" 
                                   value="${field.default || ''}" ${placeholder}>
                        </div>
                    </div>
                `;

            case 'number':
                const min = field.min !== undefined ? `min="${field.min}"` : '';
                const max = field.max !== undefined ? `max="${field.max}"` : '';
                return `
                    <div class="field form-field">
                        <label class="label has-text-light">${field.label} ${required}</label>
                        <div class="control">
                            <input class="input" type="number" id="${field.name}" name="${field.name}" 
                                   value="${field.default || ''}" ${min} ${max} ${placeholder}>
                        </div>
                    </div>
                `;

            case 'checkbox':
                const checked = field.default ? 'checked' : '';
                return `
                    <div class="field form-field">
                        <div class="control">
                            <label class="checkbox has-text-light">
                                <input type="checkbox" id="${field.name}" name="${field.name}" ${checked}>
                                ${field.label} ${required}
                            </label>
                        </div>
                    </div>
                `;

            case 'select':
                const options = field.options.map(opt => {
                    const value = typeof opt === 'string' ? opt : opt.value;
                    const label = typeof opt === 'string' ? opt : opt.label;
                    const selected = field.default === value ? 'selected' : '';
                    return `<option value="${value}" ${selected}>${label}</option>`;
                }).join('');
                return `
                    <div class="field form-field">
                        <label class="label has-text-light">${field.label} ${required}</label>
                        <div class="control">
                            <div class="select is-fullwidth">
                                <select id="${field.name}" name="${field.name}">
                                    <option value="">Choose an option...</option>
                                    ${options}
                                </select>
                            </div>
                        </div>
                    </div>
                `;

            case 'multiselect':
                const multiOptions = field.options.map(opt => {
                    const value = typeof opt === 'string' ? opt : opt.value;
                    const label = typeof opt === 'string' ? opt : opt.label;
                    return `<option value="${value}">${label}</option>`;
                }).join('');
                return `
                    <div class="field form-field">
                        <label class="label has-text-light">${field.label} ${required}</label>
                        <div class="control">
                            <div class="select is-multiple is-fullwidth">
                                <select id="${field.name}" name="${field.name}" multiple size="5">
                                    ${multiOptions}
                                </select>
                            </div>
                        </div>
                        <p class="help has-text-grey-light">Hold Ctrl/Cmd to select multiple options</p>
                    </div>
                `;

            case 'textarea':
                return `
                    <div class="field form-field">
                        <label class="label has-text-light">${field.label} ${required}</label>
                        <div class="control">
                            <textarea class="textarea" id="${field.name}" name="${field.name}" 
                                      rows="4" ${placeholder}>${field.default || ''}</textarea>
                        </div>
                    </div>
                `;

            default:
                return `
                    <div class="notification is-warning">
                        <strong class="has-text-dark">Unsupported field type:</strong> <span class="has-text-dark">${field.type}</span>
                    </div>
                `;
        }
    }

    showScriptInterface() {
        document.getElementById('script-overview').style.display = 'none';
        document.getElementById('script-interface').style.display = 'block';
        document.getElementById('back-to-overview').style.display = 'block';
    }

    showScriptOverview() {
        document.getElementById('script-interface').style.display = 'none';
        document.getElementById('script-overview').style.display = 'block';
        document.getElementById('back-to-overview').style.display = 'none';
        this.currentScript = null;
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('script-search');
        searchInput.addEventListener('input', (e) => {
            this.filterScripts(e.target.value);
        });

        // Navigation buttons
        document.getElementById('breadcrumb-back').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScriptOverview();
        });

        document.getElementById('back-to-overview').addEventListener('click', () => {
            this.showScriptOverview();
        });

        // Clear buttons
        document.getElementById('clear-recent').addEventListener('click', () => {
            if (confirm('Clear recent scripts history?')) {
                this.clearRecentScripts();
            }
        });

        document.getElementById('clear-favorites').addEventListener('click', () => {
            if (confirm('Clear all favorite scripts?')) {
                this.clearFavoriteScripts();
            }
        });

        // Favorite toggle button
        document.getElementById('toggle-favorite').addEventListener('click', () => {
            if (this.currentScript) {
                this.toggleFavorite(this.currentScript);
            }
        });

        // Form submission
        document.getElementById('script-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.executeScript();
        });

        // Clear form
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearForm();
        });
    }

    async executeScript() {
        if (!this.currentScript) return;

        const formData = this.getFormData();
        const executeBtn = document.getElementById('execute-btn');
        executeBtn.classList.add('is-loading');
        executeBtn.disabled = true;

        this.hideResults();

        try {
            const response = await fetch(`/api/scripts/${this.currentScript}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.error) {
                this.showError(result.error);
            } else {
                this.showResult(result);
            }
        } catch (error) {
            this.showError('Failed to execute script: ' + error.message);
        } finally {
            executeBtn.classList.remove('is-loading');
            executeBtn.disabled = false;
        }
    }

    getFormData() {
        const formData = {};
        const form = document.getElementById('script-form');

        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                formData[input.name] = input.checked;
            } else if (input.multiple) {
                formData[input.name] = Array.from(input.selectedOptions).map(opt => opt.value);
            } else {
                formData[input.name] = input.value;
            }
        });

        return formData;
    }

    clearForm() {
        const form = document.getElementById('script-form');
        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.multiple) {
                input.selectedIndex = -1;
            } else {
                input.value = '';
            }
        });

        this.hideResults();
    }

    showResult(result) {
        document.getElementById('error-section').style.display = 'none';

        const resultSection = document.getElementById('result-section');
        const resultContent = document.getElementById('result-content');
        const resultMetadata = document.getElementById('result-metadata');

        let displayResult = result.result;
        if (typeof displayResult === 'object') {
            displayResult = JSON.stringify(displayResult, null, 2);
        }

        resultContent.textContent = displayResult;

        // Show metadata if available
        if (result.metadata) {
            resultMetadata.innerHTML = Object.entries(result.metadata)
                .map(([key, value]) => `<span class="tag is-dark">${key}: ${value}</span>`)
                .join('');
        } else {
            resultMetadata.innerHTML = '';
        }

        resultSection.style.display = 'block';
    }

    showError(error) {
        document.getElementById('result-section').style.display = 'none';

        const errorSection = document.getElementById('error-section');
        const errorContent = document.getElementById('error-content');

        errorContent.textContent = error;
        errorSection.style.display = 'block';
    }

    hideResults() {
        document.getElementById('result-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ScriptPlatform();
});