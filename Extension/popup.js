document.addEventListener("DOMContentLoaded", function () {
    const toggleSwitch = document.getElementById("toggleSwitch");
    const intervalInput = document.getElementById("interval");

    toggleSwitch.addEventListener("change", function () {
        if (toggleSwitch.checked) {
            const intervalMinutes = parseInt(intervalInput.value, 10);
            const intervalMilliseconds = intervalMinutes * 60 * 1000; // Convert to milliseconds
            chrome.storage.local.set({ enabled: true, interval: intervalMilliseconds });
        } else {
            chrome.storage.local.set({ enabled: false });
        }
    });

    chrome.storage.local.get(["enabled"], function (result) {
        toggleSwitch.checked = result.enabled;
    });
});
