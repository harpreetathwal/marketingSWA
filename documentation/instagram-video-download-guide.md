# Downloading All Videos from an Instagram Account

This guide documents the Windows/PowerShell workflow that successfully downloaded videos from an Instagram profile using Python and `gallery-dl`.

Only download media you own or have permission to retain. Instagram may change its site or authentication behavior, so update the tools before troubleshooting.

## 1. Install or update the required tools

Python 3.13 works with this workflow. In PowerShell, run:

```powershell
python -m pip install -U gallery-dl yt-dlp
```

`gallery-dl` processes the Instagram profile. `yt-dlp` is an optional video downloader used by `gallery-dl`; installing it prevents the `Cannot import yt-dlp or youtube-dl` warning.

## 2. Export your Instagram cookies from Chrome

Direct Chrome-cookie extraction may fail with `DPAPI` or Chrome encryption errors. A Netscape-format `cookies.txt` export avoids that problem.

1. Install the Chrome extension **Get cookies.txt LOCALLY** from the Chrome Web Store.
2. Open [Instagram](https://www.instagram.com/) and log into the Instagram account you want to use for access.
3. Refresh the Instagram page after installing the extension.
4. Click Chrome's puzzle-piece icon near the address bar.
5. Select **Get cookies.txt LOCALLY**.
6. Choose **Export**, **Download**, or the download-arrow button.
7. If prompted for scope, choose **Current site**.
8. Save the exported file somewhere temporary, for example:

   ```text
   C:\Users\YOUR_USERNAME\Downloads\instagram-cookies.txt
   ```

Press `Ctrl+J` in Chrome if you need to find the downloaded file.

### If the extension cannot access Instagram

1. Open `chrome://extensions/` in Chrome.
2. Find **Get cookies.txt LOCALLY** and select **Details**.
3. Under **Site access**, allow access to `instagram.com` or choose **On all sites**.
4. Return to Instagram, refresh the page, and export again.

## 3. Download videos from a profile

Change only `$profileUrl` and `$accountName` for each Instagram profile. Update `$cookies` if your exported file has a different path or filename.

```powershell
$profileUrl = "https://www.instagram.com/ACCOUNT_NAME/"
$accountName = "ACCOUNT_NAME"
$cookies = "$HOME\Downloads\instagram-cookies.txt"
$output = "$HOME\Videos\Instagram\$accountName"

New-Item -ItemType Directory -Force -Path $output | Out-Null

python -m gallery_dl `
  --cookies $cookies `
  --filter "extension in ('mp4','m4v','mov','webm')" `
  --download-archive "$output\downloaded.sqlite3" `
  --sleep-request 1 `
  -d $output `
  $profileUrl
```

Example:

```powershell
$profileUrl = "https://www.instagram.com/andriilantukh/"
$accountName = "andriilantukh"
$cookies = "$HOME\Downloads\instagram-cookies.txt"
$output = "$HOME\Videos\Instagram\$accountName"

New-Item -ItemType Directory -Force -Path $output | Out-Null

python -m gallery_dl `
  --cookies $cookies `
  --filter "extension in ('mp4','m4v','mov','webm')" `
  --download-archive "$output\downloaded.sqlite3" `
  --sleep-request 1 `
  -d $output `
  $profileUrl
```

The video filter skips JPG and other image posts. The archive database remembers completed media, so running the same command later should download only new items.

## 4. Open the download folder

```powershell
explorer $output
```

Depending on `gallery-dl`'s directory settings, it may create additional `instagram\ACCOUNT_NAME` folders underneath the output directory.

## 5. Protect your Instagram session

The exported cookie file contains an active Instagram session and should be treated like a password.

- Never email, upload, or share it.
- Do not keep it inside a Git/project folder where it could be committed.
- Delete it after the download finishes:

```powershell
Remove-Item "$HOME\Downloads\instagram-cookies.txt"
```

- Remove the cookie-export extension when you no longer need it.
- If the cookie file was exposed or committed, log out of Instagram sessions and change your password.

## Repeating this later

1. Update the packages with `python -m pip install -U gallery-dl yt-dlp`.
2. Log into Instagram in Chrome.
3. Export a fresh `cookies.txt` for the current Instagram site.
4. Change `$profileUrl` and `$accountName` in the reusable command.
5. Run the command.
6. Open `$output` to confirm the files.
7. Delete the exported cookie file.

## Common errors

### `Permission denied ... Chrome ... Cookies`

Chrome is locking its cookie database. Closing Chrome may release it, but exporting `cookies.txt` is more reliable.

### `Failed to decrypt cookie (DPAPI)`

Chrome's cookie encryption blocked automatic extraction. Use the exported `cookies.txt` method in this guide.

### `Cannot import yt-dlp or youtube-dl`

Install the optional dependency:

```powershell
python -m pip install -U yt-dlp
```

If MP4 files still download using fallback URLs, this warning is not fatal.

### Images download along with videos

Make sure the command includes:

```powershell
--filter "extension in ('mp4','m4v','mov','webm')"
```

### The current PowerShell folder looks empty

The `-d` argument controls the destination. Check `$output`, not necessarily the folder from which you ran the command:

```powershell
explorer $output
```

### `NotFoundError: Requested user could not be found`

Confirm that the profile URL is correct and that your exported cookies are fresh. Open the profile in the same logged-in Chrome session before exporting the cookies again.
