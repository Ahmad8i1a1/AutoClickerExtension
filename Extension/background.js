let intervalId;
const clickSound = new Audio("click-sound.mp3"); // Load the click sound

chrome.storage.local.get(["enabled", "interval"], function (result) {
    if (result.enabled) {
        intervalId = setInterval(clickRandomLocation, result.interval);
    }
});

function clickRandomLocation() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => {
                const randomX = Math.random() * window.innerWidth;
                const randomY = Math.random() * window.innerHeight;
                const event = new MouseEvent("click", {
                    clientX: randomX,
                    clientY: randomY,
                });
                document.elementFromPoint(randomX, randomY).dispatchEvent(event);

                // Play the click sound
                clickSound.play();
            },
        });
    });
}
