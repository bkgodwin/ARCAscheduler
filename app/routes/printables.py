from datetime import datetime
from io import BytesIO

from flask import Blueprint, session, request, Response
from app.auth import is_counselor, is_student
from app.logic import (
    get_student_by_id,
    get_schedule_for_student,
    extract_course_code,
    ensure_approval_rows_for_schedule,
    schedule_items_for_student,
)
from app.storage import read_schedules, read_students

# Optional PDF generation: weasyprint is preferred for HTML->PDF.
# If not installed, the endpoint will return 501 with a helpful message.
try:
    from weasyprint import HTML, CSS  # type: ignore

    WEASYPRINT_AVAILABLE = True
except Exception:
    WEASYPRINT_AVAILABLE = False

bp_printables = Blueprint("printables", __name__)


def build_schedule_card_html_for_student(student_id):
    stu = get_student_by_id(student_id)
    sched = get_schedule_for_student(student_id)
    if not stu:
        return None

    if not sched:
        sched = {
            "student_id": stu["student_id"],
            "student_name": stu["student_name"],
            "grade_level": stu["grade_level"],
            "academic_courses": [],
            "elective_courses": [],
            "special_instructions": "",
        }

    selected_codes = [extract_course_code(x) for x in sched["academic_courses"]] + [
        extract_course_code(x) for x in sched["elective_courses"]
    ]
    ensure_approval_rows_for_schedule(student_id, selected_codes)

    academic_items, elective_items = schedule_items_for_student(student_id, sched)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    def badge(item):
        if not item["requires_approval"]:
            return ""
        st = (item["approval_status"] or "pending").lower()
        if st == "approved":
            return " <span style='font-weight:700;color:#166534;'>[APPROVED]</span>"
        if st == "rejected":
            return " <span style='font-weight:700;color:#991b1b;'>[REJECTED]</span>"
        return " <span style='font-weight:700;color:#a16207;'>[PENDING]</span>"

    html = []
    html.append("<div class='card'>")

    html.append("<div class='hdr'>")
    html.append("<div>")
    html.append(f"<div class='studentname'>{sched['student_name']}</div>")
    html.append(f"<div>ID: {sched['student_id']}</div>")
    html.append(f"<div>Grade: {sched['grade_level']}</div>")
    html.append("</div>")
    html.append(
        "<div style='text-align:right;font-size:0.8rem;'>Acadiana Renaissance Charter Academy<br>Course Request Summary</div>"
    )
    html.append("</div>")

    html.append("<div class='blocktitle'>Requested Academic Courses</div><ul>")
    if academic_items:
        for it in academic_items:
            html.append(f"<li>{it['display']}{badge(it)}</li>")
    else:
        html.append("<li>(none selected)</li>")
    html.append("</ul>")

    html.append("<div class='blocktitle'>Elective / CTE Priorities</div><ol>")
    if elective_items:
        for it in elective_items:
            html.append(f"<li>{it['display']}{badge(it)}</li>")
    else:
        html.append("<li>(none selected)</li>")
    html.append("</ol>")

    html.append("<div class='blocktitle'>Special Instructions / Notes to Counselor</div>")
    special = (sched.get("special_instructions", "") or "").strip()
    html.append(f"<div class='notesBox'>{special if special else '(none)'}</div>")

    html.append("<div class='siglabel'>Counselor Approval / Notes:</div>")
    html.append("<div class='sigline'></div>")

    html.append(f"<div class='footer'>Generated: {now}</div>")
    html.append("</div>")  # .card
    # Return the inner HTML for the card (wrapped later)
    return "".join(html)


