import os
import sys
import re
from datetime import datetime, timedelta
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from PIL import Image, ImageDraw, ImageFont

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import api

def get_schedule(custom_sched=None):
    if custom_sched:
        return custom_sched
    return api.compute_timeline_schedule(api.sprint_tasks, api.timeline_config)

def build_excel_workbook(custom_sched=None):
    sched = get_schedule(custom_sched)
    tasks = list(sched.get('tasks', []))
    sprints = list(sched.get('sprints', []))
    proj_start_str = sched.get('project_start', '2026-10-08')
    proj_end_str = sched.get('project_end', '2026-12-18')
    skipped_holidays = sched.get('all_skipped_holidays', [])

    def parse_task_id(t):
        raw = str(t.get('id') or t.get('story_id') or '')
        m = re.search(r'(?:US|STORY|TASK)?[-_\s]*(\d+)(?:\.(\d+))?', raw, re.IGNORECASE)
        if m:
            main_n = int(m.group(1))
            sub_n = int(m.group(2)) if m.group(2) is not None else -1
            return (main_n, sub_n, raw)
        return (9999, -1, raw)
    tasks.sort(key=parse_task_id)

    proj_start = datetime.strptime(proj_start_str, "%Y-%m-%d").date()
    proj_end = datetime.strptime(proj_end_str, "%Y-%m-%d").date()
    total_calendar_days = (proj_end - proj_start).days + 1
    holiday_map = {h['date']: h.get('name', 'Holiday') for h in skipped_holidays if isinstance(h, dict)}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Gantt Schedule"
    ws.views.sheetView[0].showGridLines = True

    # Palette
    EXCEL_GREEN = "107C41"
    EXCEL_DARK_GREEN = "0A5325"
    HEADER_TEXT_COLOR = "FFFFFF"
    BORDER_COLOR = "CBD5E1"
    WEEKEND_FILL = "F1F5F9"
    HOLIDAY_FILL = "FEF3C7"
    GANTT_BAR_FILL = "107C41"
    GANTT_BAR_BORDER = "0A5325"

    thin_border = Border(
        left=Side(style='thin', color=BORDER_COLOR),
        right=Side(style='thin', color=BORDER_COLOR),
        top=Side(style='thin', color=BORDER_COLOR),
        bottom=Side(style='thin', color=BORDER_COLOR)
    )

    # Title Banner (Row 1-2)
    ws.merge_cells("A1:H2")
    title_cell = ws["A1"]
    title_cell.value = f"MICROSOFT EXCEL AGILE GANTT CHART & SPRINT ROADMAP\nProject Timeline: {proj_start_str} to {proj_end_str} ({total_calendar_days} Calendar Days) • Velocity: {api.timeline_config.get('velocity_per_sprint', 35)} pts"
    title_cell.font = Font(name="Segoe UI", size=13, bold=True, color=HEADER_TEXT_COLOR)
    title_cell.fill = PatternFill(start_color=EXCEL_GREEN, end_color=EXCEL_GREEN, fill_type="solid")
    title_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)

    # KPI summary in row 3
    total_pts = sum(t.get('points', 0) for t in tasks)
    total_hrs = sum(t.get('hours', 0) for t in tasks)
    ws.merge_cells("A3:H3")
    kpi_cell = ws["A3"]
    kpi_cell.value = f"Total Deliverables: {len(tasks)} Stories | Total Effort: {total_pts} Story Points ({total_hrs} hrs) | {len(sprints)} Sprints ({api.timeline_config.get('sprint_duration_weeks', 2)} Wks/Sprint) | Holidays Excluded: {len(skipped_holidays)}"
    kpi_cell.font = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    kpi_cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    kpi_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    # Table Column Headers (Row 4)
    table_headers = [
        ("WBS ID", 12),
        ("USER STORY / REQUIREMENT", 48),
        ("SPRINT", 12),
        ("PRIORITY", 14),
        ("START DATE", 14),
        ("END DATE", 14),
        ("DAYS", 10),
        ("STORY POINTS", 14)
    ]

    for col_idx, (hdr, col_w) in enumerate(table_headers, start=1):
        cell = ws.cell(row=4, column=col_idx)
        cell.value = hdr
        cell.font = Font(name="Segoe UI", size=10, bold=True, color=HEADER_TEXT_COLOR)
        cell.fill = PatternFill(start_color=EXCEL_GREEN, end_color=EXCEL_GREEN, fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = col_w

    # Calendar Timeline Headers starting at col 9 (Row 4)
    cal_start_col = 9
    for d_idx in range(total_calendar_days):
        curr_d = proj_start + timedelta(days=d_idx)
        curr_str = curr_d.strftime("%Y-%m-%d")
        col_num = cal_start_col + d_idx
        col_letter = get_column_letter(col_num)
        ws.column_dimensions[col_letter].width = 5.5

        cell = ws.cell(row=4, column=col_num)
        is_wknd = curr_d.weekday() in (5, 6)
        is_hday = curr_str in holiday_map

        cell.value = f"{curr_d.strftime('%b %d')}\n{curr_d.strftime('%a')}"
        cell.font = Font(name="Segoe UI", size=8, bold=True, color=HEADER_TEXT_COLOR if not is_hday else "78350F")
        if is_hday:
            cell.fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
        elif is_wknd:
            cell.fill = PatternFill(start_color=EXCEL_DARK_GREEN, end_color=EXCEL_DARK_GREEN, fill_type="solid")
        else:
            cell.fill = PatternFill(start_color="0F7937", end_color="0F7937", fill_type="solid")

        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    # Priority colors
    prio_colors = {
        "CRITICAL": {"fill": "FEE2E2", "text": "991B1B"},
        "HIGH": {"fill": "FEF3C7", "text": "92400E"},
        "MEDIUM": {"fill": "E0F2FE", "text": "0369A1"},
        "LOW": {"fill": "D1FAE5", "text": "065F46"}
    }

    # Data Rows
    row_start = 5
    for idx, t in enumerate(tasks):
        r = row_start + idx
        ws.row_dimensions[r].height = 24
        t_start = datetime.strptime(t['start_date'], "%Y-%m-%d").date()
        t_end = datetime.strptime(t['end_date'], "%Y-%m-%d").date()
        t_dur = (t_end - t_start).days + 1
        tier = t.get('priority_tier', 'MEDIUM')
        p_info = prio_colors.get(tier, prio_colors['MEDIUM'])

        # Col 1: WBS ID
        c1 = ws.cell(row=r, column=1, value=t['id'])
        c1.font = Font(name="Consolas", size=10, bold=True, color="0F7937")
        c1.alignment = Alignment(horizontal="center", vertical="center")
        c1.border = thin_border

        # Col 2: Title
        c2 = ws.cell(row=r, column=2, value=t['title'])
        c2.font = Font(name="Segoe UI", size=10, bold=False, color="1E293B")
        c2.alignment = Alignment(horizontal="left", vertical="center")
        c2.border = thin_border

        # Col 3: Sprint
        c3 = ws.cell(row=r, column=3, value=f"Sprint {t['sprint_number']}")
        c3.font = Font(name="Segoe UI", size=9, color="475569")
        c3.alignment = Alignment(horizontal="center", vertical="center")
        c3.border = thin_border

        # Col 4: Priority
        c4 = ws.cell(row=r, column=4, value=tier)
        c4.font = Font(name="Segoe UI", size=9, bold=True, color=p_info['text'])
        c4.fill = PatternFill(start_color=p_info['fill'], end_color=p_info['fill'], fill_type="solid")
        c4.alignment = Alignment(horizontal="center", vertical="center")
        c4.border = thin_border

        # Col 5: Start Date
        c5 = ws.cell(row=r, column=5, value=t['start_date'])
        c5.font = Font(name="Segoe UI", size=9, color="475569")
        c5.alignment = Alignment(horizontal="center", vertical="center")
        c5.border = thin_border

        # Col 6: End Date
        c6 = ws.cell(row=r, column=6, value=t['end_date'])
        c6.font = Font(name="Segoe UI", size=9, color="475569")
        c6.alignment = Alignment(horizontal="center", vertical="center")
        c6.border = thin_border

        # Col 7: Duration Days
        c7 = ws.cell(row=r, column=7, value=f"{t_dur}d")
        c7.font = Font(name="Segoe UI", size=9, bold=True, color="0F172A")
        c7.alignment = Alignment(horizontal="center", vertical="center")
        c7.border = thin_border

        # Col 8: Points
        c8 = ws.cell(row=r, column=8, value=t.get('points', 3))
        c8.font = Font(name="Segoe UI", size=9, bold=True, color="4338CA")
        c8.alignment = Alignment(horizontal="center", vertical="center")
        c8.border = thin_border

        # Calendar cells
        for d_idx in range(total_calendar_days):
            curr_d = proj_start + timedelta(days=d_idx)
            curr_str = curr_d.strftime("%Y-%m-%d")
            col_num = cal_start_col + d_idx
            cell = ws.cell(row=r, column=col_num)
            cell.border = thin_border

            is_wknd = curr_d.weekday() in (5, 6)
            is_hday = curr_str in holiday_map

            if t_start <= curr_d <= t_end:
                if is_hday:
                    cell.fill = PatternFill(start_color=HOLIDAY_FILL, end_color=HOLIDAY_FILL, fill_type="solid")
                    cell.value = "⏸️ Off"
                    cell.font = Font(name="Segoe UI", size=7, bold=True, color="B45309")
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                elif is_wknd:
                    cell.fill = PatternFill(start_color=WEEKEND_FILL, end_color=WEEKEND_FILL, fill_type="solid")
                else:
                    # Active Working Day Gantt Bar
                    cell.fill = PatternFill(start_color=GANTT_BAR_FILL, end_color=GANTT_BAR_FILL, fill_type="solid")
                    if curr_d == t_start or (curr_d.weekday() == 0 and t_start < curr_d):
                        cell.value = f"{t['id']} ({t.get('points', 3)}p)"
                        cell.font = Font(name="Segoe UI", size=8, bold=True, color="FFFFFF")
                        cell.alignment = Alignment(horizontal="left", vertical="center")
            else:
                if is_hday:
                    cell.fill = PatternFill(start_color=HOLIDAY_FILL, end_color=HOLIDAY_FILL, fill_type="solid")
                elif is_wknd:
                    cell.fill = PatternFill(start_color=WEEKEND_FILL, end_color=WEEKEND_FILL, fill_type="solid")

    # Freeze panes at col 9, row 5
    ws.freeze_panes = "I5"
    return wb

def generate_all(custom_sched=None):
    sched = get_schedule(custom_sched)
    tasks = list(sched.get('tasks', []))
    sprints = list(sched.get('sprints', []))
    proj_start_str = sched.get('project_start', '2026-10-08')
    proj_end_str = sched.get('project_end', '2026-12-18')
    skipped_holidays = sched.get('all_skipped_holidays', [])

    def parse_task_id(t):
        raw = str(t.get('id') or t.get('story_id') or '')
        m = re.search(r'(?:US|STORY|TASK)?[-_\s]*(\d+)(?:\.(\d+))?', raw, re.IGNORECASE)
        if m:
            main_n = int(m.group(1))
            sub_n = int(m.group(2)) if m.group(2) is not None else -1
            return (main_n, sub_n, raw)
        return (9999, -1, raw)
    tasks.sort(key=parse_task_id)

    proj_start = datetime.strptime(proj_start_str, "%Y-%m-%d").date()
    proj_end = datetime.strptime(proj_end_str, "%Y-%m-%d").date()
    total_calendar_days = (proj_end - proj_start).days + 1
    holiday_map = {h['date']: h.get('name', 'Holiday') for h in skipped_holidays if isinstance(h, dict)}

    export_dirs = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "exports")),
        r"C:\Users\kavee\.gemini\antigravity\brain\98a7acc4-fd3d-416b-9c57-db59761b35d2"
    ]
    for d in export_dirs:
        os.makedirs(d, exist_ok=True)

    # 1. SAVE EXCEL (.XLSX)
    wb = build_excel_workbook(sched)
    for d in export_dirs:
        try:
            xlsx_path = os.path.join(d, "Agile_Sprint_Gantt_Chart.xlsx")
            wb.save(xlsx_path)
            print(f"[OK] Saved Excel file to: {xlsx_path}")
        except Exception as e:
            print(f"[WARN] Error saving Excel: {e}")

    # =========================================================================
    # 2. GENERATE DRAW.IO (.DRAWIO) DIAGRAM
    # =========================================================================
    tier_styles = {
        "CRITICAL": "fillColor=#E11D48;strokeColor=#BE123C;fontColor=#ffffff;",
        "HIGH": "fillColor=#D97706;strokeColor=#B45309;fontColor=#ffffff;",
        "MEDIUM": "fillColor=#0284C7;strokeColor=#0369A1;fontColor=#ffffff;",
        "LOW": "fillColor=#059669;strokeColor=#047857;fontColor=#ffffff;"
    }

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="{datetime.now().isoformat()}" agent="Agile-Sprint-Optimizer" version="21.0.0" type="device">
  <diagram id="agile-gantt-chart" name="Agile Sprint Gantt Chart">
    <mxGraphModel dx="1422" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2000" pageHeight="1400" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="hdr_banner" value="&lt;b&gt;MICROSOFT EXCEL AGILE GANTT CHART &amp;amp; SPRINT ROADMAP&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size: 11px;&quot;&gt;Project Timeline: {proj_start_str} to {proj_end_str} | Buffer: {api.timeline_config.get('buffer_percentage', 10)}% | Holidays Skipped: {len(skipped_holidays)}&lt;/font&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#107C41;strokeColor=#0A5325;fontColor=#ffffff;align=center;fontSize=15;" vertex="1" parent="1">
          <mxGeometry x="40" y="30" width="1450" height="60" as="geometry" />
        </mxCell>
