from flask import Flask, render_template, request, jsonify, send_file
import json
import os
import hashlib
import io
from datetime import datetime
import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side
)
from openpyxl.utils import get_column_letter

app = Flask(__name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'passwords.json')
PIN_FILE  = os.path.join(os.path.dirname(__file__), 'data', 'pin.json')

SALT = 'NregaBot_salt_RAJAT'
DEFAULT_PIN = '1234'

# ── helpers ────────────────────────────────────────────────────────────────────
def hash_pin(pin: str) -> str:
    return hashlib.sha256((pin + SALT).encode()).hexdigest()

def ensure_data_dir():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

def get_stored_pin() -> str:
    ensure_data_dir()
    if os.path.exists(PIN_FILE):
        with open(PIN_FILE) as f:
            return json.load(f).get('hash', hash_pin(DEFAULT_PIN))
    return hash_pin(DEFAULT_PIN)

def save_pin(hashed: str):
    ensure_data_dir()
    with open(PIN_FILE, 'w') as f:
        json.dump({'hash': hashed}, f)

def get_data() -> dict:
    ensure_data_dir()
    if not os.path.exists(DATA_FILE):
        default = get_default_data()
        save_data(default)
        return default
    with open(DATA_FILE) as f:
        return json.load(f)

def save_data(data: dict):
    ensure_data_dir()
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_default_data() -> dict:
    return {
        "categories": [
            {
                "id": "nrega",
                "name": "NREGA",
                "columns": ["P.Code","Panchayat","PS User","PS Pass","Mukhiya User","Mukhiya Pass"],
                "entries": [
                    ["7","BHURKUNDI","346906553","Bhur@007","34795850875","Bhur@007"],
                    ["8","DHAWA","3493233109","Dhawa@008","34795906774","Dhawa@008"],
                    ["14","KASRAYDIH","3425166865","Kasra@014","34798925315","Kasr@014"],
                    ["19","MATIYARA","34926505269","Mati@019","34794751529","Matiy@019"],
                    ["21","PALOJORI","3425185498","Paloj@021","34794546567","Paloj@021"]
                ]
            }
        ]
    }

# ── routes ─────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

# ── PIN API ────────────────────────────────────────────────────────────────────
@app.route('/api/pin/verify', methods=['POST'])
def api_pin_verify():
    body = request.get_json(force=True)
    pin = str(body.get('pin', ''))
    if hash_pin(pin) == get_stored_pin():
        return jsonify({'ok': True})
    return jsonify({'ok': False}), 401

@app.route('/api/pin/change', methods=['POST'])
def api_pin_change():
    body = request.get_json(force=True)
    old_pin  = str(body.get('old_pin', ''))
    new_pin  = str(body.get('new_pin', ''))
    conf_pin = str(body.get('confirm_pin', ''))
    if hash_pin(old_pin) != get_stored_pin():
        return jsonify({'ok': False, 'msg': 'Purana PIN galat hai!'}), 403
    if not new_pin.isdigit() or len(new_pin) != 4:
        return jsonify({'ok': False, 'msg': 'Naya PIN sirf 4 digit ka hona chahiye!'}), 400
    if new_pin != conf_pin:
        return jsonify({'ok': False, 'msg': 'Dono PIN match nahi karte!'}), 400
    save_pin(hash_pin(new_pin))
    return jsonify({'ok': True, 'msg': 'PIN successfully change ho gaya!'})

# ── Data API ───────────────────────────────────────────────────────────────────
@app.route('/api/data', methods=['GET'])
def api_get_data():
    return jsonify(get_data())

@app.route('/api/data', methods=['POST'])
def api_save_data():
    body = request.get_json(force=True)
    save_data(body)
    return jsonify({'ok': True})