@bp_printables.get("/schedule_card/<student_id>")
def schedule_card(student_id):
    # existing behavior: students may view their own card, counselors can view any
    if not is_counselor():
        if (not is_student()) or session.get("student_id") != student_id:
            return "Not authorized", 403

    card_html_inner = build_schedule_card_html_for_student(student_id)
    if card_html_inner is None:
        return "Student not found", 404

    full_html = []
    full_html.append("<html><head><title>Schedule Card</title><style>")
    full_html.append(
        """
    body{font-family:sans-serif;background:#fff;color:#000;padding:24px;}
    .card{border:2px solid #000;border-radius:8px;padding:20px;max-width:650px;margin-bottom:18px;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;}
    .studentname{font-size:1.25rem;font-weight:600;}
    .blocktitle{margin:16px 0 8px 0;font-size:1.1rem;font-weight:600;border-bottom:1px solid #000;padding-bottom:4px;}
    ul,ol{margin-top:4px;margin-bottom:12px;padding-left:20px;font-size:0.95rem;}
    .footer{font-size:0.8rem;color:#333;border-top:1px solid #000;margin-top:16px;padding-top:8px;}
    .siglabel{margin-top:16px;font-size:0.9rem;}
    .sigline{border-top:1px solid #000;width:250px;height:30px;}
    .notesBox{border:1px solid #000;border-radius:4px;padding:8px;font-size:0.9rem;min-height:40px;white-space:pre-wrap;}
    """
    )
    full_html.append("</style></head><body>")
    full_html.append(card_html_inner)
    full_html.append("</body></html>")
    return "".join(full_html)


@bp_printables.post("/api/printables/schedule_cards_pdf")
def schedule_cards_pdf():
    """
    POST JSON payload:
      { "student_ids": ["id1", "id2", ...] }
    OR
      { "all": true }  -> include all students (in students.csv)
    Response: application/pdf (single PDF containing one card per student)
    Requires weasyprint installed. If unavailable returns 501.
    Only accessible to counselors.
    """
    if not is_counselor():
        return "Not authorized", 403

    if not WEASYPRINT_AVAILABLE:
        return (
            "PDF generation is not available on this server (weasyprint not installed). Install weasyprint to enable PDF export.",
            501,
        )

    data = request.json or {}
    student_ids = data.get("student_ids")
    include_all = bool(data.get("all", False))

    ids = []
    if include_all:
        # include every student
        students = read_students()
        ids = [s["student_id"] for s in students]
    elif isinstance(student_ids, list):
        ids = [str(x) for x in student_ids if x]
    else:
        return "No student_ids provided", 400

    if not ids:
        return "No students selected", 400

    # Build full HTML document concatenating cards with page breaks
    pieces = []
    pieces.append("<html><head><meta charset='utf-8'><style>")
    pieces.append(
        """
    @page { size: auto; margin: 12mm; }
    body{font-family:sans-serif;color:#000;}
    .card{border:2px solid #000;border-radius:6px;padding:16px;max-width:700px;margin:0 auto 18px auto;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;}
    .studentname{font-size:1.15rem;font-weight:600;}
    .blocktitle{margin:12px 0 6px 0;font-size:1rem;font-weight:600;border-bottom:1px solid #000;padding-bottom:4px;}
    ul,ol{margin-top:4px;margin-bottom:12px;padding-left:20px;font-size:0.95rem;}
    .footer{font-size:0.8rem;color:#333;border-top:1px solid #000;margin-top:12px;padding-top:6px;}
    .siglabel{margin-top:12px;font-size:0.9rem;}
    .sigline{border-top:1px solid #000;width:230px;height:28px;}
    .notesBox{border:1px solid #000;border-radius:4px;padding:8px;font-size:0.9rem;min-height:36px;white-space:pre-wrap;}
    .page-break{page-break-after:always;}
    """
    )
    pieces.append("</style></head><body>")

    # render each card
    for idx, sid in enumerate(ids):
        card_inner = build_schedule_card_html_for_student(sid)
        if not card_inner:
            # render a small placeholder for missing student
            card_inner = f"<div class='card'><div class='studentname'>Unknown student: {sid}</div></div>"
        pieces.append(card_inner)
        # add page break except after last
        if idx != len(ids) - 1:
            pieces.append("<div class='page-break'></div>")

    pieces.append("</body></html>")
    full_html = "".join(pieces)

    # Generate PDF bytes
    try:
        html_obj = HTML(string=full_html)
        css = CSS(string="@page { size: A4; margin: 12mm; }")
        pdf_bytes = html_obj.write_pdf(stylesheets=[css])
    except Exception as e:
        return f"Failed to generate PDF: {e}", 500

    # Return PDF response for download
    return Response(pdf_bytes, mimetype="application/pdf", headers={"Content-Disposition": "attachment; filename=schedule_cards.pdf"})