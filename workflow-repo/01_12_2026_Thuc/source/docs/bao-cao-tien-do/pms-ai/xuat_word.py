"""Xuất ba tài liệu Markdown đánh số 01/02/03 sang Word bằng Python chuẩn.

Chạy: python -X utf8 docs/bao-cao-tien-do/pms-ai/xuat_word.py
Không cần cài thư viện. Chỉ tạo/cập nhật DOCX cùng tên trong thư mục này.
"""

from __future__ import annotations

import re
import struct
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT = "http://schemas.openxmlformats.org/package/2006/content-types"
XML = "http://www.w3.org/XML/1998/namespace"
WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture"
ET.register_namespace("w", W)
ET.register_namespace("r", R)
ET.register_namespace("wp", WP)
ET.register_namespace("a", A)
ET.register_namespace("pic", PIC)

PAGE_WIDTH = 11906  # A4, twips
TEXT_WIDTH = PAGE_WIDTH - 1701 - 1134  # Lề trái 3 cm, phải 2 cm
THESIS = (
    "Xây dựng hệ thống phần mềm quản lý khách sạn kết hợp AI "
    "trong quản lý và vận hành."
)


def tag(name: str) -> str:
    return f"{{{W}}}{name}"


def add(parent: ET.Element, name: str, text: str | None = None, **attrs) -> ET.Element:
    el = ET.SubElement(parent, tag(name), {tag(k): str(v) for k, v in attrs.items()})
    if text is not None:
        el.text = text
    return el


def run(parent, text, *, bold=False, italic=False, code=False, size=None, color=None):
    r = add(parent, "r")
    if bold or italic or code or size or color:
        props = add(r, "rPr")
        if bold:
            add(props, "b")
        if italic:
            add(props, "i")
        if code:
            add(props, "rFonts", ascii="Consolas", hAnsi="Consolas", eastAsia="Consolas")
            add(props, "sz", val=size or 21)
        elif size:
            add(props, "sz", val=size)
        if color:
            add(props, "color", val=color)
    for i, line in enumerate(str(text).split("\n")):
        if i:
            add(r, "br")
        t = add(r, "t", line)
        t.set(f"{{{XML}}}space", "preserve")
    return r


INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\)|<br\s*/?>)")


def inline(parent, value: str, *, size=None, bold=False):
    """Giữ nội dung liên kết ở dạng dễ đọc, không tạo link file cục bộ bị hỏng."""
    for part in INLINE.split(value):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run(parent, part[2:-2], bold=True, size=size)
        elif part.startswith("`") and part.endswith("`"):
            run(parent, part[1:-1], code=True, size=size)
        elif part.startswith("[") and "](" in part:
            label, target = part[1:].split("](", 1)
            target = target[:-1]
            # Giữ cả địa chỉ tài liệu tham chiếu để bản Word vẫn tra cứu được.
            run(parent, label if label == target else f"{label} ({target})", size=size, bold=bold)
        elif re.fullmatch(r"<br\s*/?>", part):
            add(add(parent, "r"), "br")
        else:
            run(parent, part, size=size, bold=bold)


def paragraph(parent, value="", *, style=None, align=None, size=None, bold=False,
              before=None, after=None, keep=False, bullet=False, hanging=False):
    p = add(parent, "p")
    pp = add(p, "pPr")
    if style:
        add(pp, "pStyle", val=style)
    if align:
        add(pp, "jc", val=align)
    if before is not None or after is not None:
        attrs = {}
        if before is not None:
            attrs["before"] = before
        if after is not None:
            attrs["after"] = after
        add(pp, "spacing", **attrs)
    if keep:
        add(pp, "keepNext")
    if bullet:
        numbering = add(pp, "numPr")
        add(numbering, "ilvl", val=0)
        add(numbering, "numId", val=1)
    if hanging:
        add(pp, "ind", left=360, hanging=360)
    inline(p, value, size=size, bold=bold)
    return p


def table_cells(line):
    # Không tách dấu | được escape trong ô Markdown.
    return [s.strip().replace(r"\|", "|") for s in re.split(r"(?<!\\)\|", line.strip().strip("|"))]


def table_widths(rows):
    count = max(len(row) for row in rows)
    # Dùng độ dài trung bình có chặn để cột ID không chiếm chỗ của cột mô tả.
    weights = []
    for index in range(count):
        vals = [len(re.sub(r"[`*]", "", row[index])) for row in rows if index < len(row)]
        average = sum(min(n, 150) for n in vals) / max(len(vals), 1)
        weights.append(max(8, min(65, average)))
    minimum = 560 if count <= 6 else 420
    available = TEXT_WIDTH - count * minimum
    if available < 0:
        minimum = TEXT_WIDTH // count
        available = 0
    widths = [minimum + int(available * weight / sum(weights)) for weight in weights]
    widths[-1] += TEXT_WIDTH - sum(widths)
    return widths


