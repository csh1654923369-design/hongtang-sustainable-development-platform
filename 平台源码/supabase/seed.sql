-- 仅供本地开发和演示。这里没有红塘村真实统计数据。

insert into public.goals (
  id, sort_order, title, short_title, description, meaning, status_label,
  color, icon, sdg_tags, challenges, published, is_demo
)
values
  ('goal-livable', 1, '宜居环境改善', '宜居环境', '改善村庄环境卫生、公共空间、道路和基础设施。', '把日常问题转化为可以追踪的改善行动。', '持续推进', '#2F6B4F', 'Home', array['SDG 6', 'SDG 11'], array['公共空间使用体验待持续观察'], true, true),
  ('goal-ecology', 2, '生态资源保护', '生态保护', '保护水体、绿地、农田和村庄自然环境。', '以持续观察代替未经核实的环境结论。', '持续观察', '#4B7F65', 'Leaf', array['SDG 6', 'SDG 15'], array['真实生态资料仍需专业核实'], true, true),
  ('goal-service', 3, '公共服务提升', '公共服务', '关注老人、儿童、公共活动和日常服务。', '从不同使用者的真实体验识别服务缺口。', '共建讨论', '#A6533D', 'HeartHandshake', array['SDG 3', 'SDG 10'], array['服务需求需要分群体调研'], true, true),
  ('goal-opportunity', 4, '产业与生活机会', '产业机会', '支持本地产业、就业、经营和村庄活力。', '先建立合作线索和需求目录，再形成项目。', '资料准备', '#C08A45', 'Sprout', array['SDG 8', 'SDG 12'], array['不得用演示数据替代真实产业调查'], true, true),
  ('goal-culture', 5, '文化传承与社区共治', '文化共治', '保护村庄记忆，鼓励村民参与公共事务。', '记录来源、授权范围和核实状态。', '持续征集', '#7B5D4B', 'BookOpen', array['SDG 11', 'SDG 16'], array['历史资料公开前需要授权与核实'], true, true)
on conflict (id) do update set
  title = excluded.title,
  short_title = excluded.short_title,
  description = excluded.description,
  meaning = excluded.meaning,
  status_label = excluded.status_label,
  color = excluded.color,
  icon = excluded.icon,
  sdg_tags = excluded.sdg_tags,
  challenges = excluded.challenges,
  published = excluded.published,
  is_demo = excluded.is_demo;

insert into public.projects (
  id, slug, title, summary, background, goal_id, status, progress, location,
  lead, start_date, recruiting, project_type, budget_label, participants,
  accent, published, is_demo
)
values
  ('project-gateway', 'gateway-public-space', '村口公共空间微更新', '通过共创讨论和小尺度改造，改善村口停留、遮阴与日常交流体验。', '演示项目，不代表已确定的正式建设计划。', 'goal-livable', 'active', 62, '村口公共空间（演示位置）', '平台项目组', '2026-05-01', true, '公共空间', '演示预算', array['村民代表', '规划协作者'], '#2F6B4F', true, true),
  ('project-water', 'water-environment', '村内水环境改善行动', '建立水体观察点，记录日常问题、处理过程与后续变化。', '仅记录可见现象，不作专业水质结论。', 'goal-ecology', 'active', 48, '水体观察段（演示位置）', '环境观察小组', '2026-04-01', true, '生态观察', '演示预算', array['村民观察员', '学生调研组'], '#4B7F65', true, true),
  ('project-elderly', 'elderly-friendly-facilities', '长者友好公共设施提升', '从步行、休息、识别与安全角度检查公共设施使用体验。', '演示项目，后续需要真实使用者访谈。', 'goal-service', 'discussion', 35, '公共服务节点（演示位置）', '公共服务工作组', '2026-06-01', true, '公共服务', '待确认', array['村民志愿者'], '#A6533D', true, true),
  ('project-memory', 'village-memory', '红塘村文化记忆采集计划', '征集村民授权的照片、口述和空间记忆，建立可持续更新的资料目录。', '所有资料公开前必须完成来源、授权和核实登记。', 'goal-culture', 'active', 44, '文化资料点（演示位置）', '文化资料小组', '2026-03-01', true, '文化资料', '演示预算', array['青年志愿者', '文化资料小组'], '#7B5D4B', true, true),
  ('project-lane', 'lane-lighting', '村巷照明观察与维护', '记录照明问题高发位置，建立夜间观察、分派与复核机制。', '演示项目，不代表真实设施巡检结论。', 'goal-livable', 'maintenance', 78, '村巷节点（演示位置）', '设施维护小组', '2026-02-01', false, '设施维护', '演示预算', array['村民联络员', '设施维护人员'], '#C08A45', true, true)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  background = excluded.background,
  goal_id = excluded.goal_id,
  status = excluded.status,
  progress = excluded.progress,
  location = excluded.location,
  lead = excluded.lead,
  recruiting = excluded.recruiting,
  project_type = excluded.project_type,
  budget_label = excluded.budget_label,
  participants = excluded.participants,
  accent = excluded.accent,
  published = excluded.published,
  is_demo = excluded.is_demo;
