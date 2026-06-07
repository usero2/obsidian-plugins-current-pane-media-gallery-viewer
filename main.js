const obsidian = require("obsidian");

const VIEW_TYPE_MEDIA_VIEWER = "current-pane-media-gallery-viewer-view";

const DEFAULT_SETTINGS = {
    autoPlayVideo: true,
    maxImageHeight: 0,
    enableOverflow: true,
    layoutStyle: 'vertical-1'
}

class MediaViewerView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentlyHighlightedItem = null;
    }

    getViewType() {
        return VIEW_TYPE_MEDIA_VIEWER;
    }

    getDisplayText() {
        return "Media Gallery";
    }

    getIcon() {
        return "image-file";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        // Ensure the parent view-content constrains the height correctly for our scroll container
        container.style.padding = "0";
        container.style.overflow = "hidden";
        container.style.position = "relative"; // Context for absolute positioning

        const content = container.createEl("div", {
            cls: "media-gallery-content"
        });
        this.mediaContainer = content;

        // Translate vertical wheel scroll to horizontal scroll when in horizontal layout modes
        this.mediaContainer.addEventListener('wheel', (evt) => {
            if ((this.plugin.settings.layoutStyle === 'horizontal-1' || this.plugin.settings.layoutStyle === 'horizontal-2') && evt.deltaY !== 0) {
                evt.preventDefault();
                this.mediaContainer.scrollLeft += evt.deltaY;
            }
        });

        const placeholder = content.createEl("div", {
            text: "No media found in the current file.",
            attr: { style: "color: var(--text-muted); text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1;" }
        });
        this.placeholder = placeholder;
    }

    async onClose() {
        // Nothing to clean up
    }

    setMediaList(mediaItems) {
        this.mediaContainer.empty();
        this.currentMediaItems = mediaItems;
        this.currentlyHighlightedItem = null;

        if (!mediaItems || mediaItems.length === 0) {
            this.mediaContainer.setAttr('style', `position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; padding: 10px; background-color: var(--background-secondary); align-items: center; justify-content: center;`);
            this.mediaContainer.appendChild(this.placeholder);
            return;
        }

        const overflowStyle = this.plugin.settings.enableOverflow ? 'auto' : 'hidden';
        let containerStyle = `position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 10px; background-color: var(--background-secondary); `;
        let wrapperStyle = `display: flex; justify-content: center; align-items: center; background-color: var(--background-primary); border-radius: 8px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); box-sizing: border-box; transition: all 0.3s ease; cursor: pointer; `;
        let imgStyle = `border-radius: 4px; `;

        const maxHeightSetting = this.plugin.settings.maxImageHeight > 0 ? this.plugin.settings.maxImageHeight + "px" : "none";

        switch (this.plugin.settings.layoutStyle) {
            case 'masonry':
                containerStyle += `display: flex; flex-direction: row; gap: 10px; overflow-y: ${overflowStyle}; overflow-x: hidden; align-items: flex-start;`;
                wrapperStyle += `width: 100%; box-sizing: border-box;`;
                imgStyle += `width: 100%; max-height: ${maxHeightSetting}; object-fit: contain;`;
                break;
            case 'vertical-2':
                containerStyle += `display: grid; grid-template-columns: 1fr 1fr; gap: 10px; overflow-y: ${overflowStyle}; overflow-x: hidden; align-items: start; align-content: start;`;
                wrapperStyle += `width: 100%;`;
                imgStyle += `max-width: 100%; max-height: ${maxHeightSetting}; object-fit: contain;`;
                break;
            case 'horizontal-1':
                containerStyle += `display: flex; flex-direction: row; gap: 10px; overflow-x: ${overflowStyle}; overflow-y: hidden; align-items: center;`;
                wrapperStyle += `height: 100%; flex-shrink: 0;`;
                imgStyle += `height: 100%; max-height: 100%; width: auto; max-width: none; object-fit: contain;`;
                break;
            case 'horizontal-2':
                containerStyle += `display: grid; grid-template-rows: 1fr 1fr; grid-auto-flow: column; gap: 10px; overflow-x: ${overflowStyle}; overflow-y: hidden; align-items: center; justify-items: center; padding-bottom: 10px;`;
                wrapperStyle += `height: 100%; width: auto;`;
                imgStyle += `height: 100%; max-height: 100%; width: auto; max-width: none; object-fit: contain;`;
                break;
            case 'fit-all':
                containerStyle += `display: flex; flex-wrap: wrap; gap: 5px; overflow: hidden; align-content: center; justify-content: center;`;
                const count = mediaItems.length;
                let flexBasis = "100%";
                let maxHeightFit = "100%";
                if (count > 1 && count <= 2) { flexBasis = "45%"; maxHeightFit = "100%"; }
                else if (count > 2 && count <= 4) { flexBasis = "45%"; maxHeightFit = "45%"; }
                else if (count > 4 && count <= 6) { flexBasis = "30%"; maxHeightFit = "45%"; }
                else if (count > 6 && count <= 9) { flexBasis = "30%"; maxHeightFit = "30%"; }
                else if (count > 9) { flexBasis = "20%"; maxHeightFit = "20%"; }
                
                wrapperStyle += `flex: 1 1 ${flexBasis}; max-width: ${flexBasis}; height: ${maxHeightFit}; min-width: 0; min-height: 0; padding: 4px;`;
                imgStyle += `width: 100%; height: 100%; object-fit: contain;`;
                break;
            case 'vertical-1':
            default:
                containerStyle += `display: flex; flex-direction: column; gap: 10px; overflow-y: ${overflowStyle}; overflow-x: hidden; align-items: center;`;
                wrapperStyle += `width: 100%; flex-shrink: 0;`;
                imgStyle += `max-width: 100%; max-height: ${maxHeightSetting}; object-fit: contain;`;
                break;
        }

        this.mediaContainer.setAttr('style', containerStyle);

        let col1, col2;
        if (this.plugin.settings.layoutStyle === 'masonry') {
            col1 = this.mediaContainer.createEl('div', { attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0;' } });
            col2 = this.mediaContainer.createEl('div', { attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0;' } });
        }

        let itemIndex = 0;
        for (const item of mediaItems) {
            let targetContainer = this.mediaContainer;
            if (this.plugin.settings.layoutStyle === 'masonry') {
                targetContainer = itemIndex % 2 === 0 ? col1 : col2;
            }

            const wrapper = targetContainer.createEl("div", {
                attr: { style: wrapperStyle }
            });
            item.wrapperEl = wrapper;
            itemIndex++;

            let lastSyncTime = 0;
            const syncToDocument = () => {
                const now = Date.now();
                if (now - lastSyncTime < 300) return;
                lastSyncTime = now;

                if (!item.offsets || item.offsets.length === 0) return;
                
                let idx = parseInt(wrapper.dataset.occurrenceIndex || "0");
                const currentOffset = item.offsets[idx];
                
                idx = (idx + 1) % item.offsets.length;
                wrapper.dataset.occurrenceIndex = idx.toString();
                
                // Highlight the item in the gallery immediately
                this.highlightMediaForOffset(currentOffset);

                let targetView = null;
                const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
                for (const leaf of leaves) {
                    if (leaf.view && leaf.view.file && leaf.view.file.path === this.plugin.currentDisplayedFile?.path) {
                        targetView = leaf.view;
                        break;
                    }
                }
                if (!targetView) {
                    targetView = this.plugin.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
                }

                if (targetView) {
                    this.plugin.app.workspace.setActiveLeaf(targetView.leaf, { focus: true });
                    
                    // Add slight delay to allow Obsidian workspace layout and focus to settle
                    setTimeout(() => {
                        if (targetView.getMode() === "source" && targetView.editor) {
                            targetView.editor.focus();
                            const pos = targetView.editor.offsetToPos(currentOffset);
                            targetView.editor.setCursor(pos);
                            targetView.editor.scrollIntoView({from: pos, to: pos}, true);
                        } else if (targetView.getMode() === "preview") {
                            let line = 0;
                            if (this.plugin.lastContent) {
                                for (let i = 0; i < currentOffset && i < this.plugin.lastContent.length; i++) {
                                    if (this.plugin.lastContent[i] === '\n') line++;
                                }
                            }
                            
                            try {
                                if (targetView.currentMode && targetView.currentMode.applyScroll) {
                                    targetView.currentMode.applyScroll(line);
                                } else if (targetView.setEphemeralState) {
                                    targetView.setEphemeralState({ line: line, scroll: line });
                                }
                            } catch (e) {}

                            // Wait for Obsidian to render the target block into the DOM (Lazy rendering)
                            setTimeout(() => {
                                const container = targetView.contentEl;
                                if (!container) return;
                                
                                const mediaEls = container.querySelectorAll('.internal-embed, img, video');
                                
                                const safeDecode = (str) => {
                                    if (!str) return "";
                                    try { return decodeURIComponent(str); } catch(e) { return str; }
                                };
                                
                                const getFilename = (str) => {
                                    if (!str) return "";
                                    const clean = safeDecode(str.split('?')[0]);
                                    return clean.split('/').pop().split('\\').pop();
                                };

                                for (let i = 0; i < mediaEls.length; i++) {
                                    const el = mediaEls[i];
                                    const itemFilename = getFilename(item.resourcePath) || getFilename(item.src);
                                    let foundEl = null;
                                    
                                    if (el.classList.contains('internal-embed')) {
                                        const embedSrc = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('alt');
                                        if (embedSrc) {
                                            const embedFilename = getFilename(embedSrc);
                                            if (itemFilename === embedFilename) {
                                                foundEl = el.querySelector('img, video') || el;
                                            }
                                        }
                                    } else if (item.type === 'image' && el.tagName === 'IMG') {
                                        const elFilename = getFilename(el.src) || getFilename(el.getAttribute('src'));
                                        if (elFilename === itemFilename) {
                                            foundEl = el;
                                        }
                                    } else if (item.type === 'video' && el.tagName === 'VIDEO') {
                                        const sourceEl = el.querySelector('source');
                                        const sourceFilename = sourceEl ? getFilename(sourceEl.src) : '';
                                        const elFilename = getFilename(el.src) || getFilename(el.getAttribute('src'));
                                        
                                        if (elFilename === itemFilename || sourceFilename === itemFilename) {
                                            foundEl = el;
                                        }
                                    }
                                    
                                    if (foundEl) {
                                        foundEl.classList.remove('media-gallery-reading-highlight');
                                        // Force reflow to restart CSS animation if already highlighted
                                        void foundEl.offsetWidth;
                                        
                                        foundEl.classList.add('media-gallery-reading-highlight');
                                        
                                        if (foundEl.highlightTimeout) {
                                            clearTimeout(foundEl.highlightTimeout);
                                        }
                                        
                                        foundEl.highlightTimeout = setTimeout(() => {
                                            foundEl.classList.remove('media-gallery-reading-highlight');
                                        }, 1500);
                                    }
                                }
                            }, 200);
                        }
                    }, 50);
                }
            };

            // Use mousedown in capture phase to intercept clicks BEFORE video controls swallow them
            wrapper.addEventListener('mousedown', (e) => {
                syncToDocument();
            }, true);

            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                syncToDocument();
            });

            wrapper.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (item.type === 'image') {
                    this.showZoomModal(item.resourcePath);
                }
            });

            wrapper.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                syncToDocument();
                
                if (!item.file) return; // Only show context menu for local files
                
                const menu = new obsidian.Menu();
                
                menu.addItem((menuItem) => {
                    menuItem.setTitle("Copy image to clipboard")
                        .setIcon("copy")
                        .onClick(() => {
                            try {
                                const { clipboard, nativeImage } = require('electron');
                                const fullPath = this.plugin.app.vault.adapter.getBasePath() + '/' + item.file.path;
                                const image = nativeImage.createFromPath(fullPath);
                                clipboard.writeImage(image);
                                new obsidian.Notice("Image copied to clipboard");
                            } catch (err) {
                                new obsidian.Notice("Failed to copy image to clipboard");
                                console.error(err);
                            }
                        });
                });
                
                menu.addItem((menuItem) => {
                    menuItem.setTitle("Open in system explorer")
                        .setIcon("folder")
                        .onClick(() => {
                            this.plugin.app.showInFolder(item.file.path);
                        });
                });
                
                menu.addSeparator();
                
                menu.addItem((menuItem) => {
                    menuItem.setTitle("Delete image")
                        .setIcon("trash")
                        .onClick(async () => {
                            try {
                                const activeFile = this.plugin.currentDisplayedFile;
                                if (activeFile) {
                                    let content = await this.plugin.app.vault.read(activeFile);
                                    if (item.matches) {
                                        for (const matchText of item.matches) {
                                            content = content.split(matchText).join("");
                                        }
                                        await this.plugin.app.vault.modify(activeFile, content);
                                    }
                                }
                                await this.plugin.app.vault.trash(item.file, true);
                                new obsidian.Notice("Image deleted");
                            } catch (err) {
                                new obsidian.Notice("Failed to delete image");
                                console.error(err);
                            }
                        });
                });
                
                menu.showAtMouseEvent(e);
            });

            let mediaEl;
            if (item.type === "image") {
                mediaEl = wrapper.createEl("img");
                mediaEl.src = item.resourcePath;
                mediaEl.title = item.src;
            } else if (item.type === "video") {
                mediaEl = wrapper.createEl("video");
                mediaEl.src = item.resourcePath;
                mediaEl.controls = true;
                mediaEl.autoplay = this.plugin.settings.autoPlayVideo;
                mediaEl.loop = true;
                mediaEl.title = item.src;
                
                // Videos with native controls swallow regular clicks, so we listen to interactions directly.
                mediaEl.addEventListener('play', syncToDocument);
                mediaEl.addEventListener('pause', syncToDocument);
                mediaEl.addEventListener('seeked', syncToDocument);
                mediaEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    syncToDocument();
                });
            }

            if (mediaEl) {
                mediaEl.setAttr('style', imgStyle);
            }
        }
    }

    highlightMediaForOffset(offset) {
        if (!this.currentMediaItems || this.currentMediaItems.length === 0) return;

        let closestItem = null;
        let minDistance = Infinity;

        for (const item of this.currentMediaItems) {
            for (const itemOffset of item.offsets) {
                const distance = offset - itemOffset;
                if (distance >= 0 && distance < minDistance) {
                    minDistance = distance;
                    closestItem = item;
                }
            }
        }

        if (!closestItem) {
            closestItem = this.currentMediaItems[0];
        }

        if (this.currentlyHighlightedItem === closestItem) {
            return;
        }

        for (const item of this.currentMediaItems) {
            if (item.wrapperEl) {
                item.wrapperEl.style.backgroundColor = "var(--background-primary)";
                item.wrapperEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }
        }

        this.currentlyHighlightedItem = closestItem;

        if (closestItem && closestItem.wrapperEl) {
            closestItem.wrapperEl.style.backgroundColor = "var(--background-modifier-active)";
            closestItem.wrapperEl.style.boxShadow = "0 0 0 2px var(--interactive-accent)";
            
            closestItem.wrapperEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
    }

    showZoomModal(imageSrc) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.cursor = 'zoom-out';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease-in-out';

        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.maxWidth = '90vw';
        img.style.maxHeight = '90vh';
        img.style.objectFit = 'contain';
        img.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        img.style.transform = 'scale(0.95)';
        img.style.transition = 'transform 0.2s ease-out';
        img.style.borderRadius = '8px';

        overlay.appendChild(img);
        document.body.appendChild(overlay);

        // Force reflow and animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            img.style.transform = 'scale(1)';
        });

        const closeOverlay = () => {
            overlay.style.opacity = '0';
            img.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 200);
            document.removeEventListener('keydown', escListener);
        };

        overlay.addEventListener('click', closeOverlay);
        
        const escListener = (e) => {
            if (e.key === 'Escape') {
                closeOverlay();
            }
        };
        document.addEventListener('keydown', escListener);
    }
}