def table(parent, rows):
    widths = table_widths(rows)
    tb = add(parent, "tbl")
    props = add(tb, "tblPr")
    add(props, "tblW", w=TEXT_WIDTH, type="dxa")
    add(props, "tblLayout", type="fixed")
    borders = add(props, "tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        add(borders, edge, val="single", sz=4, color="A8B6C5")
    margins = add(props, "tblCellMar")
    for edge, amount in (("top", 65), ("bottom", 65), ("left", 75), ("right", 75)):
        add(margins, edge, w=amount, type="dxa")
    grid = add(tb, "tblGrid")
    for width in widths:
        add(grid, "gridCol", w=width)
    font_size = 21 if len(widths) >= 5 else 22
    for number, values in enumerate(rows):
        row = add(tb, "tr")
        rp = add(row, "trPr")
        if number == 0:
            add(rp, "tblHeader")
        for index, width in enumerate(widths):
            cell = add(row, "tc")
            cp = add(cell, "tcPr")
            add(cp, "tcW", w=width, type="dxa")
            add(cp, "vAlign", val="top")
            if number == 0:
                add(cp, "shd", val="clear", color="auto", fill="E7EEF5")
            value = values[index] if index < len(values) else ""
            paragraph(cell, value, style="TableText", size=font_size, bold=number == 0, after=30)
    paragraph(parent, "", after=60)


def cover(body, document_title):
    paragraph(body, "[Tên trường]", align="center", size=28, bold=True, before=240, after=100)
    paragraph(body, "[Khoa]", align="center", size=26, bold=True, after=480)
    paragraph(body, "BÁO CÁO TIẾN ĐỘ", align="center", size=32, bold=True, after=120)
    paragraph(body, "Học phần: Tiểu luận chuyên ngành", align="center", size=27, after=480)
    paragraph(body, "ĐỀ TÀI", align="center", size=26, bold=True, after=160)
    paragraph(body, THESIS, align="center", size=32, bold=True, after=480)
    paragraph(body, re.sub(r"^\d+[.)]?\s+", "", document_title).upper(),
              align="center", size=30, bold=True, after=500)
    paragraph(body, "Sinh viên / nhóm: [Họ và tên sinh viên / nhóm]", after=160)
    paragraph(body, "Mã số sinh viên: [Mã số sinh viên]", after=160)
    paragraph(body, "Giảng viên hướng dẫn: [Giảng viên hướng dẫn]", after=350)
    paragraph(body, "Bản dự thảo v1.0", align="center", size=24, after=80)
    paragraph(body, "Ngày lập: 08/11/2026", align="center", size=24, after=0)
    p = add(body, "p")
    add(add(p, "r"), "br", type="page")


def png_image(body, caption, image_path, images):
    data = image_path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 24:
        raise ValueError(f"Ảnh không phải PNG hợp lệ: {image_path.name}")
    width, height = struct.unpack(">II", data[16:24])
    if not width or not height:
        raise ValueError(f"Kích thước ảnh không hợp lệ: {image_path.name}")
    number = len(images) + 1
    rid = f"rId{number + 3}"
    name = f"image{number}.png"
    images.append((rid, name, data))
    scale = min(1.0, TEXT_WIDTH * 635 / (width * 9525), 7_200_000 / (height * 9525))
    cx, cy = round(width * 9525 * scale), round(height * 9525 * scale)
    paragraph_node = paragraph(body, align="center", keep=True, before=120, after=80)
    drawing = add(add(paragraph_node, "r"), "drawing")
    anchor = ET.SubElement(drawing, f"{{{WP}}}inline", distT="0", distB="0", distL="0", distR="0")
    ET.SubElement(anchor, f"{{{WP}}}extent", cx=str(cx), cy=str(cy))
    ET.SubElement(anchor, f"{{{WP}}}effectExtent", l="0", t="0", r="0", b="0")
    ET.SubElement(anchor, f"{{{WP}}}docPr", id=str(number), name=name, descr=caption)
    nonvisual = ET.SubElement(anchor, f"{{{WP}}}cNvGraphicFramePr")
    ET.SubElement(nonvisual, f"{{{A}}}graphicFrameLocks", noChangeAspect="1")
    graphic = ET.SubElement(anchor, f"{{{A}}}graphic")
    graphic_data = ET.SubElement(graphic, f"{{{A}}}graphicData", uri=PIC)
    picture = ET.SubElement(graphic_data, f"{{{PIC}}}pic")
    props = ET.SubElement(picture, f"{{{PIC}}}nvPicPr")
    ET.SubElement(props, f"{{{PIC}}}cNvPr", id="0", name=name, descr=caption)
    ET.SubElement(props, f"{{{PIC}}}cNvPicPr")
    fill = ET.SubElement(picture, f"{{{PIC}}}blipFill")
    blip = ET.SubElement(fill, f"{{{A}}}blip")
    blip.set(f"{{{R}}}embed", rid)
    stretch = ET.SubElement(fill, f"{{{A}}}stretch")
    ET.SubElement(stretch, f"{{{A}}}fillRect")
    shape = ET.SubElement(picture, f"{{{PIC}}}spPr")
    transform = ET.SubElement(shape, f"{{{A}}}xfrm")
    ET.SubElement(transform, f"{{{A}}}off", x="0", y="0")
    ET.SubElement(transform, f"{{{A}}}ext", cx=str(cx), cy=str(cy))
    geometry = ET.SubElement(shape, f"{{{A}}}prstGeom", prst="rect")
    ET.SubElement(geometry, f"{{{A}}}avLst")
    paragraph(body, caption, align="center", size=22, after=160)


def markdown_body(body, source, base, images):
    lines = source.splitlines()
    first_heading = next((i for i, line in enumerate(lines) if line.startswith("# ")), None)
    title = lines[first_heading][2:].strip() if first_heading is not None else "TÀI LIỆU ĐỀ TÀI"
    cover(body, title)
    index = 0
    code = False
    while index < len(lines):
        line = lines[index]
        if index == first_heading:
            index += 1
            continue
        if line.strip().startswith("```"):
            code = not code
            index += 1
            continue
        if code:
            p = paragraph(body, style="CodeBlock", after=0)
            run(p, line, code=True, size=20)
            index += 1
            continue
        image = re.fullmatch(r"\s*!\[([^\]]*)\]\(([^)]+)\)\s*", line)
        if image:
            image_path = (base / image.group(2)).resolve()
            if image_path.suffix.lower() != ".png":
                raise ValueError("Chỉ hỗ trợ ảnh PNG trong tài liệu")
            png_image(body, image.group(1), image_path, images)
            index += 1
            continue
        if not line.strip():
            index += 1
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            # Tiêu đề cấp 1 đã đặt trên bìa; ## là cấp nội dung cao nhất.
            level = min(max(len(heading.group(1)) - 1, 1), 4)
            paragraph(body, heading.group(2), style=f"Heading{level}", keep=True)
            index += 1
            continue
        if ("|" in line and index + 1 < len(lines)
                and re.fullmatch(r"\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*", lines[index + 1])):
            rows = [table_cells(line)]
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                rows.append(table_cells(lines[index]))
                index += 1
            table(body, rows)
            continue
        item = re.match(r"^\s*[-*+]\s+(.+)$", line)
        if item:
            paragraph(body, item.group(1), bullet=True, after=90)
            index += 1
            continue
        ordered = re.match(r"^\s*\d+[.)]\s+.+$", line)
        if ordered:
            paragraph(body, line.strip(), hanging=True, after=90)
            index += 1
            continue
        if re.fullmatch(r"\s*[-*_]{3,}\s*", line):
            index += 1
            continue
        # Gộp dòng văn bản thường; giữ đoạn mới khi gặp cấu trúc Markdown.
        parts = [line.strip().removeprefix("> ")]
        index += 1
        while index < len(lines):
            following = lines[index]
            if (not following.strip() or re.match(r"^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|```|\||!\[)", following)
                    or (index + 1 < len(lines) and "|" in following and "---" in lines[index + 1])):
                break
            parts.append(following.strip().removeprefix("> "))
            index += 1
        paragraph(body, " ".join(parts))


def styles_xml():
    root = ET.Element(tag("styles"))
    defaults = add(root, "docDefaults")
    rp = add(add(defaults, "rPrDefault"), "rPr")
    add(rp, "rFonts", ascii="Times New Roman", hAnsi="Times New Roman", eastAsia="Times New Roman", cs="Times New Roman")
    add(rp, "sz", val=26)
    add(rp, "szCs", val=26)
    add(rp, "lang", val="vi-VN")
    pp = add(add(defaults, "pPrDefault"), "pPr")
    add(pp, "spacing", after=140, line=300, lineRule="auto")
    add(pp, "widowControl")
    normal = add(root, "style", type="paragraph", default=1, styleId="Normal")
    add(normal, "name", val="Normal")
    for level, size in ((1, 32), (2, 29), (3, 27), (4, 26)):
        st = add(root, "style", type="paragraph", styleId=f"Heading{level}")
        add(st, "name", val=f"heading {level}")
        add(st, "basedOn", val="Normal")
        add(st, "next", val="Normal")
        add(st, "qFormat")
        hp = add(st, "pPr")
        add(hp, "keepNext")
        add(hp, "keepLines")
        add(hp, "spacing", before=260 if level < 3 else 180, after=120)
        add(hp, "outlineLvl", val=level - 1)
        hr = add(st, "rPr")
        add(hr, "b")
        add(hr, "sz", val=size)
        add(hr, "color", val="17365D")
    for name in ("TableText", "CodeBlock"):
        st = add(root, "style", type="paragraph", styleId=name)
        add(st, "name", val=name)
        add(st, "basedOn", val="Normal")
        pp = add(st, "pPr")
        add(pp, "spacing", after=30, line=240, lineRule="auto")
    return root


def numbering_xml():
    root = ET.Element(tag("numbering"))
    abstract = add(root, "abstractNum", abstractNumId=0)
    add(abstract, "multiLevelType", val="singleLevel")
    lvl = add(abstract, "lvl", ilvl=0)
    add(lvl, "start", val=1)
    add(lvl, "numFmt", val="bullet")
    add(lvl, "lvlText", val="•")
    add(lvl, "lvlJc", val="left")
    pp = add(lvl, "pPr")
    add(pp, "ind", left=360, hanging=240)
    num = add(root, "num", numId=1)
    add(num, "abstractNumId", val=0)
    return root


def footer_xml():
    root = ET.Element(tag("ftr"))
    p = paragraph(root, align="center", size=22)
    field = add(p, "fldSimple", instr=" PAGE ")
    run(field, "1", size=22)
    return root


def relationships(items):
    root = ET.Element(f"{{{PKG}}}Relationships")
    for ident, kind, target in items:
        ET.SubElement(root, f"{{{PKG}}}Relationship", Id=ident,
                      Type=f"{R}/{kind}", Target=target)
    return root


def xml_bytes(element):
    return ET.tostring(element, encoding="utf-8", xml_declaration=True)


def export(source: Path):
    content = source.read_text(encoding="utf-8-sig")
    doc = ET.Element(tag("document"))
    body = add(doc, "body")
    images = []
    markdown_body(body, content, source.parent, images)
    section = add(body, "sectPr")
    footer = add(section, "footerReference", type="default")
    footer.set(f"{{{R}}}id", "rId3")
    add(section, "pgSz", w=PAGE_WIDTH, h=16838)
    add(section, "pgMar", top=1134, right=1134, bottom=1134, left=1701, header=567, footer=567, gutter=0)
    add(section, "titlePg")

    types = ET.Element(f"{{{CONTENT}}}Types")
    for extension, mime in (("rels", "application/vnd.openxmlformats-package.relationships+xml"),
                            ("xml", "application/xml"), ("png", "image/png")):
        ET.SubElement(types, f"{{{CONTENT}}}Default", Extension=extension, ContentType=mime)
    for name, kind in (("document", "document.main"), ("styles", "styles"),
                       ("numbering", "numbering"), ("footer1", "footer")):
        ET.SubElement(types, f"{{{CONTENT}}}Override", PartName=f"/word/{name}.xml",
                      ContentType=f"application/vnd.openxmlformats-officedocument.wordprocessingml.{kind}+xml")

    package = {
        "[Content_Types].xml": types,
        "_rels/.rels": relationships([("rId1", "officeDocument", "word/document.xml")]),
        "word/document.xml": doc,
        "word/styles.xml": styles_xml(),
        "word/numbering.xml": numbering_xml(),
        "word/footer1.xml": footer_xml(),
        "word/_rels/document.xml.rels": relationships([
            ("rId1", "styles", "styles.xml"),
            ("rId2", "numbering", "numbering.xml"),
            ("rId3", "footer", "footer1.xml"),
        ] + [(rid, "image", f"media/{name}") for rid, name, data in images]),
    }
    target = source.with_suffix(".docx")
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for name, tree in package.items():
            archive.writestr(name, xml_bytes(tree))
        for rid, name, data in images:
            archive.writestr(f"word/media/{name}", data)
    # Kiểm tra CRC và tính hợp lệ XML cho mọi thành phần vừa ghi.
    with ZipFile(target) as archive:
        broken = archive.testzip()
        if broken:
            raise ValueError(f"Tệp Word lỗi CRC: {broken}")
        for name in archive.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(archive.read(name))
    ns = {"w": W}
    paragraphs = len(doc.findall(".//w:p", ns))
    tables = len(doc.findall(".//w:tbl", ns))
    print(f"OK: {target.name} — {paragraphs} đoạn, {tables} bảng, {len(images)} ảnh, {target.stat().st_size:,} byte")


def main():
    base = Path(__file__).resolve().parent
    sources = []
    for number in ("01", "02", "03"):
        matches = sorted(base.glob(f"{number}_*.md"))
        if len(matches) != 1:
            print(f"Cần đúng một file {number}_*.md; hiện có {len(matches)}. Chưa xuất tài liệu.", file=sys.stderr)
            return 1
        sources.extend(matches)
    for source in sources:
        export(source)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
