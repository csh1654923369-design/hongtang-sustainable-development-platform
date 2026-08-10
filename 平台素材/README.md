# 平台素材

本文件夹集中保存“红塘村可持续发展平台”运行、重新生成网页素材和模型转换所需的大体积文件，不属于“平台源码”Git仓库。

## 目录说明

- `3D高斯展示/`：Spark转换工具、恢复工具、标准PLY、RAD索引和476个RADC流式分块。正式平台3D首页运行时读取其中的`轻量化模型/`。
- `Production_1-tif/`：无人机正射影像、DSM、裁剪和重采样成果。网站平时读取“平台源码/public/data”中的轻量网页版本；只有重新生成网页影像时才读取这里的原始TIF。
- `地图原始数据/`：建筑轮廓与建筑调查属性原始文件。重新生成建筑调研底图时使用；网页只读取经过隐私字段筛选的轻量结果。
- `地图服务素材/`：从三农数据GeoServer下载的建筑图层、手绘图层、坐标范围和来源地址。建筑GeoJSON属于原始资料，不直接发布到网页。
- `POI_1785232551999.xlsx`：56条真实POI资料，包含名称、分类、简介和经纬度。
- `poi图片.csv`：392条POI现场照片记录，网站按POI名称与点位匹配。
- `村景图片.csv`：427条村景照片记录；生成脚本只采用位于红塘村手绘图范围内、坐标有效的记录，当前整理为93组、190张网页照片。

## 网站使用方式

网站不会在浏览器中直接打开本文件夹里的原始表格或原始WFS，而是在“平台源码”中生成适合网页读取的运行文件：

```text
平台源码/public/data/hongtang-handdrawn-map.png
平台源码/public/data/hongtang-map-layers.json
平台源码/public/data/hongtang-buildings-safe.geojson
平台源码/public/data/hongtang-real-map-features.json
```

更新Excel、CSV或地图服务下载资料后，在“平台源码”中重新运行：

```powershell
python scripts/prepare-real-map-data.py
npm run prepare:map-service-assets
```

现场照片继续使用CSV中的`sannongdata.cn`网址，因此浏览照片时需要联网；手绘底图、点位坐标、文字资料和脱敏建筑轮廓为本地文件。

## 使用与安全

- 不要把本文件夹提交到GitHub；其中包含大型模型、原始航拍成果和可能含调查字段的原始数据。
- 不要直接公开`地图原始数据/building_attributes.json`。平台生成脚本只输出建筑编号、类型、高度、估算占地、轮廓和坐标，不输出户主、住址、家庭成员或人口字段。
- 移动整个项目到另一台电脑时，请同时复制“平台源码”“平台素材”以及根目录下的“启动网站.bat”和“关闭网站.bat”。
- 正式3D首页默认模型目录为`../平台素材/3D高斯展示/轻量化模型`；如另行存放，可在“平台源码/.env.local”中设置`GAUSSIAN_MODEL_DIR`。