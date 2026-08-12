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
    pushEdit(opJson) {
        this.undoStack.push(opJson);
        this.redoStack = []; 
    }
    invertOpJson(opJson) {
        try {
            const ops = JSON.parse(opJson);
            const inverted = [];
            for (const op of ops) {
                if (op.r) {
                    inverted.push({ r: op.r });
                } else if (op.i) {
                    inverted.push({ d: op.i.length });
                } else if (op.d) {
                    inverted.push({ r: op.d });
                }
            }
            return JSON.stringify(inverted);
        } catch (err) {
            return opJson;
        }
    }
    undo() {
        if (this.undoStack.length === 0) return;
        const opJson = this.undoStack.pop();
        const inverseOpJson = this.invertOpJson(opJson);
        this.redoStack.push(opJson);
        if (this.onPerformEdit) {
            this.onPerformEdit(inverseOpJson);
        }
    }
    redo() {
        if (this.redoStack.length === 0) return;
        const opJson = this.redoStack.pop();
        this.undoStack.push(opJson);
        if (this.onPerformEdit) {
            this.onPerformEdit(opJson);
        }
    }
}
