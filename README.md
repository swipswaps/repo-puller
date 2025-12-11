# Repo Puller GUI

> **⚠️ WARNING: THIS SOFTWARE IS CURRENTLY IN ALPHA STATE AND IS NOT READY FOR PRODUCTION USE. USE AT YOUR OWN RISK.**

## Overview

Repo Puller GUI is a React-based interface designed to simplify the creation of synchronization scripts for repositories. It supports Local, SSH, and Git sources and provides a visual wizard to generate robust Bash scripts for deployment and synchronization.

## User Guide

### 1. Repository Configuration
The app requires two endpoints to be defined:
*   **Source Repository**: Where the data comes from.
    *   **Local**: A path on the local filesystem.
    *   **SSH**: Requires `User`, `Host`, and `Remote Path`. Optionally accepts a `Private Key Path`.
    *   **Git**: Requires a Git URL. Optionally accepts a `Branch` name. Toggle `Use GitHub CLI` if authentication via `gh` is required.
*   **Target Repository**: Where the data goes.
    *   **Force Sudo**: If writing to system directories (e.g., `/var/www`), enable this to prepend `sudo` to commands.

### 2. System Settings
Located below the repository paths, this section configures the environment where the script will run.
*   **Package Manager**: Manually select your OS package manager (`apt`, `dnf`, `yum`, `pacman`, `zypper`, `brew`). The app attempts to auto-detect this.
*   **System Tools**: When enabled, the script includes checks for `git`, `curl`, `python3`, `ssh`, and optionally `gh` or `pip3`.
*   **Firewall**: when enabled, adds commands to configure `ufw` or `firewalld` to open ports 22, 80, and 443.
*   **Install Dependencies**: Adds logic to create a `requirements.txt` and run `pip3 install`.

### 3. Script Generation Wizard
Click **Generate Script** to enter the step-by-step wizard:

1.  **System Environment**: Preview the tool detection logic.
2.  **Network Security**: Preview firewall rules.
3.  **Dependencies**: Add specific Python packages (e.g., `requests`, `pandas`) to the installation list.
4.  **Sync Options**: Toggle `Dry Run` to simulate the sync without modifying files.
5.  **Generated Script**: The final step displays the complete Bash script.
    *   **Download**: Click the Download icon to save as `sync_script.sh`.
    *   **Copy**: Click the Copy icon to copy the content to your clipboard.

## Running the Script
After downloading the script:
1.  Open your terminal.
2.  Make the script executable:
    ```bash
    chmod +x sync_script.sh
    ```
3.  Run the script:
    ```bash
    ./sync_script.sh
    ```

## License
MIT
