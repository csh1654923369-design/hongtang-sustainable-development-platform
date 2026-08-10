from pathlib import Path
import zipfile

from docx import Document
from docx.oxml.ns import qn


source_root = Path(__file__).resolve().parents[1]
manual = source_root.parent / "红塘村可持续发展平台使用手册.docx"

with zipfile.ZipFile(manual) as archive:
    assert archive.testzip() is None

document = Document(manual)
paragraph_text = "\n".join(paragraph.text for paragraph in document.paragraphs)
table_text = "\n".join(
    cell.text
    for table in document.tables
    for row in table.rows
    for cell in row.cells
)
first_line_count = len(document.element.body.xpath('.//w:ind[@w:firstLineChars="200"]'))

assert any(paragraph.text.startswith("版本：V1.76") for paragraph in document.paragraphs)
assert "首页默认进入红塘村2D地图" in paragraph_text
assert "高德在线地图" in paragraph_text
assert "整数屏幕像素定位" in paragraph_text
assert "npm run test:2d-markers" in paragraph_text
assert "原地图左下角的孤立入口已经删除" in paragraph_text
assert "优先读取同一个Supabase云端数据库" in paragraph_text
assert "hongtang-photos素材桶" in paragraph_text
assert "SUPABASE_SERVICE_KEY不得进入浏览器或Git仓库" in paragraph_text
assert "4.3 小花园与茶产业专题" in paragraph_text
assert "4.4 塌方与安全、历史与文化专题" in paragraph_text
assert "其他资料" in paragraph_text
assert "其他资料保持原有颜色，并统一使用低遮挡小圆点" in paragraph_text
assert "点击右侧带倒三角的“展开”" in paragraph_text
assert "打开后按钮变为“收起”" in paragraph_text
assert "不重复显示“专题、全选、完成”标题行" in paragraph_text
assert "生态资源" not in paragraph_text
assert "生态资源" not in table_text
assert "2D和3D使用同一规则" in paragraph_text
assert "右下角工具在2D和3D之间采用同一视觉样式" in paragraph_text
assert "2D保留“回到中心、全屏查看”" in paragraph_text
assert "切换按钮位于右上角" in paragraph_text
assert "“航拍”“手绘”“卫星”“底图”四个按钮" in paragraph_text
assert "首次打开网页时默认选中“航拍”" in paragraph_text
assert "卡片通过外层高度和透明度自然展开" in paragraph_text
assert "不参与位移、缩放或回弹动画" in paragraph_text
assert "平台名称卡片与专题大卡片保持相同宽度" in paragraph_text
assert "专题片区与线路会同时覆盖地形和三维模型表面" in paragraph_text
assert "浅色描边和遮挡补偿" in paragraph_text
assert "“卫星”使用高德官方卫星与路网图层" in paragraph_text
assert "同一卡片第二行横向显示“航拍”“手绘”“卫星”“底图”" in paragraph_text
assert "内部文字与列表始终保持固定位置" in paragraph_text
assert "五个专题会在第一次显示时直接保持全选" in paragraph_text
assert "只有数据读取完成且筛选结果确实为空时" in paragraph_text
assert "2D保留“回到中心、全屏查看”" in paragraph_text
assert "3D仅保留“操作设置、回到中心、全屏查看”" in paragraph_text
assert "6.4 红塘空间数据编辑器（GeoLibre）" in paragraph_text
assert "http://localhost:3000/geolibre-lab" in paragraph_text
assert "供水分区3个、供水线路8条、水系统节点7个" in paragraph_text
assert "当前桥接采用安全只读模式" in paragraph_text
assert "npm run test:geolibre" in paragraph_text
assert "可绘制点、线和面" in paragraph_text
assert "通用处理、三维试验、插件管理、系统设置和帮助" in paragraph_text
assert "vendor/geolibre保存可维护的上游源码" in paragraph_text
assert "原首页及其专题、图层和视图状态继续保留" in paragraph_text
assert "最下方第三行为“地图编辑 / GeoLibre专业工具”" in paragraph_text
assert "专题卡片会下移到地图功能卡片下方" in paragraph_text
assert "不再重复提供“新窗口打开”按钮" in paragraph_text
assert "先用约260毫秒完成右上角卡片过渡" in paragraph_text
assert "稳定状态下只运行当前地图" in paragraph_text
assert "查看全部地点" not in paragraph_text
assert "光伏不纳入当前五个专题" in paragraph_text
assert "npm run test:village-topics" in paragraph_text
assert "Supabase：platform_datasets表" in table_text
assert "2D图钉有时模糊，或点击后没有出现详情" in table_text

assert len(document.tables) == 6
assert [cell.text for cell in document.tables[0].rows[0].cells] == ["地点类型", "当前数量", "显示方式"]
assert [len(table.rows) for table in document.tables] == [6, 6, 7, 9, 14, 39]
assert [cell.text for cell in document.tables[4].rows[0].cells] == ["现象", "处理方法"]
assert [cell.text for cell in document.tables[5].rows[0].cells] == ["版本", "日期", "主要变化"]
assert document.tables[5].rows[1].cells[0].text == "V1.76"
assert first_line_count >= 22
assert document.styles["Normal"].element.rPr.rFonts.get(qn("w:eastAsia")) == "宋体"
assert document.styles["Normal"].font.name == "Times New Roman"
assert document.styles["Heading 1"].element.rPr.rFonts.get(qn("w:eastAsia")) == "黑体"
assert document.styles["Heading 2"].element.rPr.rFonts.get(qn("w:eastAsia")) == "黑体"

print(
    {
        "version": next(p.text for p in document.paragraphs if p.text.startswith("版本：")),
        "paragraphs": len(document.paragraphs),
        "table_rows": [len(table.rows) for table in document.tables],
        "native_two_character_indents": first_line_count,
        "zip": "ok",
    }
)