"""
    day_width = 34
    for s_idx, sp in enumerate(sprints):
        sp_start = datetime.strptime(sp['start_date'], "%Y-%m-%d").date()
        sp_end = datetime.strptime(sp['end_date'], "%Y-%m-%d").date()
        days_from_start = (sp_start - proj_start).days
        sp_dur_days = (sp_end - sp_start).days + 1
        sp_x = 480 + (days_from_start * day_width)
        sp_w = sp_dur_days * day_width

        xml += f"""
        <mxCell id="sprint_band_{sp['sprint_number']}" value="&lt;b&gt;{sp['name']}&lt;/b&gt;&lt;br&gt;({sp['start_date']} - {sp['end_date']})&lt;br&gt;{sp['total_points']} pts / {sp['working_days']} working days" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#F1F5F9;strokeColor=#94A3B8;fontColor=#0F172A;align=center;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="{sp_x}" y="100" width="{sp_w}" height="45" as="geometry" />
        </mxCell>
"""

    current_y = 160
    for idx, task in enumerate(tasks):
        task_y = current_y + (idx * 55)
        t_start = datetime.strptime(task['start_date'], "%Y-%m-%d").date()
        t_end = datetime.strptime(task['end_date'], "%Y-%m-%d").date()
        diff_days = (t_start - proj_start).days
        dur_days = (t_end - t_start).days + 1

        bar_x = 480 + (diff_days * day_width)
        bar_w = max(70, dur_days * day_width)
        style = tier_styles.get(task.get('priority_tier', 'MEDIUM'), tier_styles['MEDIUM'])
        clean_title = (task.get('title', '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        holiday_note = f" (⚠️ {len(task.get('holidays', []))} holiday)" if task.get('holiday_affected') else ""

        xml += f"""
        <mxCell id="lbl_{task['id']}" value="&lt;b&gt;{task['id']}&lt;/b&gt;: {clean_title} &lt;br&gt;&lt;i&gt;Sprint {task['sprint_number']} | {task['points']} pts ({task['hours']}h) | {task['start_date']} to {task['end_date']}{holiday_note}&lt;/i&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1E293B;strokeColor=#334155;fontColor=#F8FAFC;align=left;spacingLeft=10;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="40" y="{task_y}" width="420" height="42" as="geometry" />
        </mxCell>
        <mxCell id="{task['id']}" value="&lt;b&gt;{task['id']}&lt;/b&gt; ({task['points']} pts)" style="rounded=1;whiteSpace=wrap;html=1;{style}fontSize=11;align=center;" vertex="1" parent="1">
          <mxGeometry x="{bar_x}" y="{task_y + 4}" width="{bar_w}" height="34" as="geometry" />
        </mxCell>
