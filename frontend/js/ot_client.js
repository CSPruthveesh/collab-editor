// Text Diff Helper: Computes OT operation JSON between oldStr and newStr
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
        this.state = 'SYNCHRONIZED'; // SYNCHRONIZED | AWAITING_ACK | AWAITING_ACK_WITH_BUFFER
        this.pendingOpJson = null;
        this.bufferOpJson = null;
        this.revision = 0;
    }

    // Called when user types locally
    onLocalEdit(opJson, sendCallback) {
        if (this.state === 'SYNCHRONIZED') {
            this.pendingOpJson = opJson;
            this.state = 'AWAITING_ACK';
            sendCallback(this.revision, opJson);
        } else if (this.state === 'AWAITING_ACK') {
            this.bufferOpJson = opJson;
            this.state = 'AWAITING_ACK_WITH_BUFFER';
        } else if (this.state === 'AWAITING_ACK_WITH_BUFFER') {
            // Compose new op with existing buffer using Wasm
            this.bufferOpJson = this.wasm.compose_json(this.bufferOpJson, opJson);
        }
    }

    // Called when server sends ack for sent operation
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

    // Called when server sends a remote operation from another user
    onRemoteOp(remoteOpJson, serverRevision, applyToEditorCallback) {
        this.revision = serverRevision;

        let opToApply = remoteOpJson;

        if (this.state === 'SYNCHRONIZED') {
            opToApply = remoteOpJson;
        } else if (this.state === 'AWAITING_ACK') {
            // Transform pending vs remote
            const newPending = this.wasm.transform_a_json(this.pendingOpJson, remoteOpJson);
            opToApply = this.wasm.transform_b_json(this.pendingOpJson, remoteOpJson);
            this.pendingOpJson = newPending;
        } else if (this.state === 'AWAITING_ACK_WITH_BUFFER') {
            // Transform pending vs remote
            const newPending = this.wasm.transform_a_json(this.pendingOpJson, remoteOpJson);
            const remotePrime = this.wasm.transform_b_json(this.pendingOpJson, remoteOpJson);

            // Transform buffer vs remotePrime
            const newBuffer = this.wasm.transform_a_json(this.bufferOpJson, remotePrime);
            opToApply = this.wasm.transform_b_json(this.bufferOpJson, remotePrime);

            this.pendingOpJson = newPending;
            this.bufferOpJson = newBuffer;
        }

        applyToEditorCallback(opToApply);
    }
}