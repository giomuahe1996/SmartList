; (function (root) {
    if (!root.SmartList) return;

    root.SmartList.plugin('keyboard', function (options = {}) {
        const t = this;
        const s = t.state;
        const d = t.settings;

        t.on('init', function () {
            t._onDOM(t.focus_node, 'keydown', (e) => t.onKeyDown(e));

            t.onKeyDown = (e) => {
                const key = e.key;

                // ---------- NAVIGATION ----------
                if (key === 'ArrowDown' || key === 'ArrowUp') {
                    e.preventDefault();
                    if (!t.state.isOpen) t.openDropdown();

                    const items = t.items.children;
                    if (!items.length) return;

                    let idx = t.state.hoverIndex;
                    idx += key === 'ArrowDown' ? 1 : -1;

                    if (idx < 0) idx = items.length - 1;
                    if (idx >= items.length) idx = 0;

                    t._setHoverItem(idx);
                    return;
                }

                // ---------- SELECT ----------
                if (key === 'Enter') {
                    if (t.state.hoverItem) {
                        e.preventDefault();
                        t.toggleItem(s.items.get(t.state.hoverItem.dataset.id));
                    }
                    return;
                }

                // ---------- REMOVE TAG ----------
                if ((key === 'Backspace' || key === 'Delete') && d.multiple) {
                    if (t.searchInput.value) return;
                    const tags = t.tags?.children;
                    if (tags && tags.length) {
                        e.preventDefault();

                        // 1. tìm tag selected
                        let removed = false;
                        for (let i = 0; i < tags.length; i++) {
                            const tag = tags[i];
                            if (tag.classList.contains('selected')) {
                                t.toggleItem(s.items.get(tag.dataset.id), i == tags.length - 1);
                                removed = true;
                            }
                        }

                        // 2. nếu không có tag nào selected → xóa tag cuối
                        if (!removed) {
                            const last = tags[tags.length - 1];
                            t.toggleItem(s.items.get(last.dataset.id), true);
                        }
                    }
                    return;
                }

                // ---------- CLOSE ----------
                if (key === 'Escape' || key === 'Tab') t.closeDropdown();
            }
        });
    });

})(typeof window !== 'undefined' ? window : this);