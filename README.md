# INSTALLATION
Before using **fromista**, you need to have **Node.js** installed on your system.  
If you haven’t installed it yet, please download the latest version from the [official Node.js website](https://nodejs.org/).

```python
# All commands should be run in a terminal (e.g., CMD on Windows).
# 1. install fromista.
node install -g fromista

# 2. install playwright for use browser.
npx playwright install
```

# USAGE AND OPTIONS
## Download Options:
```python
# fromista requires you to be logged in to your browser.
# Please log in first using the command below.
frm login

# How to get the last 5 posts from the user
# -u, --user <member>
frm -u shy9_29

# How to download using an Instagram link
# -l, --link <url>
frm -l https://www.instagram.com/p/DOVY3UyDj-I/
```

## Configure Options:
```python
# How to specify the download path
# Default download path: %HOMEDIR%/.fromista/downloads
# -o, --output <path>
frm -o ~/Desktop/downloads

# How to choose whether to download video thumbnails as well
# -t, --thumbnail <yes_no>
frm -t yes

# How to reset all settings
# -c, --clear
frm -c
```
