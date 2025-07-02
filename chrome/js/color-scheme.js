/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

function setColorScheme(darkPrefer, userPrefer) {
    let disable;
    const links = document.querySelectorAll("link[href*='-dark.css']");

    switch (userPrefer) {
        case "dark":
            disable = false;
            break;
        case "light":
            disable = true;
            break;
        case "default":
        default:
            disable = !darkPrefer;
    }

    for (let i = links.length - 1; i >= 0; i--) {
        links[i].rel = disable ? "preload" : "stylesheet";
    }
}

// Initialize color scheme system
function initColorScheme() {
    console.log('Initializing color scheme...');
    
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    // Initialize with default scheme
    async function loadInitialScheme() {
        try {
            const currentScheme = await getStorage("data:color-scheme", "default");
            console.log('Current color scheme:', currentScheme);
            setColorScheme(media.matches, currentScheme);
        } catch (error) {
            console.error('Error loading initial color scheme:', error);
            setColorScheme(media.matches, "default");
        }
    }

    // Listen for data changes
    function setupDataListener() {
        if (document.addEventListener) {
            document.addEventListener("change:data", function (e) {
                if (e.detail && e.detail.data === "color-scheme") {
                    console.log('Color scheme changed to:', e.detail.value);
                    setTimeout(setColorScheme, 100, media.matches, e.detail.value);
                }
            });
        }
    }

    // Listen for system theme changes
    function setupMediaListener() {
        if (media && media.addEventListener) {
            media.addEventListener('change', function (e) {
                console.log('System theme changed:', e.matches ? 'dark' : 'light');
                getStorage("data:color-scheme", "default").then(userPrefer => {
                    setColorScheme(e.matches, userPrefer);
                }).catch(error => {
                    console.error('Error handling system theme change:', error);
                    setColorScheme(e.matches, "default");
                });
            });
        } else if (media && media.addListener) {
            // Fallback for older browsers
            media.addListener(function (e) {
                console.log('System theme changed (legacy):', e.matches ? 'dark' : 'light');
                getStorage("data:color-scheme", "default").then(userPrefer => {
                    setColorScheme(e.matches, userPrefer);
                }).catch(error => {
                    console.error('Error handling system theme change:', error);
                    setColorScheme(e.matches, "default");
                });
            });
        }
    }

    // Initialize everything
    try {
        loadInitialScheme();
        setupDataListener();
        setupMediaListener();
        console.log('Color scheme initialization complete');
    } catch (error) {
        console.error('Color scheme initialization failed:', error);
    }
}

// Wait for dependencies and DOM
function waitForDependencies() {
    if (typeof getStorage === 'function' && document.readyState !== 'loading') {
        initColorScheme();
    } else {
        console.log('Waiting for dependencies...');
        setTimeout(waitForDependencies, 100);
    }
}

// Start initialization
waitForDependencies();