export class UndoManager {
    constructor(editorElement, onPerformEditCallback) {
        this.editor = editorElement;
        this.onPerformEdit = onPerformEditCallback;
        this.undoStack = [];
        this.redoStack = [];
        this._bindEvents();
    }

    _bindEvents() {
        this.editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    pushEdit(beforeText, afterText) {
        this.undoStack.push({ before: beforeText, after: afterText });
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const entry = this.undoStack.pop();
        this.redoStack.push(entry);
        this.editor.value = entry.before;
        this.editor.dispatchEvent(new Event('input'));
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const entry = this.redoStack.pop();
        this.undoStack.push(entry);
        this.editor.value = entry.after;
        this.editor.dispatchEvent(new Event('input'));
    }
}
