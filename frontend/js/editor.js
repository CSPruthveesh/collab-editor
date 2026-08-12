import { diffToOperation } from './ot_client.js';
export function highlightCode(code) {
    if (!code) return "";
    let html = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const keywords = /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|def|async|await|include|struct|void|int|bool|true|false)\b/g;
    html = html.replace(keywords, '<span class="token-keyword">$&</span>');

    const strings = /(["'])(?:(?=(\\?))\2[\s\S])*?\1/g;
    html = html.replace(strings, '<span class="token-string">$&</span>');

    const numbers = /\b\d+\b/g;
    html = html.replace(numbers, '<span class="token-number">$&</span>');

    const comments = /\/\/.*/g;
    html = html.replace(comments, '<span class="token-comment">$&</span>');

    return html + '\n';
}

export class CodeEditor {
    constructor(textareaId, lineNumbersId, onLocalEditCallback) {
        this.editor = document.getElementById(textareaId);
        this.lineNumbers = document.getElementById(lineNumbersId);
        this.highlightLayer = document.getElementById('highlight-layer');
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
            this.updateDisplay();
        });

        this.editor.addEventListener('scroll', () => {
            if (this.highlightLayer) {
                this.highlightLayer.scrollTop = this.editor.scrollTop;
                this.highlightLayer.scrollLeft = this.editor.scrollLeft;
            }
            if (this.lineNumbers) {
                this.lineNumbers.scrollTop = this.editor.scrollTop;
            }
        });
    }

    updateDisplay() {
        this.updateLineNumbers();
        if (this.highlightLayer) {
            this.highlightLayer.innerHTML = highlightCode(this.editor.value);
        }
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
        this.updateDisplay();
    }

    applyRemoteOp(wasmModule, remoteOpJson) {
        const prevPos = this.editor.selectionStart;
        const prevValue = this.editor.value;
        const newText = wasmModule.apply_json(prevValue, remoteOpJson);
        this.editor.value = newText;
        this.lastKnownValue = newText;
        this.editor.setSelectionRange(prevPos, prevPos);
        this.updateDisplay();
    }
}
