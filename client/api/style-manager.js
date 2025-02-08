export const styleManager = {
    currentPageStyle: null,

    async loadStyles(pageName, cssPath) {
        try {
            // Remove previous page's styles
            this.removeCurrentStyles();

            // Create new style element with unique identifier
            const styleSheet = document.createElement('style');
            styleSheet.id = `style-${pageName}`;

            // Fetch and apply new styles
            const cssResponse = await fetch(cssPath);
            const css = await cssResponse.text();
            styleSheet.textContent = css;

            // Save reference and append to document
            this.currentPageStyle = styleSheet;
            document.head.appendChild(styleSheet);
        } catch (error) {
            console.error(`Error loading styles for ${pageName}:`, error);
        }
    },

    removeCurrentStyles() {
        if (this.currentPageStyle) {
            this.currentPageStyle.remove();
            this.currentPageStyle = null;
        }
    }
};