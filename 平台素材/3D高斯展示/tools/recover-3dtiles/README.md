# 从本项目 3D Tiles 恢复高斯 PLY

此工具仅用于红塘村现有 `KHR_gaussian_splatting_compression_spz_2` 瓦片包。它会：

1. 读取 `tileset.json`；
2. 仅选择 `REPLACE` 树的末级瓦片，避免重复合并各级 LoD；
3. 解码每个 GLB 中的 SPZ 数据；
4. 按 GLB 节点矩阵恢复原始 Z-up 模型坐标；
5. 输出 Spark `build-lod` 可直接读取的标准二进制 PLY。

构建：

```powershell
cargo build --manifest-path .\Cargo.toml --release
```

使用：

```powershell
.\target\release\recover-3dtiles.exe "3D Tiles 文件夹" "输出文件.ply"
```

当前红塘村瓦片包经校验共有 1,036 个末级瓦片、22,519,595 个高斯点。
