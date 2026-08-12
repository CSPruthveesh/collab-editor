export class HistoryReplay {
    constructor(modalId, sliderId, revisionLabelId, textPreviewId, wasmModule) {
        this.modal = document.getElementById(modalId);
        this.slider = document.getElementById(sliderId);
        this.revisionLabel = document.getElementById(revisionLabelId);
        this.textPreview = document.getElementById(textPreviewId);
        this.wasm = wasmModule;
        this.historyOps = [];
        this.docStates = [];

        this._bindEvents();
    }

    _bindEvents() {
        if (this.slider) {
            this.slider.addEventListener('input', () => {
                const rev = parseInt(this.slider.value, 10);
                this.showRevision(rev);
            });
        }
    }

    async loadHistory(docId) {
        try {
            const res = await fetch(`/api/documents/${docId}/history`);
            if (res.ok) {
                this.historyOps = await res.json();
                this.precomputeStates();
                if (this.modal) this.modal.style.display = 'flex';
            }
        } catch (err) {
            console.error("Failed to load history:", err);
        }
    }

    precomputeStates() {
        let currentText = "";
        this.docStates = [currentText];

        for (const item of this.historyOps) {
            try {
                currentText = this.wasm.apply_json(currentText, item.op_json);
                this.docStates.push(currentText);
            } catch (err) {
                console.error("Error applying history op:", err);
            }
        }

        if (this.slider) {
            this.slider.min = 0;
            this.slider.max = this.docStates.length - 1;
            this.slider.value = this.docStates.length - 1;
        }

        this.showRevision(this.docStates.length - 1);
    }

    showRevision(rev) {
        if (this.revisionLabel) {
            this.revisionLabel.textContent = `Revision ${rev} / ${this.docStates.length - 1}`;
        }
        if (this.textPreview && this.docStates[rev] !== undefined) {
            this.textPreview.textContent = this.docStates[rev];
        }
    }

    close() {
        if (this.modal) this.modal.style.display = 'none';
    }
}
