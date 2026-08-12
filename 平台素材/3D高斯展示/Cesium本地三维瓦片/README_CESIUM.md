# DJI 3DGS Cesium Tileset

This folder contains the higher-detail Cesium-compatible 3D Gaussian Splatting tileset converted from `3dgs_ply` DJI output.

- Entry file: `tileset.json`
- Tile payloads: `tiles/**/*.glb`
- Format: 3D Tiles 1.1 with `3DTILES_content_gltf`
- Splat extensions: `KHR_gaussian_splatting` and `KHR_gaussian_splatting_compression_spz_2`
- Placement source: `3dgs_ply/geo_desc.json`
- WGS84 anchor: `[24.636255278, 99.908740607, 1764.0]`
- Source LOD: `LOD0` from `Block000` and `Block001`
- Vertex count: `22,519,595`

Open `../local_cesium_viewer.html` from a local static server to view this LOD0 tileset by default.
Use `?heightOffset=-50` or the viewer panel to test vertical offsets without regenerating tiles.
