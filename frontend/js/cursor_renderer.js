export class CursorRenderer {
    constructor(avatarContainerId, editorElement, containerElement) {
        this.avatarContainer = document.getElementById(avatarContainerId);
        this.editor = editorElement;
        this.container = containerElement;
        this.users = new Map(); // user_id -> presence
        this.caretElements = new Map(); // user_id -> DOM element
    }

    setUsers(usersList) {
        this.users.clear();
        usersList.forEach(u => this.users.set(u.user_id, u));
        this.renderAvatars();
    }

    addUser(presence) {
        this.users.set(presence.user_id, presence);
        this.renderAvatars();
    }

    removeUser(userId) {
        this.users.delete(userId);
        if (this.caretElements.has(userId)) {
            this.caretElements.get(userId).remove();
            this.caretElements.delete(userId);
        }
        this.renderAvatars();
    }

    updatePresence(presence) {
        this.users.set(presence.user_id, presence);
        this.renderCarets();
    }

    renderAvatars() {
        if (!this.avatarContainer) return;
        this.avatarContainer.innerHTML = '';
        this.users.forEach((presence) => {
            const avatar = document.createElement('div');
            avatar.className = 'user-avatar';
            avatar.style.backgroundColor = presence.color;
            avatar.title = presence.user_name;
            avatar.textContent = (presence.user_name || 'A')[0].toUpperCase();
            this.avatarContainer.appendChild(avatar);
        });
    }

    renderCarets() {
        this.users.forEach((presence, userId) => {
            let caret = this.caretElements.get(userId);

            if (!caret) {
                caret = document.createElement('div');
                caret.className = 'remote-caret';
                caret.style.backgroundColor = presence.color;

                const label = document.createElement('div');
                label.className = 'remote-caret-label';
                label.style.backgroundColor = presence.color;
                label.textContent = presence.user_name;
                caret.appendChild(label);

                this.container.appendChild(caret);
                this.caretElements.set(userId, caret);
            }

            // Approximate caret coordinates inside textarea
            const lines = this.editor.value.substring(0, presence.cursor_pos).split('\n');
            const lineNumber = lines.length;
            const columnNumber = lines[lines.length - 1].length;

            const lineHeight = 21; // ~1.5 * 14px font
            const charWidth = 8.5;  // monospace font character width

            const top = 16 + (lineNumber - 1) * lineHeight;
            const left = 45 + 16 + columnNumber * charWidth;

            caret.style.top = `${top}px`;
            caret.style.left = `${left}px`;
            caret.style.height = `${lineHeight}px`;
        });
    }
}