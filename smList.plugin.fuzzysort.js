; (function (root) {
    if (!root.SmartList) return;

    root.SmartList.plugin('fuzzySort', function (options = {}) {
        const t = this, st = t.state, sc = t.settings.source;
        const opts = typeof options === 'object' ? options : {};

        // Kiểm tra fuzzysort
        let fuzzysortLib = null;
        if (typeof fuzzysort !== 'undefined') fuzzysortLib = fuzzysort;
        else if (typeof window !== 'undefined' && window.fuzzysort) fuzzysortLib = window.fuzzysort;
        else if (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
            try {
                const fuzzysort = require('fuzzysort');
                fuzzysortLib = fuzzysort.default || fuzzysort.go || fuzzysort;
            } catch (e) {
                // fuzzysort không có sẵn
            }
        }
        if (!fuzzysortLib || !fuzzysortLib.go) {
            if (st.debugger) console.warn('SmartList: fuzzysort not found, fuzzySort plugin disabled');
            return;
        }

        // Lưu data gốc
        t._allItems = [];

        const originalLoad = t.load;
        t.load = async function (page = 1, append = false) {
            // Chỉ hoạt động với source array hoặc staticItems
            const isArraySource = Array.isArray(sc);
            const isStaticSource = !sc && st.staticItems && st.staticItems.size > 0;
            if (!isArraySource && !isStaticSource) return;

            const query = t.searchInput?.value?.trim() || '';
            if (!query) return await originalLoad.call(t, page, append);

            if (st.isLoading) return;
            st.isLoading = true;

            // Chuẩn hoá items
            const itemsArray = isArraySource
                ? sc.map(entry => {
                    if (typeof entry === 'object' && entry !== null && entry.id !== undefined) {
                        return { id: entry.id, label: entry.label || entry.name || entry.id, ...entry };
                    }
                    return { id: String(entry), label: String(entry) };
                })
                : Array.from(st.staticItems.values());

            // Cache all items
            if (itemsArray.length > 0) {
                const shouldUpdate =
                    t._allItems.length === 0 ||
                    t._allItems.length !== itemsArray.length ||
                    (t._allItems[0] && itemsArray[0] && t._allItems[0].id !== itemsArray[0].id);

                if (shouldUpdate) t._allItems = itemsArray;
            }

            // FUZZY SORT (KHÔNG FILTER)
            try {
                const results = fuzzysortLib.go(query, t._allItems, {
                    key: opts.key || 'label',
                    limit: opts.limit || 1000,
                    threshold: opts.threshold ?? -10000,
                    allowTypo: opts.allowTypo !== false
                });

                // Giữ toàn bộ items, nhưng item match được đưa lên trước
                const matchedIds = new Set(results.map(r => r.obj.id));

                const sorted = [
                    ...results.map(r => r.obj),
                    ...t._allItems.filter(item => !matchedIds.has(item.id))
                ];

                st.items = new Map(sorted.map(item => [item.id, item]));

                // Lưu highlight ranges nếu cần
                st._matchRanges = new Map(
                    results.map(r => [
                        r.obj.id,
                        r[opts.key || 'label']?.indexes || []
                    ])
                );

            } catch (e) {
                if (st.debugger) console.warn('SmartList: fuzzysort error', e);
                st.isLoading = false;
                return await originalLoad.call(t, page, append);
            }

            // Render giống core
            t.renderItems();
            if (t.settings.multiple) t.renderTags();

            t.trigger('load');
            st.isLoading = false;
        };

        // Cleanup
        const originalDestroy = t.destroy;
        t.destroy = function () {
            t._allItems = [];
            if (t.state && t.state._matchRanges) t.state._matchRanges.clear();
            originalDestroy.call(t);
        };
    });

}) (typeof window !== 'undefined' ? window : this);