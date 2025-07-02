/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

(function (w, d) {
    "use strict";

    let tabId,
        sync = false;
    
    const isHttpRE = /^https?:\/\/\w/i;
    const variables = {
        "url": null,
        "host": null,
        "version": chrome.runtime.getManifest().version
    };

    function applyIgnoredData(hosts, urls) {
        const http = isHttpRE.test(variables.url);

        if (!http) return;

        const actions = d.getElementById("actions");
        const ignoreds = d.querySelectorAll("[data-ignored]");

        actions.style.display = "block";

        for (let i = ignoreds.length - 1; i >= 0; i--) {
            const el = ignoreds[i];
            const data = el.dataset.ignored;

            if (data.indexOf("urls[") === 0) {
                if (urls.indexOf(variables.url) !== -1) el.classList.toggle("data-ignored", true);
            } else if (data.indexOf("!urls[") === 0) {
                if (urls.indexOf(variables.url) === -1) el.classList.toggle("data-ignored", true);
            } else if (data.indexOf("hosts[") === 0) {
                if (hosts.indexOf(variables.host) !== -1) el.classList.toggle("data-ignored", true);
            } else if (data.indexOf("!hosts[") === 0) {
                if (hosts.indexOf(variables.host) === -1) el.classList.toggle("data-ignored", true);
            }
        }

        applyEvents();
    }

    function applyEvents() {
        const els = d.querySelectorAll("[data-ignored] .col:first-child > button");

        for (let i = els.length - 1; i >= 0; i--) {
            els[i].addEventListener("click", addRemoveUrl);
        }
    }

    function addRemoveUrl(e) {
        const target = e.target;

        if (target && runtimeConnected()) {
            sync = true;

            const type = target.dataset.type;
            const ignore = !target.closest("[data-ignored]").classList.contains("data-ignored");

            sendMessage({
                "type": type,
                "value": type === "url" ? variables.url : variables.host,
                "ignore": ignore,
                "tabId": tabId,
                "url": variables.url
            });

            toggleIgnore(type, ignore);
        }
    }

    function toggleIgnore(type, ignore) {
        const element = d.querySelector("[data-type='" + type + "']");
        if (element) {
            element.closest("[data-ignored]").classList.toggle("data-ignored", ignore);
        }
    }

    function applyIgnoredVars(vars) {
        let query;

        if (vars) {
            query = "var[name='" + vars.join("'], var[name='") + "']";
        } else {
            query = "var[name]";
        }

        const varElements = d.querySelectorAll(query);

        for (let i = varElements.length - 1; i >= 0; i--) {
            const el = varElements[i];
            const key = el.getAttribute("name");
            const value = variables[key];

            if (key && value) {
                el.textContent = value;
                el.removeAttribute("name");
            }
        }
    }

    function containerConfigs(tab) {
        if (tab.cookieStoreId) {
            const configs = d.querySelectorAll(".support-containers");

            for (let i = configs.length - 1; i >= 0; i--) {
                configs[i].classList.toggle("supported-containers", true);
            }
        }
    }

    // Initialize data
    sendMessage({ "ignored": true }, function (response) {
        if (response) {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => {
                if (tabs[0]) {
                    tabId = tabs[0].id;
                    variables.url = tabs[0].url;
                    
                    try {
                        variables.host = new URL(variables.url).host;
                    } catch (error) {
                        variables.host = variables.url;
                    }

                    applyIgnoredVars(["url", "host"]);
                    applyIgnoredData(response.hosts || [], response.urls || []);
                    containerConfigs(tabs[0]);
                }
            }).catch(error => {
                console.error('Error querying tabs:', error);
            });
        }
    });

    // Listen for runtime messages
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (!sync && request.type) toggleIgnore(request.type, request.ignore);
        sync = false;
    });

    // Apply variables initially
    applyIgnoredVars();
})(window, document);