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

(function () {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    // Initialize with default scheme
    async function initColorScheme() {
        const currentScheme = await getStorage("data:color-scheme", "default");
        setColorScheme(media.matches, currentScheme);
    }

    // Listen for data changes
    document.addEventListener("change:data", function (e) {
        if (e.detail.data === "color-scheme") {
            setTimeout(setColorScheme, 100, media.matches, e.detail.value);
        }
    });

    // Listen for system theme changes
    media.onchange = function (e) {
        getStorage("data:color-scheme", "default").then(userPrefer => {
            setColorScheme(e.matches, userPrefer);
        });
    };

    // Initialize
    initColorScheme();
})();