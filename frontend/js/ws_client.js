export class WSClient {
    constructor(docId, userName) {
        this.docId = docId;
        this.userName = userName;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000;
        this.callbacks = {};
        this.isReconnecting = false;
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/ws/${this.docId}?user_name=${encodeURIComponent(this.userName)}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            if (this.callbacks['status']) this.callbacks['status']('connected');
            if (this.isReconnecting && this.callbacks['reconnected']) {
                this.callbacks['reconnected']();
            }
            this.isReconnecting = false;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const type = data.type;
                if (this.callbacks[type]) {
                    this.callbacks[type](data);
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        this.ws.onclose = () => {
            this.isReconnecting = true;
            if (this.callbacks['status']) this.callbacks['status']('reconnecting');
            this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            this.ws.close();
        };
    }

    scheduleReconnect() {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }

    sendEdit(clientRevision, opJson) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'edit',
                client_revision: clientRevision,
                op_json: opJson
            }));
        }
    }

    sendPresence(cursorPos, selStart, selEnd) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'presence',
                presence: {
                    cursor_pos: cursorPos,
                    selection_start: selStart,
                    selection_end: selEnd
                }
            }));
        }
    }
}