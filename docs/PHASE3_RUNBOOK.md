# Phase 3 Validation Runbook

This runbook is the execution checklist for Phase 3 feature parity.

## Preconditions

1. Arqon Bus running on `127.0.0.1:9100`
2. Chrome extension loaded/reloaded from this repository build
3. Test page available from `src/test`
4. Extension popup reports connected state before running command checks

## Setup

From this repository root:

```bash
npm run build
python3 -m http.server 8001
```

Open:

- `http://127.0.0.1:8001/src/test/index.html`
- `http://127.0.0.1:8001/src/test/custom_commands.html`

## 3.1 Overlay System

### 3.1.1 Link Overlay Display

- Trigger command: `show links`
- Expected:
    - Numbered overlays appear over visible link/button candidates
    - Overlays use `arqon-overlay-*` ids
- Evidence:
    - Screenshot of overlay rendering
    - Count of visible overlays

### 3.1.2 Input Overlay Display

- Trigger command: `show inputs`
- Expected:
    - Numbered overlays appear over visible input/textarea/label/editable elements
- Evidence:
    - Screenshot of input overlays

### 3.1.3 Number Selection

- Trigger command sequence: `show links` then `use <n>`
- Expected:
    - Selected element is clicked
    - Overlay set clears after action
- Evidence:
   - Before/after screenshot
   - Observed DOM/UI state change

## 3.2 Click-by-Text

### 3.2.1 Single Element Click

- Trigger command: `click <unique text>`
- Expected:
   - Unique match auto-clicks immediately
   - No numeric disambiguation overlay required
- Evidence:
   - Screenshot or visible target state change

### 3.2.2 Multiple Match Disambiguation

- Trigger command: `click <ambiguous text>`
- Expected:
   - Overlay list appears for disambiguation
   - `use <n>` activates expected target
- Evidence:
   - Screenshot with disambiguation overlays
   - Screenshot after chosen action

### 3.2.3 XPath Text Matching

- Trigger command variants:
   - `click <text from normal element>`
   - `click <input placeholder text>`
   - `click <image alt text>`
- Expected:
   - Matches resolved through XPath-based lookup logic
   - Correct target selection behavior for all three text sources
- Evidence:
   - One pass/fail note per source type

## 3.3 Navigation

### 3.3.1 Back/Forward Commands

- Trigger command sequence:
   - Navigate to a second page
   - `back`
   - `forward`
- Expected:
   - Browser history traversal occurs as expected
- Evidence:
   - URL history or page-state transitions

### 3.3.2 Reload Command

- Trigger command: `reload`
- Expected:
   - Active tab reloads
- Evidence:
   - Reload indicator/network refresh observed

### 3.3.3 Scroll Commands

- Trigger command set:
   - `scroll down`
   - `scroll up`
   - `scroll top`
   - `scroll bottom`
   - `scroll <text target>`
- Expected:
   - Directional scrolling works
   - Text-target scroll centers the matched element
- Evidence:
   - Position changes captured (before/after)

## Result Table

| Item | Status | Evidence |
|------|--------|----------|
| 3.1.1 Link overlay display | Pending | |
| 3.1.2 Input overlay display | Pending | |
| 3.1.3 Number selection | Pending | |
| 3.2.1 Single element click | Pending | |
| 3.2.2 Multiple match disambiguation | Pending | |
| 3.2.3 XPath text matching | Pending | |
| 3.3.1 Back/forward | Pending | |
| 3.3.2 Reload | Pending | |
| 3.3.3 Scroll commands | Pending | |

