; (function (root) {
    if (!root.SmartList) return;

    root.SmartList.plugin('requestApi', function (options = {}) {
        const t = this;
        const opts = Object.assign({
            pageSize: 20,
        }, options);

        if (opts.filterControls && opts.filterControls.length > 0) t.filterControls.push(...opts.filterControls);
        if (opts.sorterControls && opts.sorterControls.length > 0) t.sorterControls.push(...opts.sorterControls);
        if (opts.filters && opts.filters.length > 0) t.filters.push(...opts.filters);
        if (opts.sorters && opts.sorters.length > 0) t.sorters.push(...opts.sorters);

        // Override hàm load của instance
        t.on('load', async function (page = 1, append = false) {
            const s = t.settings, st = t.state, sc = s.source;

            if (st.isLoading) return;
            st.isLoading = true;

            let reqBody = t._buildRequestParams(page);
            let data;
            try {
                if (typeof sc === 'function') data = await sc.call(t, reqBody);
                else {
                    const res = await fetch(sc, {
                        method: 'POST',
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(reqBody)
                    });
                    if (!res.ok) throw new Error(`SmartList: Fetch error - ${res.status}`);
                    data = await res.json();
                }
            } catch (err) {
                st.isLoading = false;
                if (s.debugger) console.error(err);
                t.trigger('load_error', err);
                return;
            }

            let itemArray = Array.isArray(data) ? data : data.items || data.data || data.results || [];
            let total = data.totalRecord || data.total || itemArray.length;

            st.hasMore = page * reqBody.pagination.limit < total;
            append = s.mode === constant.mode.infinity;

            itemArray.forEach(entry => {
                const item = typeof entry === 'object' && entry !== null && entry.id !== undefined
                    ? { id: entry.id, label: entry.label || entry.name || entry.id, ...entry }
                    : { id: String(entry), label: String(entry) };
                st.items.set(item.id, item);
            });

            st.selected.forEach((sel, id) => {
                if (st.items.has(id)) st.selected.set(id, st.items.get(id));
            });

            st.isLoading = false;
            t.renderItems(append);  // append = true nếu load more
            if (page === 1 && st.multiple) t.renderTags();
            t.trigger('load_end', { data: itemArray, total });
        });

        // Hàm build params (dùng this.filterControls...)
        t._buildRequestParams = function (page) {
            const t = this, s = t.settings;
            const filters = [...t.filters], sorters = [...t.sorters];

            const _detectType = (el) => {
                if (!el) return "unknown";
                const tag = el.tagName.toLowerCase();
                if (tag === "select") return "select";
                if (tag === "input") {
                    const type = el.getAttribute("type") || "";
                    if (["checkbox", "radio", "text"].includes(type)) return type;
                    return "input";
                }
                if (["button", "a"].includes(tag)) return "button";
                return "unknown";
            };

            // Filters (push thêm từ filterControls)
            for (const cfg of t.filterControls) {
                let value = null;
                if (cfg.quicksearch === true) {
                    if (t.searchInput && t.searchInput.value?.trim()) value = t.searchInput.value?.trim();
                    else continue;
                } else {
                    const el = s.scope.querySelector(cfg.selector);
                    if (!el) continue;
                    switch (cfg.type || _detectType(el)) {
                        case "text": case "select": value = el.value?.trim(); break;
                        case "checkbox": value = el.checked; break;
                        case "radio": value = s.scope.querySelector(`input[name="${el.name}"]:checked`)?.value; break;
                        case "button": value = el.classList.contains("active") ? el.dataset.value : ""; break;
                    }
                }
                if (value) filters.push({ field: cfg.field, operator: cfg.operator, value: value });
            }

            // Sorters (push thêm từ sorterControls)
            for (const cfg of t.sorterControls) {
                const el = s.scope.querySelector(cfg.selector);
                if (!el) continue;
                let value = null;
                switch (cfg.type || _detectType(el)) {
                    case "select": value = el.value?.trim(); break;
                    case "radio": value = s.scope.querySelector(`input[name="${el.name}"]:checked`)?.value; break;
                    case "button": value = el.dataset.sort || "asc"; break;
                }
                if (value) sorters.push({ field: cfg.field, direction: value });
            }

            return {
                pagination: { page: page, limit: opts.pageSize },
                sorters: sorters,
                filters: filters
            };
        };
    });

})(typeof window !== 'undefined' ? window : this);