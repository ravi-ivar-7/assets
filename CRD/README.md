# RemoveCRD — Quick Run Instructions

> ⚠️ **Important:** `RemoveCRD.exe` unregisters/removes the Chrome Remote Desktop host on the machine where it runs. **Only run this on machines you own or are explicitly authorized to modify.** Do **not** run this on other people's devices. Scan and verify the binary before running.

---

## What this does
`RemoveCRD.exe` registers a global hotkey (**Ctrl + Alt + B**). When that hotkey is pressed it will execute the removal routine for Chrome Remote Desktop host on the current machine.

---

## Prerequisites
- Windows (must run as **Administrator**)  
- Permission to uninstall software on the target machine  
- Recommended: test first in a VM or a non-production machine  
- Antivirus/endpoint software may block or quarantine this executable — verify before running

---

## Quick start (copy‑paste friendly)

1. Clone the repository:
```bash
git clone https://github.com/ravi-ivar-7/assets
```

2. Open File Explorer and go to the CRD directory inside the cloned repo.

3. Right‑click RemoveCRD.exe → Run as administrator.

4. Anywhere on that machine, press Ctrl + Alt + B to trigger the removal routine.

## Troubleshooting
- Hotkey doesn't work: Ensure RemoveCRD.exe is running with Administrator privileges. Restart it using Run as administrator.
- Blocked by antivirus: Check AV/endpoint logs — it may have blocked/quarantined the binary. Only whitelist if you trust the file.
- Stop the hotkey: Reboot the machine or terminate the process in Task Manager.
## Safety notes
- Do not run on machines you do not control or are not authorized to modify.