class CurrentPaneMediaViewerPlugin extends obsidian.Plugin {
    async onload() {
        this.lastContent = null;
        this.currentDisplayedFile = null;
        
        if (!document.getElementById('current-pane-media-gallery-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'current-pane-media-gallery-styles';
            styleEl.textContent = `
                .media-gallery-reading-highlight {
                    outline: 3px solid var(--interactive-accent) !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 10px var(--interactive-accent) !important;
                    transition: all 0.3s ease !important;
                }
            `;
            document.head.appendChild(styleEl);
        }

        await this.loadSettings();

        this.addSettingTab(new MediaViewerSettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE_MEDIA_VIEWER,
            (leaf) => new MediaViewerView(leaf, this)
        );

        this.addCommand({
            id: 'open-media-viewer',
            name: 'Open Media Gallery',
            callback: () => {
                this.activateView();
            }
        });

        this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
            this.requestUpdateMediaGallery();
        }));

        this.registerEvent(this.app.workspace.on('editor-change', (editor, view) => {
            this.requestUpdateMediaGallery();
        }));

        this.registerDomEvent(document, 'selectionchange', () => this.handleCursorChange());
        this.registerDomEvent(document, 'click', (evt) => this.handleGlobalClick(evt));
        this.registerDomEvent(document, 'keyup', () => this.handleCursorChange());

        this.app.workspace.onLayoutReady(() => {
            this.activateView(false);
            setTimeout(() => {
                this.requestUpdateMediaGallery();
            }, 500);
        });
    }

    onunload() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        if (this.cursorTimeout) {
            clearTimeout(this.cursorTimeout);
        }
        const styleEl = document.getElementById('current-pane-media-gallery-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }

    async activateView(reveal = true) {
        const { workspace } = this.app;

        let leaf = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_MEDIA_VIEWER);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_MEDIA_VIEWER, active: reveal });
        }

        if (reveal) {
            workspace.revealLeaf(leaf);
        }
    }

    requestUpdateMediaGallery() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(() => {
            this.updateMediaGallery();
        }, 500);
    }

    handleCursorChange() {
        if (this.cursorTimeout) {
            clearTimeout(this.cursorTimeout);
        }
        this.cursorTimeout = setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (!view || view.getMode() !== "source" || !view.editor) return;

            const cursor = view.editor.getCursor();
            const offset = view.editor.posToOffset(cursor);

            const mediaView = this.getMediaView();
            if (mediaView) {
                mediaView.highlightMediaForOffset(offset);
            }
        }, 100);
    }

    handleGlobalClick(evt) {
        this.handleCursorChange();
        
        const target = evt.target;
        if (!target || (target.tagName !== 'IMG' && target.tagName !== 'VIDEO')) return;
        
        const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!view || view.getMode() !== "preview") return;
        
        if (!view.contentEl.contains(target)) return;
        
        const mediaView = this.getMediaView();
        if (!mediaView || !mediaView.currentMediaItems) return;
        
        const safeDecode = (str) => {
            if (!str) return "";
            try { return decodeURIComponent(str); } catch(e) { return str; }
        };
        
        const getFilename = (str) => {
            if (!str) return "";
            const clean = safeDecode(str.split('?')[0]);
            return clean.split('/').pop().split('\\').pop();
        };
        
        let clickedItem = null;
        for (const item of mediaView.currentMediaItems) {
            const targetFilename = getFilename(target.src) || getFilename(target.getAttribute('src'));
            const itemFilename = getFilename(item.resourcePath) || getFilename(item.src);
            
            if (item.type === 'image' && target.tagName === 'IMG') {
                if (targetFilename === itemFilename) {
                    clickedItem = item;
                    break;
                }
            } else if (item.type === 'video' && target.tagName === 'VIDEO') {
                const sourceEl = target.querySelector('source');
                const sourceFilename = sourceEl ? getFilename(sourceEl.src) : '';
                if (targetFilename === itemFilename || sourceFilename === itemFilename) {
                    clickedItem = item;
                    break;
                }
            }
        }
        
        if (clickedItem && clickedItem.offsets && clickedItem.offsets.length > 0) {
            mediaView.highlightMediaForOffset(clickedItem.offsets[0]);
        }
    }

    async updateMediaGallery() {
        const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        const mediaView = this.getMediaView();
        
        if (!mediaView) return;

        if (!view || !view.file) {
            const mdLeaves = this.app.workspace.getLeavesOfType("markdown");
            if (mdLeaves.length === 0) {
                mediaView.setMediaList([]);
                this.currentDisplayedFile = null;
                this.lastContent = null;
            }
            return;
        }

        const file = view.file;
        let content = "";
        
        if (view.getMode() === "source" && view.editor) {
            content = view.editor.getValue();
        } else {
            content = await this.app.vault.cachedRead(file);
        }

        // Prevent unnecessary rebuilds if the content hasn't changed
        if (this.currentDisplayedFile?.path === file.path && this.lastContent === content) {
            return;
        }
        
        this.currentDisplayedFile = file;
        this.lastContent = content;
        
        const regex = /!\[.*?\]\((.*?)\)|!\[\[(.*?)\]\]/g;
        
        const mediaItems = [];
        const mediaMap = new Map();
        let match;
        
        const processPath = (mediaPath, matchIndex, matchText) => {
            const actualPath = mediaPath.split('|')[0].trim();
            if (mediaMap.has(actualPath)) {
                mediaMap.get(actualPath).offsets.push(matchIndex);
                mediaMap.get(actualPath).matches.push(matchText);
                return;
            }
            
            const destFile = this.app.metadataCache.getFirstLinkpathDest(actualPath, file.path);
            let mediaItem = null;

            if (destFile instanceof obsidian.TFile) {
                const ext = destFile.extension.toLowerCase();
                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
                const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
                
                const resourcePath = this.app.vault.getResourcePath(destFile);
                
                if (imageExts.includes(ext)) {
                    mediaItem = { src: destFile.path, type: "image", resourcePath: resourcePath, offsets: [matchIndex], file: destFile, matches: [matchText] };
                } else if (videoExts.includes(ext)) {
                    mediaItem = { src: destFile.path, type: "video", resourcePath: resourcePath, offsets: [matchIndex], file: destFile, matches: [matchText] };
                }
            } else if (actualPath.startsWith('http://') || actualPath.startsWith('https://')) {
                const ext = actualPath.split('?')[0].split('.').pop().toLowerCase();
                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
                const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
                
                if (imageExts.includes(ext) || actualPath.includes('image')) {
                     mediaItem = { src: actualPath, type: "image", resourcePath: actualPath, offsets: [matchIndex], matches: [matchText] };
                } else if (videoExts.includes(ext)) {
                     mediaItem = { src: actualPath, type: "video", resourcePath: actualPath, offsets: [matchIndex], matches: [matchText] };
                }
            }

            if (mediaItem) {
                mediaMap.set(actualPath, mediaItem);
                mediaItems.push(mediaItem);
            }
        };

        while ((match = regex.exec(content)) !== null) {
            const mediaPath = match[1] || match[2];
            if (mediaPath) processPath(mediaPath, match.index, match[0]);
        }
        
        mediaView.setMediaList(mediaItems);
        this.handleCursorChange();
    }

    getMediaView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MEDIA_VIEWER);
        if (leaves.length > 0) {
            return leaves[0].view;
        }
        return null;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class MediaViewerSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        new obsidian.Setting(containerEl)
            .setName('Layout Style')
            .setDesc('Choose how media items are arranged in the gallery.')
            .addDropdown(dropdown => dropdown
                .addOption('masonry', 'Masonry')
                .addOption('vertical-1', 'Vertical 1 Column')
                .addOption('vertical-2', 'Vertical 2 Columns')
                .addOption('horizontal-1', 'Horizontal 1 Row')
                .addOption('horizontal-2', 'Horizontal 2 Rows')
                .addOption('fit-all', 'Fit All to Pane (No Scrollbar)')
                .setValue(this.plugin.settings.layoutStyle)
                .onChange(async (value) => {
                    this.plugin.settings.layoutStyle = value;
                    await this.plugin.saveSettings();
                    this.plugin.lastContent = null;
                    this.plugin.requestUpdateMediaGallery();
                }));

        new obsidian.Setting(containerEl)
            .setName('Max Image Height')
            .setDesc('Maximum height of images/videos in pixels. Set to 0 to disable (images will keep their natural height).')
            .addText(text => text
                .setPlaceholder('0')
                .setValue(String(this.plugin.settings.maxImageHeight))
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!isNaN(num)) {
                        this.plugin.settings.maxImageHeight = num;
                        await this.plugin.saveSettings();
                        this.plugin.lastContent = null;
                        this.plugin.requestUpdateMediaGallery();
                    }
                }));

        new obsidian.Setting(containerEl)
            .setName('Enable Overflow Scrollbar')
            .setDesc('Allow vertical scrolling if there are many images.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableOverflow)
                .onChange(async (value) => {
                    this.plugin.settings.enableOverflow = value;
                    await this.plugin.saveSettings();
                    this.plugin.lastContent = null;
                    this.plugin.requestUpdateMediaGallery();
                }));

        new obsidian.Setting(containerEl)
            .setName('Auto Play Video')
            .setDesc('Automatically play videos when they are previewed in the gallery.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoPlayVideo)
                .onChange(async (value) => {
                    this.plugin.settings.autoPlayVideo = value;
                    await this.plugin.saveSettings();
                    this.plugin.lastContent = null;
                    this.plugin.requestUpdateMediaGallery();
                }));
    }
}

module.exports = CurrentPaneMediaViewerPlugin;
