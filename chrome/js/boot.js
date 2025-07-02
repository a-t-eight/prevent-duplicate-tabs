/*
 * Prevent Duplicate Tabs
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 * Released under the MIT license
 *
 * https://github.com/brcontainer/prevent-duplicate-tabs
 */

// Ensure browser compatibility
if (typeof browser === "undefined") {
    window.browser = chrome;
} else if (!window.browser) {
    window.browser = browser;
}

// Debug logging
console.log('Boot.js loading...', { chrome: !!chrome, runtime: !!chrome?.runtime });

function empty() {}

// Updated storage functions for Manifest V3
async function setStorage(key, value) {
    try {
        await chrome.storage.local.set({ [key]: value });
        console.log('Storage set:', key, value);
    } catch (error) {
        console.error('Error setting storage:', error);
    }
}

async function getStorage(key, fallback) {
    try {
        const result = await chrome.storage.local.get([key]);
        const value = result[key] !== undefined ? result[key] : fallback;
        console.log('Storage get:', key, '=', value);
        return value;
    } catch (error) {
        console.error('Error getting storage:', error);
        return fallback;
    }
}

// Legacy synchronous wrapper - converts old localStorage format
function setStorageSync(key, value) {
    console.warn('setStorageSync called - converting to async');
    setStorage(key, value);
}

function getStorageSync(key, fallback) {
    console.warn('getStorageSync called - returning fallback immediately');
    return fallback;
}

function runtimeConnected() {
    const connected = !!chrome && chrome.runtime && chrome.runtime.sendMessage;
    console.log('Runtime connected:', connected);
    return connected;
}

function sendMessage(message, callback) {
    console.log('Sending message:', message);
    
    if (runtimeConnected()) {
        chrome.runtime.sendMessage(message).then(response => {
            console.log('Message response:', response);
            if (callback) callback(response);
        }).catch(error => {
            console.error('Message sending error:', error);
            if (callback) callback(null);
        });
    } else {
        console.error('Runtime not connected for message:', message);
        if (callback) callback(null);
    }
}

// Make functions globally available
window.empty = empty;
window.setStorage = setStorage;
window.getStorage = getStorage;
window.setStorageSync = setStorageSync;
window.getStorageSync = getStorageSync;
window.runtimeConnected = runtimeConnected;
window.sendMessage = sendMessage;

console.log('Boot.js loaded successfully - functions available globally');