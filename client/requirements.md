## Packages
framer-motion | For smooth FAB animations and page transitions
@dnd-kit/core | For drag and drop layer management
@dnd-kit/sortable | For sortable layer lists
@dnd-kit/utilities | Utilities for dnd-kit
dexie | IndexedDB wrapper for local storage of layers and history
react-i18next | Internationalization framework
i18next | Core i18n library
i18next-browser-languagedetector | Language detection
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind CSS classes
monaco-editor | Code editor for layer content (JS/CSS)
@monaco-editor/react | React component for Monaco Editor

## Notes
The app acts as a browser wrapper.
Primary storage for layers and settings should sync with backend but fallback/cache locally using Dexie.
The WebView is simulated using iframes for the web version.
Default language is Thai ('th').
