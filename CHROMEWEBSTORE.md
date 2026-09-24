# Chrome Web Store Listing — Auto Clicker & Swipe Automation

> Last Updated: 2026-09-25

## Store Listing

**Extension Name** [REQUIRED]
Auto Clicker & Swipe Automation

**Short Description** [REQUIRED]
Auto click, multi-point swipe gestures, custom sequence automation up to 10 points, and auto-refresh for web pages.

**Detailed Description** [REQUIRED]
Effortlessly automate repetitive clicks, touch swipes, and page refreshing on any webpage with visual pinpoint precision.

Key Features:
- Visual Point Picker: Click directly on your webpage or drag to record exact coordinates without guessing pixel numbers.
- Up to 10 Custom Action Points: Chain together up to 10 customizable steps combining clicks and directional swipes.
- Multi-Point Swipes: Perform realistic swipe gestures from Point A to Point B with customizable duration and optional smooth page scrolling.
- Flexible Behavior Per Step: Configure each action with custom delays, single/double/long clicks, or smooth swipe trajectories.
- Quick Single Clicker: High-speed continuous auto-clicker for single target points with customizable interval and repeat limit.
- Automatic Page Refresh: Set periodic refresh intervals (e.g. 10s, 30s, 1m) with optional sequence auto-resumption upon reload.
- Visual On-Screen Pins: Draggable pins on the webpage that allow you to adjust points in real time.
- Keyboard Shortcut: Instant start/stop control with Alt+Shift+S.
- Safe & Private: Operates completely on your device with no external data transmission or tracking.

How to Use:
1. Open any webpage and click the extension icon.
2. In the Action Sequence tab, click "+ Add Action" and select Click or Swipe.
3. Click "Pick Point" to visually select where to click, or "Pick A ➔ B" to draw a swipe gesture.
4. Set your desired delays, loops, or auto-refresh settings.
5. Click "Start Sequence" (or press Alt+Shift+S) to run!

Privacy & Permissions:
Auto Clicker & Swipe Automation runs entirely locally in your browser. It does not collect, transmit, or share any personal data, browsing history, or keystrokes.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Automates webpage clicks, swipe gestures, and page refreshing based on user-defined coordinates and intervals.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `Extension/icons/icon-128.png` |
| Extension Icon 48 | 48×48 PNG | ✅ Ready | `Extension/icons/icon-48.png` |
| Extension Icon 16 | 16×16 PNG | ✅ Ready | `Extension/icons/icon-16.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: Extension popup displaying Action Sequence with mixed Click and Swipe steps.
- Screenshot 2: Visual on-screen crosshair point picker on a webpage.
- Screenshot 3: Draggable pins and animated swipe vector arrows on page.
- Screenshot 4: Auto-refresh countdown and quick single-clicker view.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to store and persist user-configured action sequences, coordinates, delays, and auto-refresh intervals locally. |
| `activeTab` | permissions | Required to interact with the current active tab when the user initiates point picking or runs actions. |
| `scripting` | permissions | Required to inject the visual coordinate picker overlay and event dispatchers into the active webpage. |
| `tabs` | permissions | Required to detect tab status and trigger page reloads for the auto-refresh feature and reload-after-cycle workflow. |
| `alarms` | permissions | Required to support reliable scheduling for auto-refresh timers. |
| `<all_urls>` | host_permissions | Required to enable click and swipe automation on whichever webpage the user chooses to run their automated actions. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
https://github.com/Ahmad8i1a1/AutoClickerExtension/blob/main/PRIVACY.md

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]
Ahmad Bilal

**Contact Email** [REQUIRED]
ahmadbilal@example.com

**Homepage URL** [RECOMMENDED]
https://github.com/Ahmad8i1a1/AutoClickerExtension

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.0.0 | 2026-09-25 | Added visual point picker, up to 10 multi-point actions combining clicks and swipes, draggable pins, auto page refresh, and preset import/export. | Draft |
| 1.0.0 | 2026-09-24 | Initial proof of concept random clicker. | Published |

## Review Notes

### Known Issues / Limitations
- Webpages loaded inside browser system tabs (`chrome://`, `chrome-extension://`, Chrome Web Store) block content scripts due to browser security restrictions. The extension detects this and informs the user.
