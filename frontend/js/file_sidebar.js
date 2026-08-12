export class FileSidebar {
    constructor(sidebarContainerId, onSelectDocumentCallback) {
        this.container = document.getElementById(sidebarContainerId);
        this.onSelectDocument = onSelectDocumentCallback;
        this.activeDocId = null;
    }
    async loadDocuments() {
        try {
            const res = await fetch('/api/documents');
            if (res.ok) {
                const docs = await res.json();
                this.render(docs);
            }
        } catch (err) {
            console.error("Failed to load document list:", err);
        }
    }
    render(documents) {
        if (!this.container) return;
        this.container.innerHTML = '';
        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = `doc-item ${doc.id === this.activeDocId ? 'active' : ''}`;
            item.innerHTML = `
                <span>${doc.title || 'Untitled'}</span>
                <small style="opacity: 0.5;">#${doc.id}</small>
            `;
            item.addEventListener('click', () => {
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
