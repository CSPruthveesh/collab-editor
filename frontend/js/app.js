import { OTClient } from './ot_client.js';
import { WSClient } from './ws_client.js';
import { CursorRenderer } from './cursor_renderer.js';
import { CodeEditor } from './editor.js';
import { PresenceTracker } from './presence.js';
import { FileSidebar } from './file_sidebar.js';
import { HistoryReplay } from './history_replay.js';
import { UndoManager } from './undo_manager.js';

const urlParams = new URLSearchParams(window.location.search);
const docId = urlParams.get('doc') || 'default-doc';
const userName = urlParams.get('name') || `User_${Math.floor(Math.random() * 1000)}`;

const docTitle = document.getElementById('doc-title');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const editorContainer = document.getElementById('editor-container');

docTitle.value = docId;

async function loadDocMeta() {
    try {
        const res = await fetch(`/api/documents/${encodeURIComponent(docId)}?owner=${encodeURIComponent(userName)}`);
        if (res.ok) {
            const meta = await res.json();
            if (meta && meta.title) {
                docTitle.value = meta.title;
            }
        }
    } catch (err) {
        console.error("Failed to load document title:", err);
    }
}
loadDocMeta();

docTitle.addEventListener('change', async () => {
    const newTitle = docTitle.value.trim();
    if (newTitle) {
        try {
            await fetch(`/api/documents/${encodeURIComponent(docId)}/rename?owner=${encodeURIComponent(userName)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });
            if (fileSidebar) fileSidebar.loadDocuments();
        } catch (err) {
            console.error("Failed to rename document title:", err);
        }
    }
});

const profileAvatar = document.getElementById('user-profile-avatar');
const profileName = document.getElementById('user-profile-name');
if (profileAvatar) profileAvatar.textContent = (userName || 'U')[0].toUpperCase();
if (profileName) profileName.textContent = userName;

let wasmModule = null;
let otClient = null;
let wsClient = null;
let cursorRenderer = null;
let codeEditor = null;
let presenceTracker = null;
let fileSidebar = null;
let historyReplay = null;
let undoManager = null;
let lastSnapshot = "";

async function init() {
    statusText.textContent = "Loading Wasm OT Engine...";
    wasmModule = await OTEngine();
    statusText.textContent = "Connecting...";

    otClient = new OTClient(wasmModule);
    wsClient = new WSClient(docId, userName);
    cursorRenderer = new CursorRenderer('avatar-container', document.getElementById('code-editor'), editorContainer);

    undoManager = new UndoManager(document.getElementById('code-editor'), null);

    codeEditor = new CodeEditor('code-editor', 'line-numbers', (opJson) => {
        const currentText = codeEditor.getValue();
        undoManager.pushEdit(lastSnapshot, currentText);
        lastSnapshot = currentText;
        otClient.onLocalEdit(opJson, (rev, op) => {
            wsClient.sendEdit(rev, op);
        });
    });

    presenceTracker = new PresenceTracker(codeEditor.editor, (p) => {
        wsClient.sendPresence(p.cursor_pos, p.selection_start, p.selection_end);
    });

    fileSidebar = new FileSidebar('doc-list', (newDocId) => {
        window.location.href = `?doc=${encodeURIComponent(newDocId)}&name=${encodeURIComponent(userName)}`;
    }, userName);
    fileSidebar.setActiveDocId(docId);
    fileSidebar.loadDocuments();

    historyReplay = new HistoryReplay('history-modal', 'history-slider', 'history-rev-label', 'history-text-preview', wasmModule);
    const historyBtn = document.getElementById('history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const commitBtn = document.getElementById('commit-btn');

    if (historyBtn) {
        historyBtn.addEventListener('click', () => historyReplay.loadHistory(docId));
    }
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => historyReplay.close());
    }
    if (commitBtn) {
        commitBtn.addEventListener('click', async () => {
            const message = prompt("Enter commit message:", "Manual Version Commit");
            if (message && message.trim()) {
                try {
                    const content = codeEditor.getValue();
                    const res = await fetch(`/api/documents/${docId}/commit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: content,
                            message: message.trim(),
                            user_name: userName
                        })
                    });
                    if (res.ok) {
                        alert("Commit created successfully!");
                    }
                } catch (err) {
                    console.error("Failed to post commit:", err);
                }
            }
        });
    }

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
        lastSnapshot = data.content;
        otClient.revision = data.revision;
        const me = (data.users || []).find(u => u.user_name === userName);
        if (me) cursorRenderer.setMyUserId(me.user_id);
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
            lastSnapshot = codeEditor.getValue();
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

    wsClient.on('doc_deleted', (data) => {
        if (data.doc_id === docId && (!data.owner || data.owner === userName)) {
            fileSidebar.loadDocuments(true);
        } else {
            fileSidebar.loadDocuments(false);
        }
    });

    wsClient.connect();
}

init();