"""
        for dep_idx, dep_id in enumerate(task.get('dependencies', [])):
            xml += f"""
        <mxCell id="edge_{dep_id}_{task['id']}_{dep_idx}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#F59E0B;strokeWidth=2;endArrow=classic;dashed=1;" edge="1" parent="1" source="{dep_id}" target="{task['id']}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
"""

    xml += """
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""

    for d in export_dirs:
        drawio_path = os.path.join(d, "Agile_Sprint_Gantt_Chart.drawio")
        with open(drawio_path, "w", encoding="utf-8") as f:
            f.write(xml)
        print(f"[OK] Saved Draw.io file to: {drawio_path}")

    # =========================================================================
    # 3. GENERATE HIGH-RES PNG GANTT IMAGE
    # =========================================================================
    row_height = 38
    header_height = 160
    tbl_hdr_h = 42
    footer_height = 55
    total_height = header_height + tbl_hdr_h + (len(tasks) * row_height) + footer_height

    col_w = {
        'id': 80,
        'title': 440,
        'sprint': 85,
        'priority': 95,
        'start': 95,
        'end': 95,
        'days': 65
    }
    left_table_w = sum(col_w.values())
    day_w = max(24, min(38, int(1050 / total_calendar_days)))
    grid_w = day_w * total_calendar_days
    total_width = left_table_w + grid_w + 30

    img = Image.new('RGB', (total_width, total_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Standard system fonts or default
    try:
        f_title = ImageFont.truetype("segoeui.ttf", 16)
        f_sub = ImageFont.truetype("segoeui.ttf", 11)
        f_hdr = ImageFont.truetype("segoeuib.ttf", 11)
        f_body = ImageFont.truetype("segoeui.ttf", 11)
        f_mono = ImageFont.truetype("consola.ttf", 11)
        f_small = ImageFont.truetype("segoeuib.ttf", 9)
    except Exception:
        f_title = f_sub = f_hdr = f_body = f_mono = f_small = ImageFont.load_default()

    # Top Excel Header Bar
    draw.rectangle([(0, 0), (total_width, 54)], fill=(16, 124, 65)) # #107C41
    draw.text((20, 10), "MICROSOFT EXCEL AGILE GANTT CHART & SPRINT ROADMAP", fill=(255, 255, 255), font=f_title)
    draw.text((20, 32), f"Project Delivery: {proj_start_str} to {proj_end_str} • Natural WBS 1 to N Sequential Hierarchy • Zero Columns Omitted", fill=(209, 250, 229), font=f_sub)

    # KPI Ribbon
    draw.rectangle([(0, 54), (total_width, 160)], fill=(248, 250, 252))
    draw.line([(0, 160), (total_width, 160)], fill=(226, 232, 240), width=1)

    kpi_cards = [
        ("DELIVERY ROADMAP", f"{proj_start_str}  ➔  {proj_end_str}", f"{total_calendar_days} Calendar Days"),
        ("TOTAL DELIVERABLES", f"{len(tasks)} User Stories", f"{total_pts} Points • {total_hrs}h Effort"),
        ("SPRINT CADENCE", f"{len(sprints)} Sprints ({api.timeline_config.get('sprint_duration_weeks', 2)} Wks/Sprint)", f"Velocity: {api.timeline_config.get('velocity_per_sprint', 35)} pts"),
        ("WORKING CALENDAR", f"{sched.get('total_working_days', 30)} Business Days", f"{len(skipped_holidays)} Excluded Holidays")
    ]
    card_w = int((total_width - 40 - (len(kpi_cards) - 1) * 12) / len(kpi_cards))
    for c_i, (c_label, c_val, c_sub) in enumerate(kpi_cards):
        cx = 20 + c_i * (card_w + 12)
        draw.rounded_rectangle([(cx, 64), (cx + card_w, 148)], radius=6, fill=(255, 255, 255), outline=(226, 232, 240))
        draw.text((cx + 12, 74), c_label, fill=(100, 116, 139), font=f_small)
        draw.text((cx + 12, 94), c_val, fill=(15, 23, 42), font=f_hdr)
        draw.text((cx + 12, 118), c_sub, fill=(16, 124, 65), font=f_sub)

    # Table Header Row (Left Table)
    tbl_top = header_height
    draw.rectangle([(0, tbl_top), (left_table_w, tbl_top + tbl_hdr_h)], fill=(16, 124, 65))
    cur_x = 16
    draw.text((cur_x, tbl_top + 14), "WBS ID", fill=(255, 255, 255), font=f_hdr); cur_x += col_w['id']
    draw.text((cur_x, tbl_top + 14), "USER STORY / REQUIREMENT", fill=(255, 255, 255), font=f_hdr); cur_x += col_w['title']
    draw.text((cur_x, tbl_top + 14), "SPRINT", fill=(255, 255, 255), font=f_hdr); cur_x += col_w['sprint']
    draw.text((cur_x, tbl_top + 14), "PRIORITY", fill=(255, 255, 255), font=f_hdr); cur_x += col_w['priority']
    draw.text((cur_x, tbl_top + 14), "START", fill=(255, 255, 255), font=f_hdr); cur_x += col_w['start']
    draw.text((cur_x, tbl_top + 14), "END", fill=(255, 255, 255), font=f_hdr); cur_x += col_w['end']
    draw.text((cur_x, tbl_top + 14), "DAYS", fill=(255, 255, 255), font=f_hdr)

    # Timeline Header (Right side)
    grid_left = left_table_w
    draw.rectangle([(grid_left, tbl_top), (grid_left + grid_w, tbl_top + 20)], fill=(10, 83, 37))
    draw.rectangle([(grid_left, tbl_top + 20), (grid_left + grid_w, tbl_top + tbl_hdr_h)], fill=(15, 121, 55))

    for d_i in range(total_calendar_days):
        c_date = proj_start + timedelta(days=d_i)
        c_str = c_date.strftime("%Y-%m-%d")
        dx = grid_left + d_i * day_w
        is_wknd = c_date.weekday() in (5, 6)
        is_hday = c_str in holiday_map

        if d_i % 7 == 0:
            draw.text((dx + 3, tbl_top + 3), f"WK {int(d_i/7)+1}: {c_date.strftime('%b %d')}", fill=(255, 255, 255), font=f_small)

        if is_hday:
            draw.rectangle([(dx, tbl_top + 20), (dx + day_w, tbl_top + tbl_hdr_h)], fill=(245, 158, 11))
            draw.text((dx + 3, tbl_top + 24), str(c_date.day), fill=(120, 53, 15), font=f_small)
        elif is_wknd:
            draw.rectangle([(dx, tbl_top + 20), (dx + day_w, tbl_top + tbl_hdr_h)], fill=(8, 66, 30))
            draw.text((dx + 3, tbl_top + 24), str(c_date.day), fill=(167, 243, 208), font=f_small)
        else:
            draw.text((dx + 3, tbl_top + 24), str(c_date.day), fill=(255, 255, 255), font=f_small)

    # Data Rows
    prio_rgb = {
        "CRITICAL": {"bg": (254, 226, 226), "text": (153, 27, 27)},
        "HIGH": {"bg": (254, 243, 199), "text": (146, 64, 14)},
        "MEDIUM": {"bg": (224, 242, 254), "text": (3, 105, 161)},
        "LOW": {"bg": (209, 250, 229), "text": (6, 95, 70)}
    }

    for idx, task in enumerate(tasks):
        row_y = tbl_top + tbl_hdr_h + (idx * row_height)
        row_bg = (255, 255, 255) if idx % 2 == 0 else (248, 250, 252)
        draw.rectangle([(0, row_y), (left_table_w, row_y + row_height)], fill=row_bg)

        # Timeline background day columns
        for d_i in range(total_calendar_days):
            c_date = proj_start + timedelta(days=d_i)
            c_str = c_date.strftime("%Y-%m-%d")
            dx = grid_left + d_i * day_w
            is_wknd = c_date.weekday() in (5, 6)
            is_hday = c_str in holiday_map

            if is_hday:
                d_fill = (254, 243, 199)
            elif is_wknd:
                d_fill = (241, 245, 249)
            else:
                d_fill = row_bg

            draw.rectangle([(dx, row_y), (dx + day_w, row_y + row_height)], fill=d_fill)
            draw.line([(dx, row_y), (dx, row_y + row_height)], fill=(226, 232, 240), width=1)

        draw.line([(0, row_y + row_height), (total_width, row_y + row_height)], fill=(226, 232, 240), width=1)
        draw.line([(grid_left, row_y), (grid_left, row_y + row_height)], fill=(16, 124, 65), width=2)

        rx = 16
        # WBS ID
        draw.text((rx, row_y + 11), task['id'], fill=(15, 121, 55), font=f_mono); rx += col_w['id']

        # Title
        t_trunc = task['title'][:54] + "..." if len(task['title']) > 56 else task['title']
        draw.text((rx, row_y + 11), t_trunc, fill=(30, 41, 59), font=f_hdr); rx += col_w['title']

        # Sprint
        draw.text((rx, row_y + 11), f"Sprint {task['sprint_number']}", fill=(71, 85, 105), font=f_body); rx += col_w['sprint']

        # Priority
        tier = task.get('priority_tier', 'MEDIUM')
        p_c = prio_rgb.get(tier, prio_rgb['MEDIUM'])
        draw.rounded_rectangle([(rx, row_y + 8), (rx + 68, row_y + 26)], radius=4, fill=p_c['bg'])
        draw.text((rx + 8, row_y + 10), tier, fill=p_c['text'], font=f_small); rx += col_w['priority']

        # Start Date
        draw.text((rx, row_y + 11), task['start_date'], fill=(71, 85, 105), font=f_body); rx += col_w['start']

        # End Date
        draw.text((rx, row_y + 11), task['end_date'], fill=(71, 85, 105), font=f_body); rx += col_w['end']

        # Days
        t_start = datetime.strptime(task['start_date'], "%Y-%m-%d").date()
        t_end = datetime.strptime(task['end_date'], "%Y-%m-%d").date()
        dur_d = (t_end - t_start).days + 1
        draw.text((rx + 6, row_y + 11), f"{dur_d}d", fill=(15, 23, 42), font=f_hdr); rx += col_w['days']

        # Gantt Bar: Segment strictly across active working days (skipping weekends & holidays)
        task_segments = []
        seg_start = None
        seg_days = 0

        for d_i in range(dur_d):
            c_d = t_start + timedelta(days=d_i)
            c_str = c_d.strftime("%Y-%m-%d")
            is_wknd = c_d.weekday() in (5, 6)
            is_hday = c_str in holiday_map

            if not is_wknd and not is_hday:
                if seg_start is None:
                    seg_start = c_d
                    seg_days = 1
                else:
                    seg_days += 1
            else:
                if seg_start is not None:
                    task_segments.append((seg_start, seg_days))
                    seg_start = None
                    seg_days = 0
        if seg_start is not None:
            task_segments.append((seg_start, seg_days))

        for seg_idx, (s_start, s_len) in enumerate(task_segments):
            s_offset = (s_start - proj_start).days
            s_bar_x = grid_left + (s_offset * day_w) + 2
            s_bar_y = row_y + 8
            s_bar_w = (s_len * day_w) - 4
            s_bar_h = row_height - 16

            draw.rounded_rectangle([(s_bar_x, s_bar_y), (s_bar_x + s_bar_w, s_bar_y + s_bar_h)], radius=4, fill=(16, 124, 65), outline=(11, 83, 44))
            if seg_idx == 0 and s_bar_w > 30:
                draw.text((s_bar_x + 5, s_bar_y + 4), f"{task['id']} ({task.get('points', 3)}p)", fill=(255, 255, 255), font=f_small)
            elif seg_idx > 0 and s_bar_w > 25:
                draw.text((s_bar_x + 5, s_bar_y + 4), f"{task['id']}", fill=(209, 250, 229), font=f_small)

    # Footer
    footer_y = tbl_top + tbl_hdr_h + (len(tasks) * row_height) + 10
    draw.rectangle([(0, footer_y), (total_width, footer_y + footer_height)], fill=(248, 250, 252))
    draw.line([(0, footer_y), (total_width, footer_y)], fill=(226, 232, 240), width=1)
    draw.text((20, footer_y + 18), "EXCEL GANTT LEGEND:", fill=(51, 65, 85), font=f_hdr)

    leg_items = [
        ("Planned Sprint Deliverable", (16, 124, 65), (11, 83, 44)),
        ("Non-Working Weekend", (241, 245, 249), (203, 213, 225)),
        (f"Roadmap Holiday Exclusion ({len(skipped_holidays)} active)", (254, 243, 199), (245, 158, 11))
    ]
    leg_x = 180
    for label, fill_c, out_c in leg_items:
        draw.rounded_rectangle([(leg_x, footer_y + 14), (leg_x + 16, footer_y + 28)], radius=3, fill=fill_c, outline=out_c)
        draw.text((leg_x + 22, footer_y + 16), label, fill=(71, 85, 105), font=f_body)
        leg_x += 240

    draw.text((total_width - 480, footer_y + 16), "Official Microsoft Excel Standard Agile Gantt Template", fill=(100, 116, 139), font=f_hdr)

    for d in export_dirs:
        png_path = os.path.join(d, "Agile_Sprint_Gantt_Chart.png")
        img.save(png_path, "PNG", quality=95)
        print(f"[OK] Saved PNG image to: {png_path}")

if __name__ == "__main__":
    generate_all()
