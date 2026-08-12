export class UndoManager {
    constructor(editorElement) {
        this.editor = editorElement;
        this.undoStack = [];
        this.redoStack = [];
        this.isUndoingOrRedoing = false;
        this.groupTimeout = null;
        this.currentGroupBefore = null;

        this._bindEvents();
    }

    _bindEvents() {
        this.editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    pushEdit(beforeText, afterText) {
        if (this.isUndoingOrRedoing) return;
        if (beforeText === afterText) return;

        if (this.currentGroupBefore === null) {
            this.currentGroupBefore = beforeText;
        }

        if (this.groupTimeout) clearTimeout(this.groupTimeout);

        this.groupTimeout = setTimeout(() => {
            if (this.currentGroupBefore !== null) {
                this.undoStack.push({ before: this.currentGroupBefore, after: this.editor.value });
                this.redoStack = [];
                this.currentGroupBefore = null;
            }
        }, 300);
    }

    undo() {
        if (this.currentGroupBefore !== null) {
            this.undoStack.push({ before: this.currentGroupBefore, after: this.editor.value });
            this.currentGroupBefore = null;
            if (this.groupTimeout) clearTimeout(this.groupTimeout);
        }

        if (this.undoStack.length === 0) return;
        this.isUndoingOrRedoing = true;
        const entry = this.undoStack.pop();
        this.redoStack.push(entry);

        this.editor.value = entry.before;
        this.editor.dispatchEvent(new Event('input'));
        this.isUndoingOrRedoing = false;
    }

    redo() {
        if (this.redoStack.length === 0) return;
        this.isUndoingOrRedoing = true;
        const entry = this.redoStack.pop();
        this.undoStack.push(entry);

        this.editor.value = entry.after;
        this.editor.dispatchEvent(new Event('input'));
        this.isUndoingOrRedoing = false;
    }
}
