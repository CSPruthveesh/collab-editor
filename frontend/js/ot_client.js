export function diffToOperation(oldStr, newStr) {
    if (oldStr === newStr) return JSON.stringify([]);
    let start = 0;
    while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
        start++;
    }
    let oldEnd = oldStr.length - 1;
    let newEnd = newStr.length - 1;
    while (oldEnd >= start && newEnd >= start && oldStr[oldEnd] === newStr[newEnd]) {
        oldEnd--;
        newEnd--;
    }
    const deleteCount = oldEnd - start + 1;
    const insertedText = newStr.slice(start, newEnd + 1);
    const ops = [];
    if (start > 0) ops.push({ r: start });
    if (deleteCount > 0) ops.push({ d: deleteCount });
    if (insertedText.length > 0) ops.push({ i: insertedText });
    const remainingRetain = oldStr.length - start - deleteCount;
    if (remainingRetain > 0) ops.push({ r: remainingRetain });
    return JSON.stringify(ops);
}
export class OTClient {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        this.state = 'SYNCHRONIZED'; 
        this.pendingOpJson = null;
        this.bufferOpJson = null;
        this.revision = 0;
    }
    onLocalEdit(opJson, sendCallback) {
        if (this.state === 'SYNCHRONIZED') {
            this.pendingOpJson = opJson;
            this.state = 'AWAITING_ACK';
            sendCallback(this.revision, opJson);
        } else if (this.state === 'AWAITING_ACK') {
            this.bufferOpJson = opJson;
            this.state = 'AWAITING_ACK_WITH_BUFFER';
        } else if (this.state === 'AWAITING_ACK_WITH_BUFFER') {
            this.bufferOpJson = this.wasm.compose_json(this.bufferOpJson, opJson);
        }
    }
    onServerAck(newRevision, sendCallback) {
        this.revision = newRevision;
        if (this.state === 'AWAITING_ACK') {
            this.pendingOpJson = null;
            this.state = 'SYNCHRONIZED';
        } else if (this.state === 'AWAITING_ACK_WITH_BUFFER') {
            this.pendingOpJson = this.bufferOpJson;
            this.bufferOpJson = null;
            this.state = 'AWAITING_ACK';
            sendCallback(this.revision, this.pendingOpJson);
        }
    }
    onRemoteOp(remoteOpJson, serverRevision, applyToEditorCallback) {
        this.revision = serverRevision;
        let opToApply = remoteOpJson;
        if (this.state === 'SYNCHRONIZED') {
            opToApply = remoteOpJson;
        } else if (this.state === 'AWAITING_ACK') {
            const newPending = this.wasm.transform_a_json(this.pendingOpJson, remoteOpJson);
            opToApply = this.wasm.transform_b_json(this.pendingOpJson, remoteOpJson);
            this.pendingOpJson = newPending;
        } else if (this.state === 'AWAITING_ACK_WITH_BUFFER') {
            const newPending = this.wasm.transform_a_json(this.pendingOpJson, remoteOpJson);
            const remotePrime = this.wasm.transform_b_json(this.pendingOpJson, remoteOpJson);
            const newBuffer = this.wasm.transform_a_json(this.bufferOpJson, remotePrime);
            opToApply = this.wasm.transform_b_json(this.bufferOpJson, remotePrime);
            this.pendingOpJson = newPending;
            this.bufferOpJson = newBuffer;
        }
        applyToEditorCallback(opToApply);
    }
}
