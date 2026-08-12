export class HistoryReplay {
    constructor(modalId, sliderId, revisionLabelId, textPreviewId, wasmModule) {
        this.modal = document.getElementById(modalId);
        this.slider = document.getElementById(sliderId);
        this.revisionLabel = document.getElementById(revisionLabelId);
        this.textPreview = document.getElementById(textPreviewId);
        this.metaInfo = document.getElementById('history-meta-info');
        this.wasm = wasmModule;
        this.commits = [];
        this.historyOps = [];
        this.docStates = [];
        this._bindEvents();
    }

    _bindEvents() {
        if (this.slider) {
            this.slider.addEventListener('input', () => {
                const index = parseInt(this.slider.value, 10);
                this.showRevision(index);
            });
        }
    }

    async loadHistory(docId) {
        try {
            const commitRes = await fetch(`/api/documents/${docId}/commits`);
            if (commitRes.ok) {
                this.commits = await commitRes.json();
            }

            if (this.commits && this.commits.length > 0) {
                this.renderCommitHistory();
            } else {
                const res = await fetch(`/api/documents/${docId}/history`);
                if (res.ok) {
                    this.historyOps = await res.json();
                    this.precomputeStates();
                }
            }

            if (this.modal) this.modal.style.display = 'flex';
        } catch (err) {
            console.error("Failed to load commit history:", err);
        }
    }

    renderCommitHistory() {
        this.docStates = this.commits.map(c => c.content);

        if (this.slider) {
            this.slider.min = 0;
            this.slider.max = Math.max(0, this.commits.length - 1);
            this.slider.value = this.commits.length - 1;
        }

        this.showRevision(this.commits.length - 1);
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
            this.slider.max = Math.max(0, this.docStates.length - 1);
            this.slider.value = this.docStates.length - 1;
        }

        this.showRevision(this.docStates.length - 1);
    }

    showRevision(index) {
        if (this.commits && this.commits.length > 0) {
            const commit = this.commits[index];
            if (!commit) return;

            if (this.revisionLabel) {
                this.revisionLabel.textContent = `Commit ${index + 1} / ${this.commits.length}`;
            }
            if (this.textPreview) {
                this.textPreview.textContent = commit.content || "(Empty Document)";
            }
            if (this.metaInfo) {
                const time = commit.timestamp ? new Date(commit.timestamp * 1000).toLocaleTimeString() : "";
                this.metaInfo.textContent = `Commit: "${commit.message}" by ${commit.user_id} at ${time}`;
            }
        } else {
            if (this.revisionLabel) {
                this.revisionLabel.textContent = `Revision ${index} / ${this.docStates.length - 1}`;
            }
            if (this.textPreview && this.docStates[index] !== undefined) {
                this.textPreview.textContent = this.docStates[index] || "(Empty Document)";
            }
            if (this.metaInfo) {
                if (index === 0) {
                    this.metaInfo.textContent = "Initial Document Creation";
                } else if (this.historyOps[index - 1]) {
                    const opItem = this.historyOps[index - 1];
                    const author = opItem.user_id || "Anonymous";
                    const time = opItem.timestamp ? new Date(opItem.timestamp * 1000).toLocaleTimeString() : "";
                    this.metaInfo.textContent = `Revision ${index} edited by User #${author} ${time ? 'at ' + time : ''}`;
                }
            }
        }
    }

    close() {
        if (this.modal) this.modal.style.display = 'none';
    }
}
