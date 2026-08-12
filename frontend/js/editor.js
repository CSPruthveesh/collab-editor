import { diffToOperation } from './ot_client.js';

export class CodeEditor {
    constructor(textareaId, lineNumbersId, onLocalEditCallback) {
        this.editor = document.getElementById(textareaId);
        this.lineNumbers = document.getElementById(lineNumbersId);
        this.onLocalEdit = onLocalEditCallback;
        this.lastKnownValue = "";

        this._bindEvents();
    }

    _bindEvents() {
        this.editor.addEventListener('input', () => {
            const currentValue = this.editor.value;
            const opJson = diffToOperation(this.lastKnownValue, currentValue);
            this.lastKnownValue = currentValue;

            if (opJson !== JSON.stringify([]) && this.onLocalEdit) {
                this.onLocalEdit(opJson);
            }
            this.updateLineNumbers();
        });
    }

    updateLineNumbers() {
        const lines = this.editor.value.split('\n').length;
        this.lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    }

    getValue() {
        return this.editor.value;
    }

    setValue(text) {
        this.editor.value = text;
        this.lastKnownValue = text;
        this.updateLineNumbers();
    }

    applyRemoteOp(wasmModule, remoteOpJson) {
        const prevPos = this.editor.selectionStart;
        const prevValue = this.editor.value;

        const newText = wasmModule.apply_json(prevValue, remoteOpJson);
        this.editor.value = newText;
        this.lastKnownValue = newText;

        this.editor.setSelectionRange(prevPos, prevPos);
        this.updateLineNumbers();
    }
}
