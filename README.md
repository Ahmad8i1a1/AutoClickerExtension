# Auto Clicker & Swipe Automation (Chrome Extension)

A powerful, visual, and intuitive Chrome Extension (Manifest V3) designed to automate repetitive mouse clicks, swipe / touch gestures, and periodic webpage refreshing.

---

## 🚀 Key Features

### 1. 🎯 Auto Click on Specific Webpage Locations
- **Visual Crosshair Point Picker**: Click anywhere on the webpage to automatically capture exact `(X, Y)` coordinates without guessing pixel numbers.
- **Draggable On-Screen Pins**: Visual numbered markers appear directly on the webpage. Drag and drop any pin to reposition the target point interactively.
- **Custom Click Behaviors**: Supports **Single Click**, **Double Click**, and **Long Press** (500ms hold) with configurable delays before each action.
- **Visual Ripple Effect**: See a subtle pulse animation wherever a click is dispatched.

### 2. 👉 Auto Swipe / Drag from Point A to Point B
- **Interactive Swipe Vector Picker**: Click Point A then Point B, or simply drag across the screen to establish a swipe vector.
- **Realistic Gesture Simulation**: Emulates full `pointerdown`/`pointermove`/`pointerup` and touch events interpolated smoothly over customizable durations (e.g. 400ms).
- **Simulate Page Scrolling**: Option to automatically scroll the page or element along with the swipe gesture.
- **Visual Trajectory Trails**: SVG directional arrows and laser trail animations show the swipe path in real time.

### 3. 🔀 Combined Multi-Action Sequences (Up to 10 Points)
- **Chain Up to 10 Custom Actions**: Mix and match Clicks and Swipes in any order (e.g., Step 1: Click at button, Step 2: Swipe down to scroll, Step 3: Click confirmation, etc.).
- **Individual Behavior Controls**: Each step has independent delays, coordinates, durations, and enable/disable toggles.
- **Loop Control**: Run once, loop a specified number of times (e.g., 5 loops), or run indefinitely.
- **Reload After Cycle**: Automatically refresh the webpage after completing a sequence cycle, with automatic resumption once reloaded!

### 4. 🔄 Auto Refresh Current Webpages
- **Periodic Page Reloads**: Set intervals in seconds or minutes (e.g., 10s, 30s, 1m, 5m).
- **Hard Reload Option**: Bypass browser cache on reload.
- **Auto-Start Sequence After Reload**: Automatically triggers your configured action sequence after the page finishes refreshing.
- **Manual Quick Refresh**: Instant one-click page reload button.

### 5. ⚡ Quick Single Clicker
- High-speed continuous auto-clicker for a single target point with customizable frequency (intervals down to 50ms) and repeat limits.

### 6. ⌨️ Global Hotkey & Presets
- **Global Shortcut**: Press `Alt + Shift + S` to start or stop the active automation sequence from anywhere.
- **Export & Import Presets**: Save your complete action sequence configurations as `.json` files to share or load anytime.

---

## 🛠️ Project Structure

```
AutoClickerExtension/
├── CHROMEWEBSTORE.md          # Chrome Web Store listing metadata & justifications
├── PRIVACY.md                 # Privacy policy
├── README.md                  # Project documentation
├── Extension/
│   ├── manifest.json          # Manifest V3 configuration
│   ├── background.js          # Service worker for commands, badges, and tab lifecycle
│   ├── click-sound.mp3        # Audio feedback
│   ├── icons/                 # Extension icons in standard resolutions
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   ├── content/               # Injected scripts for DOM automation & visual picker
│   │   ├── content.js
│   │   └── content.css
│   └── popup/                 # Modern popup user interface
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
```

---

## 📦 Installation Instructions

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/Ahmad8i1a1/AutoClickerExtension.git
   ```
2. Open Google Chrome (or any Chromium-based browser like Brave, Edge, or Opera).
3. Navigate to `chrome://extensions/` in the address bar.
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** in the top-left corner.
6. Select the `Extension` directory from this repository:
   ```
   d:\Work\AutoClickerExtension\Extension
   ```
7. The extension icon will appear in your Chrome toolbar. Pin it for quick access!

---

## 📖 How to Use

### Creating an Action Sequence:
1. Navigate to the webpage you want to automate.
2. Click the extension icon to open the popup.
3. In the **Sequence** tab, click **+ Add Action**.
4. Choose the action type:
   - For a **Click**: Click `🎯 Pick Point`, then click anywhere on your webpage.
   - For a **Swipe**: Click `👉 Pick A➔B`, then click or drag from the starting point to the ending point.
5. Adjust delays (in milliseconds) and customize options.
6. Add up to 10 actions as desired.
7. Click **▶ Start Sequence** (or press `Alt + Shift + S`).

### Enabling Webpage Auto-Refresh:
1. Open the popup and select the **Auto Refresh** tab.
2. Toggle **Enable Periodic Refresh** ON.
3. Enter your desired interval (e.g. `30` seconds) or click one of the preset pills (`10s`, `30s`, `1m`, `5m`).
4. Optionally check **Auto-Start Sequence After Reload** if you want your click/swipe sequence to execute every time the page refreshes.

---

## 🔒 Privacy & Security

This extension runs 100% locally on your computer. It never collects, stores, or transmits your personal information, passwords, credentials, or browsing history to any server.

---

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
