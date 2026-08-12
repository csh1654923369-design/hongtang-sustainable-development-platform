# Supabase数据维护说明

本地版与GitHub在线版优先读取同一个Supabase项目。地点、供水专题和专题记录存放在`platform_datasets`表，现场照片存放在`hongtang-photos`素材桶；源码中的JSON和照片只作为断网回退。

## 首次准备

在`平台源码`文件夹中完成登录和项目关联：

```powershell
npx supabase login
npx supabase link --project-ref devxrszyvoocerobdfhz
```

公开网页只使用`NEXT_PUBLIC_SUPABASE_URL`和`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。`SUPABASE_SERVICE_KEY`只能由维护人员在当前终端临时提供，不能写进源码、网页、环境配置文件或Git仓库。

## 更新资料

先按需要重新整理地点和照片，再同步到Supabase：

```powershell
python scripts/prepare-real-map-data.py
npm run prepare:map-service-assets
python scripts/localize-point-photos.py
$env:SUPABASE_URL="https://devxrszyvoocerobdfhz.supabase.co"
$env:SUPABASE_SERVICE_KEY="仅在当前终端临时粘贴服务器密钥"
$env:SUPABASE_CHECK_REMOTE="1"
python scripts/upload-platform-data-to-supabase.py
```

上传脚本会复用云端已有照片，只上传新增或发生变化的文件；随后自动生成带时间戳的数据迁移，并通过Supabase CLI同步三套共享数据。完成后关闭终端即可清除本次临时变量。

## 检查结果

```powershell
npm run test:supabase-data
```

检查通过后，本地版与在线版会读取同一批数据，不需要把现场照片提交到GitHub。
