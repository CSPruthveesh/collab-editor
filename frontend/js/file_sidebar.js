export class FileSidebar {
    constructor(sidebarContainerId, onSelectDocumentCallback, profileId = 'Global') {
        this.container = document.getElementById(sidebarContainerId);
        this.sidebar = document.getElementById('sidebar');
        this.resizer = document.getElementById('sidebar-resizer');
        this.toggleBtn = document.getElementById('sidebar-toggle-btn');
        this.headerIcon = document.getElementById('sidebar-header-icon');
        this.onSelectDocument = onSelectDocumentCallback;
        this.profileId = profileId;
        this.activeDocId = null;
        this.activeDropdown = null;

        this._initResizeAndCollapse();
        this._bindGlobalClick();
    }

    setActiveDocId(docId) {
        this.activeDocId = docId;
    }

    setProfile(profileId) {
        this.profileId = profileId;
        this.loadDocuments();
    }

    _bindGlobalClick() {
        document.addEventListener('click', (e) => {
            if (this.activeDropdown && !e.target.closest('.doc-dropdown-menu') && !e.target.closest('.doc-menu-btn')) {
                this.closeDropdown();
            }
        });
    }

    _initResizeAndCollapse() {
        if (!this.resizer || !this.sidebar) return;

        let isResizing = false;

        this.resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            this.resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = Math.min(Math.max(e.clientX, 60), 480);
            this.sidebar.style.width = `${newWidth}px`;
            if (newWidth < 120) {
                this._setCollapsed(true);
            } else {
                this._setCollapsed(false);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                this.resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        this.resizer.addEventListener('dblclick', () => {
            const isCollapsed = this.sidebar.classList.contains('collapsed');
            this._setCollapsed(!isCollapsed);
        });

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                const isCollapsed = this.sidebar.classList.contains('collapsed');
                this._setCollapsed(!isCollapsed);
            });
        }
    }

    _setCollapsed(collapsed) {
        if (collapsed) {
            this.sidebar.classList.add('collapsed');
            this.sidebar.style.width = '60px';
            if (this.headerIcon) {
                this.headerIcon.innerHTML = `<path d="M13 5l7 7-7 7M5 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
            }
        } else {
            this.sidebar.classList.remove('collapsed');
            this.sidebar.style.width = '250px';
            if (this.headerIcon) {
                this.headerIcon.innerHTML = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>`;
            }
        }
    }

    async loadDocuments(autoSelectLatestIfActiveDeleted = false) {
        try {
            const res = await fetch(`/api/documents?owner=${encodeURIComponent(this.profileId)}`);
            if (res.ok) {
                const docs = await res.json();
                this.render(docs);

                if (autoSelectLatestIfActiveDeleted) {
                    if (docs.length > 0) {
                        const latestDoc = docs[0];
                        if (this.onSelectDocument) {
                            this.onSelectDocument(latestDoc.id);
                        }
                    } else {
                        if (this.onSelectDocument) {
                            this.onSelectDocument('default-doc');
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load profile document list:", err);
        }
    }

    closeDropdown() {
        if (this.activeDropdown) {
            this.activeDropdown.remove();
            this.activeDropdown = null;
        }
    }

    openContextMenu(e, doc) {
        e.stopPropagation();
        this.closeDropdown();

        const btnRect = e.currentTarget.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = 'doc-dropdown-menu';
        menu.style.top = `${btnRect.bottom + 4}px`;
        menu.style.left = `${Math.min(btnRect.left, window.innerWidth - 140)}px`;

        menu.innerHTML = `
            <div class="doc-dropdown-item rename-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Rename</span>
            </div>
            <div class="doc-dropdown-item danger delete-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Delete</span>
            </div>
        `;

        menu.querySelector('.rename-item').addEventListener('click', async (ev) => {
            ev.stopPropagation();
            this.closeDropdown();
            const newTitle = prompt("Enter new document name:", doc.title || "Untitled");
            if (newTitle && newTitle.trim()) {
                try {
                    await fetch(`/api/documents/${doc.id}/rename`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: newTitle.trim() })
                    });
                    this.loadDocuments();
                } catch (err) {
                    console.error("Failed to rename document:", err);
                }
            }
        });

        menu.querySelector('.delete-item').addEventListener('click', async (ev) => {
            ev.stopPropagation();
            this.closeDropdown();
            if (confirm(`Are you sure you want to delete "${doc.title || doc.id}"?`)) {
                try {
                    const isDeletingActiveDoc = (doc.id === this.activeDocId);
                    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
                    await this.loadDocuments(isDeletingActiveDoc);
                } catch (err) {
                    console.error("Failed to delete document:", err);
                }
            }
        });

        document.body.appendChild(menu);
        this.activeDropdown = menu;
    }

    render(documents) {
        if (!this.container) return;
        this.container.innerHTML = '';
        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = `doc-item ${doc.id === this.activeDocId ? 'active' : ''}`;
            
            const info = document.createElement('div');
            info.className = 'doc-item-info';
            info.innerHTML = `
                <span class="doc-item-title">${doc.title || 'Untitled'}</span>
                <small class="doc-item-id" style="opacity: 0.5;">#${doc.id}</small>
            `;

            const menuBtn = document.createElement('button');
            menuBtn.className = 'doc-menu-btn';
            menuBtn.title = 'More options';
            menuBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            `;

            menuBtn.addEventListener('click', (e) => this.openContextMenu(e, doc));

            item.appendChild(info);
            item.appendChild(menuBtn);

            item.addEventListener('click', (e) => {
                if (e.target.closest('.doc-menu-btn')) return;
                this.activeDocId = doc.id;
                if (this.onSelectDocument) {
                    this.onSelectDocument(doc.id);
                }
                this.render(documents);
            });

            this.container.appendChild(item);
        });
    }
}
