/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

(function (w, d) {
    "use strict";

    // Ensure chrome is available
    if (typeof chrome === "undefined") {
        console.error('Chrome API not available');
        return;
    }

    console.log('Popup script loading...'); // Debug log

    let debugMode = false;
    const manifest = chrome.runtime.getManifest();

    // Detect debug mode
    if (chrome.runtime.id && !("requestUpdateCheck" in chrome.runtime)) {
        if (/@temporary-addon$/.test(chrome.runtime.id)) debugMode = true;
    } else if (!("update_url" in manifest)) {
        debugMode = true;
    }

    console.log('Debug mode:', debugMode); // Debug log

    function disableEvent(e) {
        e.preventDefault();
        return false;
    }

    if (!debugMode) {
        d.oncontextmenu = disableEvent;
        d.ondragstart = disableEvent;
    }

    function markdown(message) {
        if (!message) {
            console.warn('Empty message passed to markdown');
            return '';
        }
        
        return message
            .replace(/(^|\s|[>])_(.*?)_($|\s|[<])/g, '$1<i>$2<\/i>$3')
            .replace(/(^|\s|[>])`(.*?)`($|\s|[<])/g, '$1<code>$2<\/code>$3')
            .replace(/\{([a-z])(\w+)?\}/gi, '<var name="$1$2"><\/var>')
            .replace(/(^|\s|[>])\*(.*?)\*($|\s|[<])/g, '$1<strong>$2<\/strong>$3');
    }

    // Apply internationalization with error handling
    function applyI18n() {
        console.log('Applying i18n...'); // Debug log
        
        const locales = d.querySelectorAll("[data-i18n]");
        console.log('Found i18n elements:', locales.length); // Debug log

        let successCount = 0;
        let failureCount = 0;

        for (let i = locales.length - 1; i >= 0; i--) {
            const el = locales[i];
            const key = el.dataset.i18n;
            
            try {
                const message = chrome.i18n.getMessage(key);
                console.log('i18n message for', key, ':', message); // Debug log
                
                if (message) {
                    el.innerHTML = markdown(message);
                    successCount++;
                } else {
                    console.warn('No i18n message found for key:', key);
                    // Fallback to key name for debugging
                    el.textContent = key;
                    failureCount++;
                }
            } catch (error) {
                console.error('Error getting i18n message for', key, ':', error);
                el.textContent = key; // Fallback
                failureCount++;
            }
        }

        console.log(`i18n applied: ${successCount} success, ${failureCount} failures`);
    }

    // Handle external links
    d.addEventListener("click", function (e) {
        if (e.button !== 0) return;

        let el = e.target;

        if (el.nodeName !== "A") {
            el = el.closest("a[href]");
            if (!el) return;
        }

        const protocol = el.protocol;

        if (protocol === "http:" || protocol === "https:") {
            e.preventDefault();
            chrome.tabs.create({ "url": el.href }).catch(error => {
                console.error('Error creating tab:', error);
            });
        }
    });

    // Check incognito permissions with better error handling
    function checkIncognitoPermissions() {
        console.log('Checking incognito permissions...');
        
        if (chrome.extension && chrome.extension.isAllowedIncognitoAccess) {
            const incognitoWarn = d.getElementById("incognito_warn");

            chrome.extension.isAllowedIncognitoAccess().then(allowed => {
                console.log('Incognito allowed:', allowed); // Debug log
                if (incognitoWarn) {
                    incognitoWarn.classList.toggle("hide", allowed === true);
                }
            }).catch(error => {
                console.error('Error checking incognito permissions:', error);
                if (incognitoWarn) {
                    incognitoWarn.classList.toggle("hide", false);
                }
            });
        } else {
            console.log('Incognito permission check not available');
        }
    }

    // Popup animation
    function animatePopup() {
        const se = d.scrollingElement || d.body;

        if (se) {
            setTimeout(function () {
                se.style.transform = "scale(2)";

                setTimeout(function () {
                    se.style.transform = "scale(1)";

                    setTimeout(function () {
                        se.style.transform = null;
                    }, 20);
                }, 20);
            }, 10);
        }
    }

    // Test i18n system
    function testI18nSystem() {
        console.log('Testing i18n system...');
        
        try {
            const testMessage = chrome.i18n.getMessage('title');
            console.log('Test i18n message (title):', testMessage);
            
            if (!testMessage) {
                console.error('i18n system not working - no message for "title"');
                return false;
            }
            
            console.log('i18n system working correctly');
            return true;
        } catch (error) {
            console.error('i18n system error:', error);
            return false;
        }
    }

    // Initialize everything
    function initialize() {
        console.log('Initializing popup...'); // Debug log
        
        try {
            // Test i18n first
            const i18nWorking = testI18nSystem();
            
            if (i18nWorking) {
                applyI18n();
            } else {
                console.error('Skipping i18n application due to system failure');
                
                // Show error message in popup for debugging
                const elements = d.querySelectorAll("[data-i18n]");
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    const key = el.dataset.i18n;
                    el.textContent = `[${key}]`; // Show key in brackets for debugging
                }
            }
            
            checkIncognitoPermissions();
            animatePopup();
            
            console.log('Popup initialization complete'); // Debug log
        } catch (error) {
            console.error('Error during popup initialization:', error);
        }
    }

    // Additional debugging
    console.log('Chrome APIs available:', {
        i18n: !!chrome.i18n,
        tabs: !!chrome.tabs,
        runtime: !!chrome.runtime,
        storage: !!chrome.storage
    });

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})(window, document);