# GexTag

GexTag is a powerful, client-side bulk geotagging and EXIF metadata utility. Designed with a sleek, high-contrast "Chaos Studio" aesthetic, it allows users to effortlessly inject spatial data, copyrights, dates, and keywords into their photos entirely within the browser.

## How It Works

GexTag is built to be secure, fast, and persistent:
1. **Importing & Processing**: Users drag and drop images (.jpg, .png, .webp) into the queue. Non-JPEG files are seamlessly converted to JPEG via HTML5 Canvas (as EXIF injection requires the JPEG format).
2. **Persistent Queue**: As soon as images are loaded, they are stored locally using IndexedDB. If the browser is refreshed or accidentally closed, your queue is safely restored.
3. **Spatial Visualization**: Using the interactive map, users can search for locations, allow IP-based/GPS location centering, and precisely drop pins. You can also drag individual photos across the map to set specific coordinates.
4. **Batch Editing**: Apply bulk EXIF data (Description, Artist, Copyright, Keywords, Date Time Original) across your entire queue simultaneously. Double-spacing in the keyword field automatically inserts commas for rapid tagging.
5. **Presets**: Save frequently used location and metadata combinations as "Presets" to load them instantly in future sessions. When you batch export, you'll also be prompted to save new configurations as presets.
6. **Export & Bulk Rename**: During the export phase, `piexifjs` encodes the EXIF data directly into the JPEG binaries. The app allows you to choose an output format (with a warning if exporting non-JPEG where metadata could be lost), bulk rename your files with custom base names and suffixes (e.g., `-geotagged`), and packages everything into a `.zip` archive using `JSZip` — all without ever uploading your files to a remote server.

## Sources & Technologies

This application leverages several open-source libraries, APIs, and geospatial services to deliver its capabilities:

- **React + Vite**: The core frontend framework and build tool, providing a fast and responsive Single Page Application (SPA).
- **Tailwind CSS**: Used to construct the bespoke, high-contrast dark visual identity and responsive layouts.
- **Leaflet & React-Leaflet**: The mapping engine powering the spatial visualization panel, enabling smooth panning, zooming, and marker dragging.
- **piexifjs**: A pure JavaScript library used to read, modify, and inject EXIF metadata directly into the image binaries inside the browser.
- **JSZip & FileSaver.js**: Together, these handle the client-side `.zip` compression and trigger the final archive download.
- **idb-keyval**: A lightweight wrapper for IndexedDB, responsible for the persistent image queue.
- **IP Geolocation API (`ipapi.co`)**: Used as a fallback location resolver. If standard HTML5 Geolocation is unavailable or denied, this API estimates the initial map center based on the user's IP address.
- **Lucide React**: Supplies the sleek, consistent SVG icons used throughout the interface.

### Map Imagery Sources
- **Esri World Imagery**: The default high-resolution satellite base map.
  - *Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.*
- **OpenStreetMap**: Used as a fallback base map when zooming in beyond the available resolution of Esri World Imagery (zoom level 19+).
  - *Source: &copy; OpenStreetMap contributors.*
- **Hulhumalé Imagery (March 24, 2024)**: A highly-detailed, specialized drone/satellite imagery layer specifically for Hulhumalé, Maldives.
  - *Source: Housing Development Corporation (HDC).*

---
**Created from passion by chaos.studio.mv**  
[chaos.studio](https://portfolio.chaoticstudio.workers.dev/studio) | [chaos.studio.mv@gmail.com](mailto:chaos.studio.mv@gmail.com)
