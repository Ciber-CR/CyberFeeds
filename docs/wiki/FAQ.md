# Frequently Asked Questions

General questions about CyberFeeds features, configuration, and troubleshooting.

---

## General

### What is CyberFeeds?
CyberFeeds is a free, open-source RSS/Atom feed reader for Windows. It allows you to subscribe to feeds, read articles, manage your reading flow, and get notifications for new articles.

### Is CyberFeeds free?
Yes. CyberFeeds is completely free and open source under the GPLv3 license. There are no paid features, ads, or tracking. You can help keep it free [here](https://github.com/CyberGems/CyberFeeds#-donate).

### What platforms are supported?
CyberFeeds is built with Electron and primarily targets Windows. macOS and Linux builds are possible but the primary focus is Windows.

### Does CyberFeeds work offline?
Yes. CyberFeeds stores all data locally and can read cached articles offline. Only feed fetching requires internet.

---

## Feeds

### What feed formats are supported?
- RSS 0.9x, 1.0, 2.0
- Atom 1.0
- XML feeds with automatic detection

### Can I subscribe to Reddit?
Yes. Enter `r/subreddit` or `u/username` in the Add Feed dialog. CyberFeeds uses a fallback chain (RSS → JSON API) for reliable Reddit integration.

### How do I import feeds from another reader?
1. Export an OPML file from your old reader
2. In CyberFeeds: Settings → Data → Import OPML
3. All feeds and folders are imported

### What is the Feed Doctor?
The Feed Doctor diagnoses feed issues like broken URLs, redirect problems, and SSL errors. Right-click a feed → Feed Doctor to run diagnostics.

### Can I organize feeds into folders?
Yes. Create folders via Add Folder, then drag feeds into them. Nested folders are supported.

---

## Articles

### How does full-content extraction work?
CyberFeeds fetches the article URL and extracts the main content using a worker thread. This provides clean, readable text even for feeds that only publish summaries.

### Can I star articles for later?
Yes. Click the star icon or press `S` to star an article. Starred articles are preserved and can be filtered.

### What happens to deleted articles?
Deleted articles go to trash and stay there for 30 days before auto-purge. You can restore them from trash within that period.

### How do I mark all articles as read?
Right-click a feed → Mark all read. Or use the Mark all read button in the toolbar.

### Can I search articles?
Yes. Press `Ctrl+F` to focus search. Search covers article titles, summaries, and full content.

---

## Notifications

### How do notifications work?
When new articles arrive, a custom notification window appears. You can click to open the article or dismiss the notification.

### Can I mute specific feeds?
Yes. Go to Settings → Notifications → Feed filters to mute specific feeds.

### What are keyword filters?
Keyword filters only notify you about articles containing specific words. Add keywords in Settings → Notifications.

### What is snooze?
Snooze temporarily suppresses all notifications for a set duration. Useful for meetings or focused work.

### Can notifications appear during fullscreen apps?
By default, notifications are suppressed during fullscreen applications (games, videos, presentations). You can configure this in settings.

---

## Customization

### What themes are available?
- Dark (default)
- Light
- Dracula
- Nord
- Hacker (green on black)
- Monokai
- Default

### Can I change the layout?
Yes. Choose from 3-panel, 2-panel, 1-panel, or horizontal-split layouts in Settings.

### Can I use a custom browser?
Yes. Set a custom browser path in Settings → General to open articles in your preferred browser.

### What reading preferences can I adjust?
- Font size
- Line height
- Maximum content width
- Reading theme (sepia, dark, light)

---

## Privacy

### Is my data stored in the cloud?
No. All data is stored locally in a SQLite database. No data is sent to external servers except for fetching feeds.

### What data is stored locally?
- Feed subscriptions
- Articles and reading state
- Settings and preferences
- Notification history

---

## Troubleshots

### Feeds are not updating
- Check your internet connection
- Verify the polling interval in Settings
- Try manual refresh (R)
- Run Feed Doctor on the feed

### Notifications don't appear
- Check if notifications are enabled in Settings
- Verify the feed is not muted
- Check if snooze is active
- Ensure the monitor settings are correct

### Articles are not extracting full content
- Enable auto-fetch full content in Settings
- Some websites block content extraction
- Try reader mode fallback

### App is slow with many feeds
- Increase the polling interval
- Enable cleanup of old articles
- Reduce the number of starred/feeds

### Hotkeys don't work
- Check for conflicts with other applications
- Verify hotkeys in Settings → Hotkeys
- Restart CyberFeeds after changing hotkeys

---

## Contributing

### How can I report a bug?
Open an issue on [GitHub Issues](https://github.com/CyberGems/CyberFeeds/issues) with:
- CyberFeeds version
- Windows version
- Steps to reproduce
- Expected vs actual behavior

### How can I contribute code?
1. Fork the repository
2. Create a feature branch
3. Submit a pull request
4. Describe your changes in the PR description

### How can I help with translations?
UI strings are in `src/shared/translations.ts`. Submit a PR with your translation.

### How can I donate?
See the [Donate section](https://github.com/CyberGems/CyberFeeds#-donate) on the main README.
