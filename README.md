# Bookie

A nice little lightweight Chrome extension to help you manage your bookmarks with easy folder navigation and search.

## Features

- **Full Folder Tree View**: Navigate your entire bookmark hierarchy in a clean, expandable tree interface
- **Quick Search**: Instantly find bookmarks and folders with real-time search
- **Bulk Operations**: Select multiple bookmarks for batch actions
- **Dark/Light Theme**: Toggle between dark and light modes for comfortable viewing
- **Export Options**: Export bookmarks in multiple formats (HTML, JSON, CSV)
- **Folder Management**: Create, rename, and delete folders with ease
- **Move Bookmarks**: Drag and drop or use the move function to organize bookmarks
- **Context Menu**: Right-click options for quick actions
- **Material Design**: Clean, modern interface following Material Design principles

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Download or clone this repository
   ```bash
   git clone https://github.com/JohnnyBonk/bookie.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

5. The Bookie icon will appear in your Chrome toolbar

## Usage

### Basic Operations

- **Add Bookmark**: Enter title and URL, then click "Save Bookmark"
- **Create Folder**: Click "Add Folder" and enter a name
- **Search**: Use the search bar to find bookmarks or folders instantly
- **Toggle Theme**: Click the moon/sun icon to switch between dark and light modes

### Advanced Features

#### Bulk Selection
1. Click "Select" to enter selection mode
2. Check multiple bookmarks
3. Choose an action (Move, Delete, Export selected)

#### Export Bookmarks
1. Click "Export" button
2. Choose format:
   - **HTML**: Standard bookmarks file compatible with all browsers
   - **JSON**: Structured data format for developers
   - **CSV**: Spreadsheet-compatible format

#### Folder Navigation
- Click folder names to expand/collapse
- Use breadcrumb navigation to jump between levels
- Right-click folders for context menu options

### Keyboard Shortcuts

- `Ctrl/Cmd + F`: Focus search bar
- `Escape`: Clear search or exit selection mode
- `Delete`: Remove selected bookmarks (when in selection mode)

## Permissions

This extension requires the following permissions:
- **bookmarks**: To read and manage your bookmarks
- **activeTab**: To capture current tab's title and URL
- **storage**: To save theme preferences

## Privacy

Bookie operates entirely locally. No data is sent to external servers. Your bookmarks remain private and secure within your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/JohnnyBonk/bookie/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Material Icons by Google
- Chrome Extensions documentation and examples