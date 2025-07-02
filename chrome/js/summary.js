/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

(function (w, d, u) {
    "use strict";

    function setEvent(widget, key) {
        widget.addEventListener("toggle", function () {
            setStorage(key, widget.open);
        });
    }

    async function initSummaryStates() {
        const details = d.querySelectorAll("details");

        for (let i = details.length - 1; i >= 0; i--) {
            const widget = details[i];
            const summary = widget.querySelector("[data-i18n]");
            
            if (summary) {
                const key = "details:" + summary.getAttribute("data-i18n");
                const stored = await getStorage(key);

                if (typeof stored === "boolean") {
                    widget.open = stored;
                }

                setEvent(widget, key);
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSummaryStates);
    } else {
        initSummaryStates();
    }
})(window, document);