# DSM 分卷说明

`Production_1-tif_DSM_merge.tif` 原文件超过 GitHub LFS 的单文件大小上限，因此仓库中保存的是同内容的分卷文件。

克隆仓库并完成 Git LFS 下载后，在本目录右键运行 PowerShell，执行：

```powershell
& ".\合并_DSM分卷.ps1"
```

脚本会按顺序合并所有分卷，生成 `Production_1-tif_DSM_merge.tif`，并依据 `Production_1-tif_DSM_merge.tif.sha256` 校验文件是否完整。

本机已有原始 DSM 时，无须再次合并；脚本不会在未确认的情况下覆盖现有文件。
