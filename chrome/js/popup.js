// Popup script for Manifest V3
document.addEventListener('DOMContentLoaded', async function() {
    const mainToggle = document.getElementById('mainToggle');
    const mainContent = document.getElementById('mainContent');
    const closeDuplicatesBtn = document.getElementById('closeDuplicatesBtn');
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    const totalTabsSpan = document.getElementById('totalTabs');
    const duplicateGroupsSpan = document.getElementById('duplicateGroups');
    const duplicateTabsSpan = document.getElementById('duplicateTabs');
    
    let currentSettings = null;
    
    // Load current settings and update UI
    async function loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
            currentSettings = response;
            updateToggleState();
            updateStats();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    // Update toggle switch state
    function updateToggleState() {
        if (currentSettings && currentSettings.enabled) {
            mainToggle.classList.add('active');
            mainContent.classList.remove('disabled-overlay');
        } else {
            mainToggle.classList.remove('active');
            mainContent.classList.add('disabled-overlay');
        }
    }
    
    // Update statistics
    async function updateStats() {
        try {
            // Get all tabs
            const tabs = await chrome.tabs.query({});
            totalTabsSpan.textContent = tabs.length;
            
            if (!currentSettings || !currentSettings.enabled) {
                duplicateGroupsSpan.textContent = '-';
                duplicateTabsSpan.textContent = '-';
                return;
            }
            
            // Get duplicate information
            const response = await chrome.runtime.sendMessage({ action: 'findDuplicates' });
            const duplicates = response.duplicates || [];
            
            duplicateGroupsSpan.textContent = duplicates.length;
            
            // Calculate total tabs that can be closed
            const totalDuplicateTabs = duplicates.reduce((sum, duplicate) => {
                return sum + Math.max(0, duplicate.tabs.length - 1);
            }, 0);
            
            duplicateTabsSpan.textContent = totalDuplicateTabs;
            
            // Update button state
            if (totalDuplicateTabs > 0) {
                closeDuplicatesBtn.textContent = `Close ${totalDuplicateTabs} Duplicate Tab${totalDuplicateTabs > 1 ? 's' : ''}`;
                closeDuplicatesBtn.disabled = false;
            } else {
                closeDuplicatesBtn.textContent = 'No Duplicates Found';
                closeDuplicatesBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('Error updating stats:', error);
            duplicateGroupsSpan.textContent = 'Error';
            duplicateTabsSpan.textContent = 'Error';
        }
    }
    
    // Toggle main functionality
    mainToggle.addEventListener('click', async function() {
        if (!currentSettings) return;
        
        const newEnabled = !currentSettings.enabled;
        
        try {
            await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: { enabled: newEnabled }
            });
            
            currentSettings.enabled = newEnabled;
            updateToggleState();
            updateStats();
            
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    });
    
    // Close duplicates button
    closeDuplicatesBtn.addEventListener('click', async function() {
        try {
            closeDuplicatesBtn.textContent = 'Closing...';
            closeDuplicatesBtn.disabled = true;
            
            await chrome.runtime.sendMessage({ action: 'closeDuplicates' });
            
            // Refresh stats after closing
            setTimeout(updateStats, 500);
            
        } catch (error) {
            console.error('Error closing duplicates:', error);
            closeDuplicatesBtn.textContent = 'Error';
        }
    });
    
    // Refresh stats button
    refreshStatsBtn.addEventListener('click', updateStats);
    
    // Options button
    optionsBtn.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
    
    // Initialize
    await loadSettings();
});