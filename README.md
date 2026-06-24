# GexTag v3.0

GexTag is a professional-grade, browser-based utility for bulk geotagging, EXIF metadata management, and high-resolution map exporting. Designed with a bold, high-contrast aesthetic by **chaos.studio.mv**, it provides a secure and powerful environment for photographers, GIS professionals, and hobbyists to process spatial data without ever uploading private images to a server.

## Core Workspaces

### 1. Geotagger
A precision-focused environment for injecting location and descriptive metadata into your images.
*   **Persistent Batch Queue**: Stored in IndexedDB, your queue remains safe even after refreshes.
*   **Interactive Placement**: Search via Nominatim, use IP/GPS location centering, or precisely drop and drag pins on the map.
*   **EXIF Injection**: Real-time injection of Latitude, Longitude, Description, Artist, Copyright, Keywords, and Date/Time into JPEG headers.
*   **Smart Metadata**: Double-spacing in keyword fields automatically formats tags with commas for rapid entry.
*   **Presets Engine**: Save frequently used location and copyright configurations for one-click application across future sessions.

### 2. Map Export (Beta)
An advanced workspace for creating high-fidelity, layered map assets.
*   **Multi-Layer Tile Blending**: Dynamically stack and adjust the opacity of multiple tile sources (Google Satellite, Esri, OSM, HDC Overlays, and Carto Styles).
*   **High-Resolution Canvas**: Export maps at up to 4000x4000px with 2x retina scaling.
*   **Retina Scaling**: Enhanced resolution for sharp, professional-grade prints and digital displays.
*   **Hardware Acceleration**: Built-in CSS hardware acceleration for buttery-smooth layer opacity sliding.

## Design & Experience
*   **Bold Aesthetics**: A custom "Chaos Studio" visual identity using deep charcoal canvases and vibrant brand accents.
*   **Velocity Motion**: Powered by `motion/react` for fluid, intent-driven transitions and a high-energy loading sequence.
*   **Mobile-First Precision**: A streamlined mobile UI with integrated controls, adaptive layout ordering, and quick-access action bars.

## Technologies
*   **Frontend**: React + Vite + TypeScript.
*   **Styling**: Tailwind CSS with custom theme configurations.
*   **Maps**: Leaflet + React-Leaflet + HDC (Hulhumalé) Imagery.
*   **Processing**: `piexifjs` for binary EXIF manipulation and `JSZip` for client-side archive packaging.
*   **Persistence**: `idb-keyval` (IndexedDB) for secure, offline-first data storage.
*   **Animation**: `motion/react` for complex layout transitions and physics-based motion.

---
**Created from passion by chaos.studio.mv**  
[chaos.studio](https://portfolio.chaoticstudio.workers.dev/studio) | [chaos.studio.mv@gmail.com](mailto:chaos.studio.mv@gmail.com) | +960 9401011 (Telegram)
