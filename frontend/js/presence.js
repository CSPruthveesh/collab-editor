export class PresenceTracker {
    constructor(editorElement, onPresenceUpdateCallback, throttleMs = 50) {
        this.editor = editorElement;
        this.onPresenceUpdate = onPresenceUpdateCallback;
        this.throttleMs = throttleMs;
        this.timeout = null;

        this._bindEvents();
    }

    _bindEvents() {
        const handler = () => this.triggerUpdate();
        this.editor.addEventListener('keyup', handler);
        this.editor.addEventListener('click', handler);
        this.editor.addEventListener('select', handler);
    }

    triggerUpdate() {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            if (this.onPresenceUpdate) {
                this.onPresenceUpdate({
                    cursor_pos: this.editor.selectionStart,
                    selection_start: this.editor.selectionStart,
                    selection_end: this.editor.selectionEnd
                });
            }
        }, this.throttleMs);
    }
}
