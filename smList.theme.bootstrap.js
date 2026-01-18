; (function (root) {
    if (!root.SmartList) return;

    root.SmartList.theme('bootstrap', {
        classMap: {
            container: 'sl-ctn',
            head: 'sl-head',
            tags: 'sl-tags',
            tag: 'sl-tag',
            tagLabel: 'sl-tag-label',
            tagRemove: 'sl-tag-remove',
            control: 'sl-ctrl',
            searchInput: 'sl-search',
            list: 'sl-list',
            items: 'sl-items',
            item: 'sl-item',
        }
    });

})(typeof window !== 'undefined' ? window : this);