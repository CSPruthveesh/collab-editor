import { OTClient } from './ot_client.js';
import { WSClient } from './ws_client.js';
import { CursorRenderer } from './cursor_renderer.js';
import { CodeEditor } from './editor.js';
import { PresenceTracker } from './presence.js';
import { FileSidebar } from './file_sidebar.js';

// Get document ID and User Name from URL or defaults
const urlParams = new URLSearchParams(window.location.search);
const docId = urlParams.get('doc') || 'default-doc';
const userName = urlParams.get('name') || `User_${Math.floor(Math.random() * 1000)}`;

// DOM Elements
const docTitle = document.getElementById('doc-title');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const editorContainer = document.getElementById('editor-container');

docTitle.value = `Document: ${docId}`;

let wasmModule = null;
let otClient = null;
let wsClient = null;
let cursorRenderer = null;
let codeEditor = null;
let presenceTracker = null;
let fileSidebar = null;

import { HistoryReplay } from './history_replay.js';

let historyReplay = null;

async function init() {
    statusText.textContent = "Loading Wasm OT Engine...";
    
    // 1. Initialize Emscripten Wasm Module
    wasmModule = await OTEngine();
    statusText.textContent = "Connecting...";

    // 2. Initialize Clients and Modular Components
    otClient = new OTClient(wasmModule);
    wsClient = new WSClient(docId, userName);
    cursorRenderer = new CursorRenderer('avatar-container', document.getElementById('code-editor'), editorContainer);

    codeEditor = new CodeEditor('code-editor', 'line-numbers', (opJson) => {
        otClient.onLocalEdit(opJson, (rev, op) => {
            wsClient.sendEdit(rev, op);
        });
    });

    presenceTracker = new PresenceTracker(codeEditor.editor, (p) => {
        wsClient.sendPresence(p.cursor_pos, p.selection_start, p.selection_end);
    });

    fileSidebar = new FileSidebar('doc-list', (newDocId) => {
        window.location.href = `?doc=${encodeURIComponent(newDocId)}&name=${encodeURIComponent(userName)}`;
    });
    fileSidebar.loadDocuments();

    historyReplay = new HistoryReplay('history-modal', 'history-slider', 'history-rev-label', 'history-text-preview', wasmModule);
    
    const historyBtn = document.getElementById('history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => historyReplay.loadHistory(docId));
    }
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => historyReplay.close());
    }

    // 3. Register WebSocket Event Handlers
    wsClient.on('status', (status) => {
        if (status === 'connected') {
            statusDot.style.backgroundColor = 'var(--accent-green)';
            statusText.textContent = 'Connected';
        } else {
            statusDot.style.backgroundColor = 'var(--accent-red)';
            statusText.textContent = 'Reconnecting...';
        }
    });

    wsClient.on('doc_sync', (data) => {
        codeEditor.setValue(data.content);
        otClient.revision = data.revision;
        cursorRenderer.setUsers(data.users || []);
    });

    wsClient.on('ack', (data) => {
        otClient.onServerAck(data.revision, (rev, opJson) => {
            wsClient.sendEdit(rev, opJson);
        });
    });

    wsClient.on('remote_edit', (data) => {
        otClient.onRemoteOp(data.op_json, data.revision, (opToApply) => {
            codeEditor.applyRemoteOp(wasmModule, opToApply);
        });
    });

    wsClient.on('presence', (data) => {
        cursorRenderer.updatePresence(data.presence);
    });

    wsClient.on('user_join', (data) => {
        cursorRenderer.addUser(data.presence);
    });

    wsClient.on('user_leave', (data) => {
        cursorRenderer.removeUser(data.user_id);
    });

    // 4. Connect WebSocket
    wsClient.connect();
}

init();