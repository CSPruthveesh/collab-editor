export class CursorRenderer {
    constructor(avatarContainerId, editorElement, containerElement) {
        this.avatarContainer = document.getElementById(avatarContainerId);
        this.editor = editorElement;
        this.container = containerElement;
        this.users = new Map();
        this.caretElements = new Map();
        this.myUserId = null;
        this.mirrorDiv = null;
    }

    setMyUserId(userId) {
        this.myUserId = userId;
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

    getCaretCoordinates(pos) {
        if (!this.mirrorDiv) {
            this.mirrorDiv = document.createElement('div');
            this.mirrorDiv.style.position = 'absolute';
            this.mirrorDiv.style.visibility = 'hidden';
            this.mirrorDiv.style.pointerEvents = 'none';
            this.mirrorDiv.style.overflow = 'hidden';
            this.mirrorDiv.style.whiteSpace = 'pre-wrap';
            this.mirrorDiv.style.wordWrap = 'break-word';
            document.body.appendChild(this.mirrorDiv);
        }

        const style = window.getComputedStyle(this.editor);
        const properties = [
            'direction', 'boxSizing', 'width', 'height', 'fontSize',
            'fontFamily', 'fontWeight', 'fontStyle', 'letterSpacing',
            'lineHeight', 'tabSize', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'borderWidth'
        ];
        properties.forEach(prop => {
            this.mirrorDiv.style[prop] = style[prop];
        });

        const textBefore = this.editor.value.substring(0, pos);
        this.mirrorDiv.textContent = textBefore;

        const span = document.createElement('span');
        span.textContent = this.editor.value.substring(pos, pos + 1) || '|';
        this.mirrorDiv.appendChild(span);

        const spanRect = span.getBoundingClientRect();
        const mirrorRect = this.mirrorDiv.getBoundingClientRect();

        const top = spanRect.top - mirrorRect.top + this.editor.offsetTop - this.editor.scrollTop;
        const left = spanRect.left - mirrorRect.left + this.editor.offsetLeft - this.editor.scrollLeft;

        return { top, left, height: spanRect.height || 21 };
    }

    renderCarets() {
        this.users.forEach((presence, userId) => {
            if (this.myUserId && userId === this.myUserId) return;

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
            } else {
                caret.style.backgroundColor = presence.color;
                const label = caret.querySelector('.remote-caret-label');
                if (label) label.style.backgroundColor = presence.color;
            }

            const coords = this.getCaretCoordinates(presence.cursor_pos || 0);
            caret.style.top = `${coords.top}px`;
            caret.style.left = `${coords.left}px`;
            caret.style.height = `${coords.height}px`;
        });
    }
}