# ── Export API ─────────────────────────────────────────────────────────────────
@app.route('/api/export/excel', methods=['GET'])
def api_export_excel():
    data = get_data()
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ── Clean light/professional palette ──────────────────────────────────────
    # Header: dark indigo bg, white text
    HDR_FILL  = PatternFill("solid", fgColor="3730A3")   # indigo-800
    HDR_FONT  = Font(name='Calibri', bold=True, color="FFFFFF", size=11)

    # Title row: indigo-600
    TTL_FILL  = PatternFill("solid", fgColor="4F46E5")
    TTL_FONT  = Font(name='Calibri', bold=True, color="FFFFFF", size=13)

    # Info row: light indigo tint
    INFO_FILL = PatternFill("solid", fgColor="EEF2FF")
    INFO_FONT = Font(name='Calibri', italic=True, color="4338CA", size=9)

    # Data rows: white & very light gray alternating
    WHITE_FILL = PatternFill("solid", fgColor="FFFFFF")
    GRAY_FILL  = PatternFill("solid", fgColor="F9FAFB")

    # Password columns: very light purple tint bg
    PASS_BG   = PatternFill("solid", fgColor="F5F3FF")
    PASS_FONT = Font(name='Consolas', color="4338CA", size=10, bold=False)

    CELL_FONT = Font(name='Calibri', color="111827", size=10)
    BOLD_FONT = Font(name='Calibri', color="111827", size=10, bold=True)

    thin   = Side(style='thin',   color="E5E7EB")
    medium = Side(style='medium', color="C7D2FE")
    BORDER      = Border(left=thin,   right=thin,   top=thin,   bottom=thin)
    HDR_BORDER  = Border(left=medium, right=medium, top=medium, bottom=medium)

    CENTER = Alignment(horizontal='center', vertical='center', wrap_text=False)
    LEFT   = Alignment(horizontal='left',   vertical='center', wrap_text=False)

    for cat in data.get('categories', []):
        ws = wb.create_sheet(title=cat['name'][:31])
        ws.sheet_view.showGridLines = True   # keep gridlines — cleaner for data

        columns = cat.get('columns', [])
        entries = cat.get('entries', [])
        n_cols  = max(len(columns), 1)

        # ── Row 1: Title ────────────────────────────────────────────────────
        ws.merge_cells(start_row=1, start_column=1,
                       end_row=1,   end_column=n_cols)
        tc = ws.cell(row=1, column=1,
                     value=f"Password Manager  —  {cat['name'].upper()}")
        tc.fill = TTL_FILL; tc.font = TTL_FONT; tc.alignment = CENTER
        ws.row_dimensions[1].height = 32

        # ── Row 2: Export info ───────────────────────────────────────────────
        ws.merge_cells(start_row=2, start_column=1,
                       end_row=2,   end_column=n_cols)
        ic = ws.cell(row=2, column=1,
            value=(f"Exported: {datetime.now().strftime('%d %B %Y  %I:%M %p')}"
                   f"   |   Total Entries: {len(entries)}"))
        ic.fill = INFO_FILL; ic.font = INFO_FONT; ic.alignment = CENTER
        ws.row_dimensions[2].height = 18

        # ── Row 3: Column headers ────────────────────────────────────────────
        HDR_ROW = 3
        for j, col in enumerate(columns, start=1):
            c = ws.cell(row=HDR_ROW, column=j, value=col.upper())
            c.fill   = HDR_FILL
            c.font   = HDR_FONT
            c.alignment = CENTER
            c.border = HDR_BORDER
        ws.row_dimensions[HDR_ROW].height = 26

        # ── Data rows ────────────────────────────────────────────────────────
        for i, entry in enumerate(entries):
            row_num = HDR_ROW + 1 + i
            row_fill = WHITE_FILL if i % 2 == 0 else GRAY_FILL
            for j in range(len(columns)):
                val      = entry[j] if j < len(entry) else ''
                col_name = columns[j]
                is_pass  = any(k in col_name.lower()
                               for k in ('pass', 'password', 'pwd', 'secret'))
                c = ws.cell(row=row_num, column=j + 1, value=val)
                c.fill      = PASS_BG   if is_pass else row_fill
                c.font      = PASS_FONT if is_pass else CELL_FONT
                c.alignment = CENTER    if is_pass else LEFT
                c.border    = BORDER
            ws.row_dimensions[row_num].height = 20

        # ── Column widths (auto-fit, no collation) ───────────────────────────
        for j, col in enumerate(columns, start=1):
            col_vals = [str(col)] + [
                str(e[j - 1]) if j - 1 < len(e) else '' for e in entries
            ]
            best = max(len(v) for v in col_vals)
            ws.column_dimensions[get_column_letter(j)].width = min(max(best + 3, 12), 45)

        # ── Freeze header rows ───────────────────────────────────────────────
        ws.freeze_panes = ws.cell(row=HDR_ROW + 1, column=1)

        # ── Auto-filter on header row ────────────────────────────────────────
        if columns:
            ws.auto_filter.ref = (
                f"A{HDR_ROW}:"
                f"{get_column_letter(len(columns))}{HDR_ROW + len(entries)}"
            )

    # ── Summary sheet (index 0) ───────────────────────────────────────────────
    ws_sum = wb.create_sheet(title="Summary", index=0)
    ws_sum.sheet_view.showGridLines = True

    ws_sum.column_dimensions['A'].width = 28
    ws_sum.column_dimensions['B'].width = 16
    ws_sum.column_dimensions['C'].width = 45

    # Title
    ws_sum.merge_cells('A1:C1')
    t = ws_sum.cell(row=1, column=1, value="Password Manager — Export Summary")
    t.fill = TTL_FILL; t.font = TTL_FONT; t.alignment = CENTER
    ws_sum.row_dimensions[1].height = 32

    # Info
    ws_sum.merge_cells('A2:C2')
    d = ws_sum.cell(row=2, column=1,
        value=f"Generated: {datetime.now().strftime('%d %B %Y  %I:%M %p')}")
    d.fill = INFO_FILL; d.font = INFO_FONT; d.alignment = CENTER
    ws_sum.row_dimensions[2].height = 18

    # Header
    for hdr, col in [("Category", 1), ("Total Entries", 2), ("Columns", 3)]:
        c = ws_sum.cell(row=3, column=col, value=hdr.upper())
        c.fill = HDR_FILL; c.font = HDR_FONT
        c.alignment = CENTER; c.border = HDR_BORDER
    ws_sum.row_dimensions[3].height = 26

    # Data
    for i, cat in enumerate(data.get('categories', []), start=4):
        fill = WHITE_FILL if i % 2 == 0 else GRAY_FILL

        c1 = ws_sum.cell(row=i, column=1, value=cat['name'])
        c1.font = BOLD_FONT; c1.fill = fill
        c1.alignment = LEFT; c1.border = BORDER

        c2 = ws_sum.cell(row=i, column=2, value=len(cat.get('entries', [])))
        c2.font = CELL_FONT; c2.fill = fill
        c2.alignment = CENTER; c2.border = BORDER

        c3 = ws_sum.cell(row=i, column=3,
                         value=", ".join(cat.get('columns', [])))
        c3.font = CELL_FONT; c3.fill = fill
        c3.alignment = LEFT; c3.border = BORDER
        ws_sum.row_dimensions[i].height = 20

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"passwords_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(buf, as_attachment=True, download_name=filename,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7730, debug=False)
