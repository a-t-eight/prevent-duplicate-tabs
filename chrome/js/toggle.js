/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

(function (w, d, u) {
    "use strict";

    let sync = false;
    const dataChange = { "data": u, "value": u };
    const dataEvent = new CustomEvent("change:data", { "detail": dataChange });

    function changeSwitch(e) {
        if (runtimeConnected()) {
            sync = true;
            sendMessage({ "enable": this.checked, "setup": this.id });
        }
    }

    function changeRadio(e) {
        if (runtimeConnected()) {
            sync = true;
            sendMessage({ "data": this.name, "value": this.value });
            triggerEvent(this.name, this.value);
        }
    }

    function updateRadio(id, value, response, trigger) {
        const els = d.querySelectorAll("input[type=radio][name='" + id + "']");

        for (let i = els.length - 1; i >= 0; i--) {
            const current = els[i];
            current.disabled = false;

            if (current.value === value) current.checked = true;
        }
    }

    let timeoutEvent = 0;

    function triggerEvent(data, value) {
        clearTimeout(timeoutEvent);

        timeoutEvent = setTimeout(function () {
            dataChange.data = data;
            dataChange.value = value;
            d.dispatchEvent(dataEvent);
        }, 100);
    }

    // Load configurations
    sendMessage({ "configs": true }, function (response) {
        if (response) {
            const toggles = d.querySelectorAll(".toggle input[type=checkbox]");

            for (let i = toggles.length - 1; i >= 0; i--) {
                const current = toggles[i];
                current.checked = !!response[current.id];
                current.disabled = false;
            }
        }
    });

    // Load extra data (themes, etc.)
    sendMessage({ "extra": true }, function (response) {
        if (response) {
            for (let i = response.length - 1; i >= 0; i--) {
                updateRadio(response[i].id, response[i].value, response[i], false);
            }
        }
    });

    // Listen for runtime messages
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (!sync) {
            if (request.setup) {
                const element = d.getElementById(request.setup);
                if (element) element.checked = request.enable;
            } else if (request.data) {
                updateRadio(request.data, request.value, request, true);
                triggerEvent(request.data, request.value);
            }
        }

        sync = false;
    });

    // Add event listeners to toggles
    const toggles = d.querySelectorAll(".toggle input[type=checkbox]");
    for (let i = toggles.length - 1; i >= 0; i--) {
        toggles[i].addEventListener("change", changeSwitch);
    }

    // Add event listeners to radio buttons
    const radios = d.querySelectorAll(".radio input[type=radio]");
    for (let i = radios.length - 1; i >= 0; i--) {
        radios[i].addEventListener("change", changeRadio);
    }
})(window, document);