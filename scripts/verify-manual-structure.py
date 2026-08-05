from pathlib import Path
import zipfile

from docx import Document
from docx.oxml.ns import qn


source_root = Path(__file__).resolve().parents[1]
manual = source_root.parent / "红塘村可持续发展平台使用手册.docx"

with zipfile.ZipFile(manual) as archive:
    assert archive.testzip() is None

document = Document(manual)
all_text = "\n".join(paragraph.text for paragraph in document.paragraphs)
table_rows = [len(table.rows) for table in document.tables]
first_line_count = len(
    document.element.body.xpath('.//w:ind[@w:firstLineChars="200"]')
)

assert "V1.29 Demo" in document.paragraphs[5].text
assert "默认高斯点预算由约80万降至35万" in all_text
assert "api/gaussian-model/[filename]/route.ts" in all_text
assert "稳定后等待两秒新增渲染帧为0" in all_text
assert "唯一请求式刷新队列" in all_text
assert "选择“省电”" in all_text
assert "生成476个流式分块" in all_text
assert "平台素材/3D高斯展示/轻量化模型" in all_text
assert "平台素材/Production_1-tif" in all_text
assert "平台素材/地图服务素材" in all_text
assert "56个POI" in all_text
assert "93组村景" in all_text
assert "hongtang-buildings-safe.geojson" in all_text
assert "scripts/prepare-real-map-data.py" in all_text
assert "真实点位照片无法显示" in "\n".join(cell.text for row in document.tables[3].rows for cell in row.cells)
assert table_rows == [5, 22, 9, 14, 31]
assert len(document.inline_shapes) == 13
assert first_line_count >= 18
assert (
    document.styles["Normal"].element.rPr.rFonts.get(qn("w:eastAsia")) == "SimSun"
)
assert (
    document.styles["Heading 1"].element.rPr.rFonts.get(qn("w:eastAsia"))
    == "SimHei"
)

print(
    {
        "version": document.paragraphs[5].text,
        "paragraphs": len(document.paragraphs),
        "inline_shapes": len(document.inline_shapes),
        "table_rows": table_rows,
        "native_two_character_indents": first_line_count,
        "zip": "ok",
    }
)
