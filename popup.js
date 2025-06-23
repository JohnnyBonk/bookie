/**
 * Full Bookmark Folders - Chrome Extension
 * A powerful bookmark manager with advanced folder navigation and bulk operations
 * 
 * @author Your Name
 * @version 1.0.0
 */

// Constants
const CONSTANTS = {
  SEARCH_DEBOUNCE_MS: 300,
  TOOLTIP_POSITION_DELAY_MS: 10,
  TOOLTIP_BOUNDARY_OFFSET_PX: 8,
  INDENT_SPACES: 2,
  ROOT_FOLDER_IDS: ['0', '1', '2'],
  DEFAULT_PARENT_FOLDER_ID: '1'
};

document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements and check if they exist
  const elements = {
    titleInput: document.getElementById('title'),
    urlInput: document.getElementById('url'),
    folderTree: document.getElementById('folders'),
    saveButton: document.getElementById('save'),
    addFolderButton: document.getElementById('add-folder'),
    searchInput: document.getElementById('search'),
    searchToggle: document.getElementById('search-toggle'),
    themeToggle: document.getElementById('theme-icon'),
    exportButton: document.getElementById('export'),
    bulkSelectButton: document.getElementById('select-mode'),
    contextMenu: document.getElementById('context-menu'),
    exportModal: document.getElementById('export-modal'),
    exportConfirm: document.getElementById('export-confirm'),
    exportCancel: document.getElementById('export-cancel'),
    headerStats: document.getElementById('header-stats')
    // Removed non-existent elements
  };

  // Log available elements for debugging
  console.log('Elements found:', Object.keys(elements).filter(key => elements[key]));

  // Modified validation to continue even if some non-critical elements are missing
  const criticalElements = ['folderTree', 'saveButton', 'themeToggle']; // Most important elements
  for (const key of criticalElements) {
    if (!elements[key]) {
      console.error(`Critical element not found: ${key}`);
      return; // Only exit for critical elements
    }
  }

  // For non-critical elements, just log warnings
  for (const [key, element] of Object.entries(elements)) {
    if (!element && !criticalElements.includes(key)) {
      console.warn(`Non-critical element not found: ${key}`);
    }
  }
  
  // Add tooltips for action buttons
  if (elements.saveButton) elements.saveButton.title = 'Save bookmark';
  if (elements.addFolderButton) elements.addFolderButton.title = 'Create folder';
  if (elements.exportButton) elements.exportButton.title = 'Export bookmarks';
  if (elements.bulkSelectButton) elements.bulkSelectButton.title = 'Toggle bulk selection mode';
  if (elements.themeToggle) elements.themeToggle.title = 'Toggle dark/light theme';

  // Initialize variables
  let selectedFolderId = CONSTANTS.DEFAULT_PARENT_FOLDER_ID;
  let isInBulkMode = false;
  let selectedItems = new Set();

  // Initialize theme
  const { theme, popupHeight, scrollPosition } = await chrome.storage.local.get(['theme', 'popupHeight', 'scrollPosition']);
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    elements.themeToggle.textContent = 'light_mode';
  }

  // Theme toggle
  elements.themeToggle.addEventListener('click', async () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      elements.themeToggle.textContent = 'dark_mode';
      await chrome.storage.local.set({ theme: 'light' });
    } else {
      document.body.setAttribute('data-theme', 'dark');
      elements.themeToggle.textContent = 'light_mode';
      await chrome.storage.local.set({ theme: 'dark' });
    }
  });

  // Search toggle functionality
  if (elements.searchToggle && elements.searchInput) {
    elements.searchToggle.addEventListener('click', () => {
      elements.searchInput.classList.toggle('expanded');
      if (elements.searchInput.classList.contains('expanded')) {
        elements.searchInput.focus();
      }
    });
  }

  // Search functionality
  let searchTimeout;
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const searchTerm = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.folder, .bookmark');

        items.forEach(item => {
          const nameElement = item.querySelector('.folder-name span:last-child, .bookmark-name span:last-child');
          if (nameElement) {
            const itemName = nameElement.textContent.toLowerCase();
            if (searchTerm === '' || itemName.includes(searchTerm)) {
              item.style.display = '';
              // Show parent folders of matching items
              let parent = item.parentElement;
              while (parent && parent.classList.contains('folder-content')) {
                parent.parentElement.classList.add('expanded');
                parent = parent.parentElement.parentElement;
              }
            } else {
              item.style.display = 'none';
            }
          }
        });
      }, 300);
    });
  }

  // Restore popup height and scroll position
  if (popupHeight) {
    document.documentElement.style.setProperty('--popup-height', `${popupHeight}px`);
  }

  // Get current tab info and set the title and URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (elements.titleInput && elements.urlInput) {
    elements.titleInput.value = tab.title;
    elements.urlInput.value = tab.url;
  }

  /**
   * Creates a bookmark DOM element with interactive features
   * @param {Object} bookmark - Chrome bookmark object
   * @param {string} bookmark.id - Unique bookmark identifier
   * @param {string} bookmark.title - Bookmark title
   * @param {string} bookmark.url - Bookmark URL
   * @returns {HTMLElement} Bookmark div element
   */
  function createBookmarkElement(bookmark) {
    const bookmarkDiv = document.createElement('div');
    bookmarkDiv.className = 'bookmark';
    bookmarkDiv.dataset.bookmarkId = bookmark.id;
    bookmarkDiv.draggable = true;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'bookmark-name';

    const linkIcon = document.createElement('span');
    linkIcon.className = 'material-icons';
    linkIcon.textContent = 'link';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = bookmark.title || 'Untitled';
    titleSpan.title = bookmark.url || '';

    nameDiv.appendChild(linkIcon);
    nameDiv.appendChild(titleSpan);

    // Handle bookmark click
    nameDiv.addEventListener('click', () => {
      chrome.tabs.create({ url: bookmark.url });
    });

    // Context menu
    nameDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (elements.contextMenu) {
        // Use CSS variables instead of inline styles
        document.documentElement.style.setProperty('--context-menu-top', `${e.clientY}px`);
        document.documentElement.style.setProperty('--context-menu-left', `${e.clientX}px`);
        elements.contextMenu.classList.add('visible');
        elements.contextMenu.dataset.targetId = bookmark.id;
      }
    });

    bookmarkDiv.appendChild(nameDiv);
    return bookmarkDiv;
  }

  /**
   * Handles folder selection and updates UI state
   * @param {string} folderId - ID of the selected folder
   * @param {string[]} pathArray - Array representing the folder path
   */
  function selectFolder(folderId, pathArray) {
    selectedFolderId = folderId;
    console.log(`Selected folder: ${folderId}, Path: ${pathArray.join('/')}`);
    // Update status or enable save button if needed
    if (elements.saveButton) {
      elements.saveButton.disabled = false; // Example: Enable save button
    }
    // You might want to update a status bar element here if you re-add one
  }

  /**
   * Creates a folder DOM element with expand/collapse functionality
   * @param {Object} folder - Chrome bookmark folder object
   * @param {Object} expandedFolders - Map of folder IDs to expanded state
   * @param {number} depth - Nesting depth for styling
   * @param {string[]} parentPath - Path to parent folder
   * @returns {HTMLElement} Folder div element with children
   */
  function createFolderElement(folder, expandedFolders, depth = 1, parentPath = []) {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';
    folderDiv.dataset.folderId = folder.id;
    folderDiv.dataset.depth = depth;
    const fullPath = [...parentPath, folder.title];
    folderDiv.draggable = true;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'folder-name';

    // Add folder icons
    const arrowIcon = document.createElement('span');
    arrowIcon.className = 'material-icons arrow';
    arrowIcon.textContent = 'chevron_right';

    const folderIcon = document.createElement('span');
    folderIcon.className = 'material-icons';
    folderIcon.textContent = 'folder';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = folder.title;

    // Tooltip for folder counts
    const tooltip = document.createElement('div');
    tooltip.className = 'folder-tooltip';
    nameDiv.appendChild(tooltip);

    nameDiv.addEventListener('mouseenter', async () => {
      // Count folders and bookmarks inside
      let folderCount = 0;
      let bookmarkCount = 0;
      async function countItems(folderObj) {
        for (const child of folderObj.children || []) {
          if (child.isBookmark) bookmarkCount++;
          else {
            folderCount++;
            await countItems(child);
          }
        }
      }
      await countItems(folder);
      tooltip.textContent = `${folderCount} folder${folderCount!==1?'s':''}, ${bookmarkCount} bookmark${bookmarkCount!==1?'s':''}`;
      tooltip.classList.add('visible');

      // Wait for DOM update - Use class-based positioning instead of inline styles
      setTimeout(() => {
        const rect = tooltip.getBoundingClientRect();
        const popupRect = document.body.getBoundingClientRect();

        // Reset all positioning classes
        tooltip.classList.remove('tooltip-position-left', 'tooltip-position-bottom', 'tooltip-position-top');

        // If tooltip goes off right, flip to left
        if (rect.right > popupRect.right - 8) {
          tooltip.classList.add('tooltip-position-left');
        }

        // If tooltip goes off bottom, move up
        if (rect.bottom > popupRect.bottom - 8) {
          tooltip.classList.add('tooltip-position-bottom');
        }

        // If tooltip goes off top, move down
        if (rect.top < popupRect.top + 8) {
          tooltip.classList.add('tooltip-position-top');
        }
      }, 10);
      // End of re-enabled block
    });
    nameDiv.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
      tooltip.classList.remove('tooltip-position-left', 'tooltip-position-bottom', 'tooltip-position-top');
    });

    nameDiv.appendChild(arrowIcon);
    nameDiv.appendChild(folderIcon);
    nameDiv.appendChild(titleSpan);

    // Handle folder selection and expansion
    nameDiv.addEventListener('click', async (e) => {
      if (isInBulkMode) {
        folderDiv.classList.toggle('selected');
        if (folderDiv.classList.contains('selected')) {
          selectedItems.add(folder.id);
        } else {
          selectedItems.delete(folder.id);
        }
        return;
      }

      // Remove previous selection
      const prevSelected = elements.folderTree.querySelector('.folder-name.selected');
      if (prevSelected) {
        prevSelected.classList.remove('selected');
      }

      // Select this folder
      nameDiv.classList.add('selected');
      selectFolder(folder.id, fullPath);

      // Toggle folder expansion
      folderDiv.classList.toggle('expanded');

      // Store expanded state
      const { expandedFolders = {} } = await chrome.storage.local.get('expandedFolders');
      expandedFolders[folder.id] = folderDiv.classList.contains('expanded');
      await chrome.storage.local.set({ expandedFolders });

      e.stopPropagation();
    });

    // Context menu
    nameDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (elements.contextMenu) {
        // Use CSS variables instead of inline styles
        document.documentElement.style.setProperty('--context-menu-top', `${e.clientY}px`);
        document.documentElement.style.setProperty('--context-menu-left', `${e.clientX}px`);
        elements.contextMenu.classList.add('visible');
        elements.contextMenu.dataset.targetId = folder.id;
      }
    });

    // Drag and drop functionality
    folderDiv.addEventListener('dragstart', (e) => {
      if (ROOT_FOLDER_IDS.includes(folder.id)) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', folder.id);
      folderDiv.classList.add('dragging');
    });

    folderDiv.addEventListener('dragend', () => {
      folderDiv.classList.remove('dragging');
      document.querySelectorAll('.folder-name').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    nameDiv.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (ROOT_FOLDER_IDS.includes(folder.id)) return;
      nameDiv.classList.add('drag-over');
    });

    nameDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (ROOT_FOLDER_IDS.includes(folder.id)) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      e.dataTransfer.dropEffect = 'move';
    });

    nameDiv.addEventListener('dragleave', () => {
      nameDiv.classList.remove('drag-over');
    });

    nameDiv.addEventListener('drop', async (e) => {
      e.preventDefault();
      nameDiv.classList.remove('drag-over');

      const sourceId = e.dataTransfer.getData('text/plain');
      const targetId = folder.id;

      if (!sourceId || sourceId === targetId || ROOT_FOLDER_IDS.includes(targetId)) return;

      try {
        await chrome.bookmarks.move(sourceId, { parentId: targetId });
        await refreshFolderTree();
      } catch (error) {
        console.error('Error moving folder:', error);
      }
    });

    folderDiv.appendChild(nameDiv);

    // Create container for child items
    if (folder.children && folder.children.length > 0) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'folder-content';

      folder.children.forEach(item => {
        try {
          // Determine if the item is a bookmark based on the presence of a URL
          const isBookmark = item.isBookmark !== undefined ? item.isBookmark : !!item.url;

          const childElement = isBookmark ?
            createBookmarkElement(item) :
            createFolderElement(item, expandedFolders, depth + 1, fullPath);

          contentDiv.appendChild(childElement);
        } catch (error) {
          console.error('Error creating child element:', error, item);
        }
      });

      folderDiv.appendChild(contentDiv);
    }

    // Set initial expanded state
    if (expandedFolders[folder.id]) {
      folderDiv.classList.add('expanded');
    }

    return folderDiv;
  }

  // Context menu functionality
  document.addEventListener('click', () => {
    if (elements.contextMenu) {
      elements.contextMenu.classList.remove('visible');
    }
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (!elements.contextMenu) return;
      
      const action = e.currentTarget.dataset.action;
      const targetId = elements.contextMenu.dataset.targetId;

      switch (action) {
        case 'open':
          const bookmark = await chrome.bookmarks.get(targetId);
          if (bookmark[0].url) {
            chrome.tabs.create({ url: bookmark[0].url });
          }
          break;
        case 'rename':
          const newName = prompt('Enter new name:');
          if (newName) {
            await chrome.bookmarks.update(targetId, { title: newName });
            await refreshFolderTree();
          }
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this?')) {
            await chrome.bookmarks.removeTree(targetId);
            await refreshFolderTree();
          }
          break;
        case 'export':
          if (elements.exportModal) {
            elements.exportModal.classList.add('visible');
            elements.exportModal.dataset.targetId = targetId;
          }
          break;
      }
    });
  });

  // Export functionality
  if (elements.exportButton) {
    elements.exportButton.addEventListener('click', () => {
      if (elements.exportModal) {
        elements.exportModal.classList.add('visible');
      }
    });
  }

  if (elements.exportCancel) {
    elements.exportCancel.addEventListener('click', () => {
      if (elements.exportModal) {
        elements.exportModal.classList.remove('visible');
      }
    });
  }

  if (elements.exportConfirm) {
    elements.exportConfirm.addEventListener('click', async () => {
      const format = document.querySelector('input[name="format"]:checked').value;
      const folderId = elements.exportModal ? (elements.exportModal.dataset.targetId || '0') : '0';

      try {
        const bookmarks = await getAllBookmarks(folderId);
        let content = '';

        switch (format) {
          case 'html':
            content = generateHtmlExport(bookmarks);
            break;
          case 'json':
            content = JSON.stringify(bookmarks, null, 2);
            break;
          case 'csv':
            content = generateCsvExport(bookmarks);
            break;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks.${format}`;
        a.click();
        URL.revokeObjectURL(url);

        if (elements.exportModal) {
          elements.exportModal.classList.remove('visible');
        }
      } catch (error) {
        console.error('Error exporting bookmarks:', error);
      }
    });
  }

  // Bulk selection mode
  if (elements.bulkSelectButton) {
    elements.bulkSelectButton.addEventListener('click', () => {
      isInBulkMode = !isInBulkMode;
      document.querySelectorAll('.folder, .bookmark').forEach(item => {
        item.classList.toggle('selectable', isInBulkMode);
      });
      elements.bulkSelectButton.classList.toggle('active', isInBulkMode);
      selectedItems.clear();
    });
  }

  /**
   * Retrieves all bookmarks from a specific folder
   * @param {string} folderId - ID of the folder to retrieve
   * @returns {Promise<Object>} Bookmark tree structure
   */
  async function getAllBookmarks(folderId) {
    const bookmarks = await chrome.bookmarks.getSubTree(folderId);
    return bookmarks[0];
  }

  /**
   * Generates HTML export in Netscape bookmark format
   * @param {Object} bookmarks - Bookmark tree to export
   * @returns {string} HTML formatted bookmark file content
   */
  function generateHtmlExport(bookmarks) {
    let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
    html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
    html += '<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';

    function processNode(node, level = 1) {
      const indent = '  '.repeat(level);
      if (node.url) {
        html += `${indent}<DT><A HREF="${node.url}">${node.title}</A>\n`;
      } else {
        html += `${indent}<DT><H3>${node.title}</H3>\n${indent}<DL><p>\n`;
        node.children?.forEach(child => processNode(child, level + 1));
        html += `${indent}</DL><p>\n`;
      }
    }

    processNode(bookmarks);
    html += '</DL><p>';
    return html;
  }

  /**
   * Generates CSV export of bookmarks
   * @param {Object} bookmarks - Bookmark tree to export
   * @returns {string} CSV formatted bookmark data
   */
  function generateCsvExport(bookmarks) {
    let csv = 'Title,URL,Folder\n';

    function processNode(node, path = '') {
      if (node.url) {
        csv += `"${node.title}","${node.url}","${path}"\n`;
      } else {
        const newPath = path ? `${path}/${node.title}` : node.title;
        node.children?.forEach(child => processNode(child, newPath));
      }
    }

    processNode(bookmarks);
    return csv;
  }

  /**
   * Updates the header statistics with total folder and bookmark counts
   * @returns {Promise<void>}
   */
  async function updateFolderStats() {
    try {
      const stats = { folders: 0, bookmarks: 0 };
      async function countItems(folderId) {
        const items = await chrome.bookmarks.getChildren(folderId);
        for (const item of items) {
          if (item.url) {
            stats.bookmarks++;
          } else {
            stats.folders++;
            await countItems(item.id);
          }
        }
      }
      await countItems('0');
      if (elements.headerStats) {
        // Use a standard hyphen instead of the bullet character to avoid encoding issues
        elements.headerStats.textContent = `${stats.folders} folder${stats.folders!==1?'s':''} - ${stats.bookmarks} bookmark${stats.bookmarks!==1?'s':''}`;
      }
    } catch (error) {
      console.error('Error updating folder stats:', error);
    }
  }

  /**
   * Refreshes the entire folder tree display
   * Fetches bookmarks from Chrome API and rebuilds the UI
   * @returns {Promise<void>}
   */
  async function refreshFolderTree() {
    try {
      console.log('Refreshing folder tree...');
      // Fetch the direct children of the root node ('0')
      const topLevelFolders = await chrome.bookmarks.getChildren('0');
      console.log('Top level folders:', topLevelFolders);
      const { expandedFolders = {} } = await chrome.storage.local.get('expandedFolders');

      elements.folderTree.innerHTML = ''; // Clear existing tree

      // Iterate through the top-level items (usually Bookmarks Bar, Other Bookmarks, etc.)
      for (const topLevelItem of topLevelFolders) {
        // We only want to display folders at the top level
        if (!topLevelItem.url) {
          try {
            // Fetch the full subtree for this top-level folder to pass to createFolderElement
            const folderSubTree = await chrome.bookmarks.getSubTree(topLevelItem.id);
            console.log(`Subtree for ${topLevelItem.title}:`, folderSubTree);

            if (folderSubTree && folderSubTree.length > 0) {
              // Process the folder's children to mark bookmarks vs folders
              const processedFolder = folderSubTree[0];
              if (processedFolder.children) {
                processedFolder.children = processedFolder.children.map(child => {
                  return {
                    ...child,
                    isBookmark: !!child.url
                  };
                });
              }

              // Pass the processed folder object to createFolderElement
              const element = createFolderElement(processedFolder, expandedFolders);
              elements.folderTree.appendChild(element);
            }
          } catch (error) {
            console.error(`Error processing folder ${topLevelItem.id}:`, error);
          }
        }
        // We generally don't display bookmarks directly under the root '0'
      }

      await updateFolderStats();
    } catch (error) {
      console.error("Error refreshing folder tree:", error);
      if (elements.folderTree) {
        elements.folderTree.innerHTML = 'Error loading bookmarks.'; // Display error to user
      }
    }
  }

  // Add new folder
  if (elements.addFolderButton) {
    elements.addFolderButton.addEventListener('click', async () => {
    if (!selectedFolderId) {
      console.error('No parent folder selected');
      return;
    }

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      await chrome.bookmarks.create({
        parentId: selectedFolderId,
        title: folderName
      });
      await refreshFolderTree();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
    });
  }

  // Initialize the folder tree and restore states
  try {
    await refreshFolderTree();

    // If no stored states, expand first level by default
    const { expandedFolders = {} } = await chrome.storage.local.get('expandedFolders');
    if (Object.keys(expandedFolders).length === 0) {
      const firstLevelFolders = elements.folderTree.querySelectorAll(':scope > .folder');
      firstLevelFolders.forEach(folder => {
        folder.classList.add('expanded');
        expandedFolders[folder.dataset.folderId] = true;
      });
      await chrome.storage.local.set({ expandedFolders });
    }

      // Restore scroll position after folder tree is initialized
      if (scrollPosition && elements.folderTree) {
        elements.folderTree.scrollTop = scrollPosition;
      }

      // Save scroll position when user scrolls
      if (elements.folderTree) {
        elements.folderTree.addEventListener('scroll', async () => {
          await chrome.storage.local.set({
            scrollPosition: elements.folderTree.scrollTop
          });
        });
      }

  } catch (error) {
    console.error('Error initializing folder tree:', error);
  }

  // Save bookmark
  elements.saveButton.addEventListener('click', async () => {
    if (!selectedFolderId) {
      console.error('No folder selected');
      return;
    }

    try {
      await chrome.bookmarks.create({
        parentId: selectedFolderId,
        title: elements.titleInput.value,
        url: elements.urlInput.value
      });
      window.close();
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  });
});
