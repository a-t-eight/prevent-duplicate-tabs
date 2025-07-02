/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

// Service Worker for Manifest V3
(function () {
    "use strict";

    let ignoreds,
        timeout,
        isHttpRE = /^https?:\/\/\w/i,
        isNewTabRE = /^(about:blank|chrome:\/+?(newtab|startpageshared)\/?)$/i,
        removeHashRE = /#[\s\S]+?$/,
        removeQueryRE = /\?[\s\S]+?$/,
        configs = {
            "turnoff": false,
            "old": true,
            "active": true,
            "start": true,
            "replace": true,
            "update": true,
            "create": true,
            "attach": true,
            "datachange": true,
            "http": true,
            "query": true,
            "hash": false,
            "incognito": false,
            "windows": true,
            "containers": true
        };

    const legacyConfigs = Object.keys(configs);

    // Storage utilities for service worker
    async function setStorage(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
        } catch (error) {
            console.error('Error setting storage:', error);
        }
    }

    async function getStorage(key, fallback) {
        try {
            const result = await chrome.storage.local.get([key]);
            return result[key] !== undefined ? result[key] : fallback;
        } catch (error) {
            console.error('Error getting storage:', error);
            return fallback;
        }
    }

    // Initialize configurations
    async function initConfigs() {
        const firstRun = await getStorage("firstrun");
        
        if (!firstRun) {
            // Set default configs
            for (const config in configs) {
                await setStorage(config, configs[config]);
            }
            await setStorage("firstrun", true);
        } else {
            // Load existing configs
            configs = await getConfigs();
        }
        
        await getIgnored();
    }

    function checkTabs(type) {
        if (configs[type]) {
            chrome.tabs.query(configs.windows ? { "lastFocusedWindow": true } : {}, preGetTabs);
        }
    }

    function preGetTabs(tabs) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(getTabs, 50, tabs);
    }

    function isIgnored(url) {
        return ignoreds && (ignoreds.urls.indexOf(url) !== -1 || ignoreds.hosts.indexOf(new URL(url).host) !== -1);
    }

    function isDisabled() {
        return configs.turnoff || (
            !configs.start &&
            !configs.replace &&
            !configs.update &&
            !configs.create &&
            !configs.attach &&
            !configs.datachange
        );
    }

    function getTabs(tabs) {
        if (isDisabled()) return;

        const groupTabs = {},
              onlyHttp = configs.http,
              ignoreHash = !configs.hash,
              ignoreQuery = !configs.query,
              ignoreIncognitos = !configs.incognito,
              diffWindows = configs.windows,
              diffContainers = configs.containers;

        for (let i = tabs.length - 1; i >= 0; i--) {
            const tab = tabs[i];
            let url = tab.url;

            if (
                tab.pinned ||
                url === "" ||
                isNewTabRE.test(url) ||
                (ignoreIncognitos && tab.incognito) ||
                (onlyHttp && !isHttpRE.test(url)) ||
                isIgnored(url)
            ) {
                continue;
            }

            if (ignoreHash) url = url.replace(removeHashRE, "");
            if (ignoreQuery) url = url.replace(removeQueryRE, "");

            let prefix;

            if (tab.incognito) {
                prefix = "incognito";
            } else if (diffContainers && tab.cookieStoreId) {
                prefix = String(tab.cookieStoreId);
            } else {
                prefix = "normal";
            }

            if (diffWindows) {
                url = prefix + "::" + tab.windowId + "::" + url;
            } else {
                url = prefix + "::" + url;
            }

            if (!groupTabs[url]) groupTabs[url] = [];
            groupTabs[url].push({ "id": tab.id, "actived": tab.active });
        }

        for (const url in groupTabs) {
            closeTabs(groupTabs[url]);
        }
    }

    function sortTabs(tab, nextTab) {
        if (configs.active && (tab.actived || nextTab.actived)) {
            return tab.actived ? -1 : 1;
        }
        return configs.old && tab.id < nextTab.id ? 1 : -1;
    }

    function closeTabs(tabs) {
        const j = tabs.length;
        if (j < 2) return;

        tabs = tabs.sort(sortTabs);

        for (let i = 1; i < j; i++) {
            chrome.tabs.remove(tabs[i].id).catch(() => {});
        }
    }

    function createEvent(type, timeout) {
        return function (tab) {
            setTimeout(checkTabs, timeout, type);
            setTimeout(toggleIgnoreIcon, 100, tab.id || tab.tabId || tab, tab.url);
        };
    }

    async function getConfigs() {
        const result = {};
        
        for (const key of legacyConfigs) {
            result[key] = await getStorage(key, configs[key]);
        }
        
        return result;
    }

    async function getExtraData() {
        const result = await chrome.storage.local.get();
        const data = [];

        for (const key in result) {
            if (key.startsWith("data:")) {
                data.push({
                    "id": key.substr(5),
                    "value": result[key]
                });
            }
        }

        return data;
    }

    async function getIgnored() {
        const hosts = await getStorage("hosts", []);
        const urls = await getStorage("urls", []);

        ignoreds = {
            "urls": Array.isArray(urls) ? urls : [],
            "hosts": Array.isArray(hosts) ? hosts : []
        };
        
        return ignoreds;
    }

    async function toggleIgnoreData(type, ignore, value) {
        const storage = type + "s";
        let contents = await getStorage(storage, []);

        if (!Array.isArray(contents)) contents = [];

        const index = contents.indexOf(value);
        let changed = true;

        if (ignore && index === -1) {
            contents.push(value);
        } else if (!ignore && index !== -1) {
            contents.splice(index, 1);
        } else {
            changed = false;
        }

        if (changed) {
            await setStorage(storage, contents);
            ignoreds[storage] = contents;
        }
    }

    function toggleIgnoreIcon(tab, url) {
        if (!url) {
            chrome.tabs.get(tab).then(tabInfo => {
                if (tabInfo) {
                    const tabUrl = tabInfo.url || tabInfo.pendingUrl;
                    setTimeout(toggleIgnoreIcon, tabUrl ? 0 : 500, tabInfo.id, tabUrl);
                }
            }).catch(() => {});
        } else {
            let icon;

            if (isDisabled() || isIgnored(url)) {
                icon = "/images/disabled.png";
            } else {
                icon = "/images/icon.png";
            }

            chrome.action.setIcon({
                "tabId": tab,
                "path": icon
            }).catch(() => {});
        }
    }

    function updateCurrentIcon(tabs) {
        if (tabs && tabs[0]) toggleIgnoreIcon(tabs[0].id, tabs[0].url);
    }

    // Event listeners
    chrome.runtime.onStartup.addListener(() => {
        initConfigs().then(() => {
            setTimeout(checkTabs, 100, "start");
        });
    });

    chrome.runtime.onInstalled.addListener(() => {
        initConfigs().then(() => {
            setTimeout(checkTabs, 100, "start");
        });
    });

    chrome.tabs.onAttached.addListener(createEvent("attach", 500));
    chrome.tabs.onCreated.addListener(createEvent("create", 10));
    chrome.tabs.onReplaced.addListener(createEvent("replace", 10));
    chrome.tabs.onUpdated.addListener(createEvent("update", 10));

    chrome.tabs.onActivated.addListener(function (tab) {
        toggleIgnoreIcon(tab.tabId);
    });

    // Message handler
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        (async () => {
            try {
                if (request.ignore !== undefined) {
                    await toggleIgnoreData(request.type, request.ignore, request.value);
                    toggleIgnoreIcon(request.tabId, request.url);
                } else if (request.setup) {
                    configs[request.setup] = request.enable;
                    await setStorage(request.setup, request.enable);
                    const tabs = await chrome.tabs.query({ "active": true, "lastFocusedWindow": true });
                    updateCurrentIcon(tabs);
                } else if (request.data) {
                    const key = "data:" + request.data;
                    await setStorage(key, request.value);
                } else if (request.extra) {
                    const extraData = await getExtraData();
                    sendResponse(extraData);
                    return;
                } else if (request.configs) {
                    const currentConfigs = await getConfigs();
                    sendResponse(currentConfigs);
                    return;
                } else if (request.ignored) {
                    const ignoredData = await getIgnored();
                    sendResponse(ignoredData);
                    return;
                }

                if (request.setup || request.ignore !== undefined) {
                    if (configs.datachange) setTimeout(checkTabs, 10, "datachange");
                }
                
                sendResponse({ success: true });
            } catch (error) {
                console.error('Message handler error:', error);
                sendResponse({ error: error.message });
            }
        })();
        
        return true; // Keep message channel open for async response
    });

    // Initialize on service worker startup
    initConfigs();
})();