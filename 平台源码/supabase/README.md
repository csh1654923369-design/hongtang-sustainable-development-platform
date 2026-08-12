# Supabase 初始化说明

本目录包含红塘村可持续发展平台的数据库、权限和文件存储基础。前端当前仍使用统一 Mock Service；数据库上线后再按业务模块逐步切换 Service 实现。

## 文件

- `config.toml`：本地 Supabase 配置。
- `migrations/202607140001_initial_schema.sql`：领域表、枚举、索引和用户资料触发器。
- `migrations/202607140002_rls_and_storage.sql`：授权、RLS 策略和 Storage 文件桶。
- `seed.sql`：仅用于本地开发的演示目标与项目，不含真实村庄统计数据。

## 权限原则

- 已发布的目标、项目、指标、活动、问卷和地图内容允许游客只读。
- 问题上报、活动报名、问卷回答、关注、建议、通知和研究投稿按登录用户隔离。
- 内容审核、议题办理、审计日志和公开媒体维护仅允许管理员执行。
- 问题照片和研究文件默认存放在私有桶中，每个用户只能操作自己的目录或文件。
- 角色存放在 `public.profiles.role`，不依赖用户可以自行修改的 Auth user metadata。

## 云端关联

完成 CLI 登录后执行：

```powershell
npx supabase projects list
npx supabase link --project-ref <project-ref>
npx supabase db push
```

推送迁移前应先执行 `npx supabase db push --dry-run`。真实 URL 和 publishable key 只写入 `.env.local`，不要提交到 Git。

## 首位管理员

首位用户注册后，使用 Supabase Dashboard 的 SQL Editor 或受保护的服务端管理脚本将其提升为管理员：

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

不要在浏览器代码中使用 `service_role` key。
