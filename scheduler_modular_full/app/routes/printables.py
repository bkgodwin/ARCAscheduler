from datetime import datetime

from flask import Blueprint, session

from app.auth import is_counselor, is_student
from app.logic import (
    get_student_by_id,
    get_schedule_for_student,
    extract_course_code,
    ensure_approval_rows_for_schedule,
    schedule_items_for_student,
)
from app.storage import read_schedules

bp_printables = Blueprint("printables", __name__)


@bp_printables.get("/schedule_card/<student_id>")
def schedule_card(student_id):
    if not is_counselor():
        if (not is_student()) or session.get("student_id") != student_id:
            return "Not authorized", 403

    stu = get_student_by_id(student_id)
    sched = get_schedule_for_student(student_id)
    if not stu:
        return "Student not found", 404

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
    html.append("<html><head><title>Schedule Card</title><style>")
    html.append(
        """
    body{font-family:sans-serif;background:#fff;color:#000;padding:24px;}
    .card{border:2px solid #000;border-radius:8px;padding:20px;max-width:650px;}
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
    html.append("</style></head><body><div class='card'>")

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
    html.append("</div></body></html>")
    return "".join(html)


@bp_printables.get("/roster/<course_code>")
def roster(course_code):
    if not is_counselor():
        return "Not authorized", 403

    cc_low = (course_code or "").lower()
    scheds = read_schedules()
    taking = []
    for s in scheds:
        hit = False
        for ac in s["academic_courses"]:
            if cc_low in (ac or "").lower():
                hit = True
                break
        if not hit:
            for el in s["elective_courses"]:
                if cc_low in (el or "").lower():
                    hit = True
                    break
        if hit:
            taking.append(s)

    taking.sort(key=lambda x: (x["student_name"] or "").lower())

    html = [
        "<html><head><title>Roster</title><style>",
        "body{font-family:sans-serif;color:#000;padding:20px;}",
        "table{border-collapse:collapse;width:100%;}",
        "th,td{border:1px solid #000;padding:6px;text-align:left;}",
        "h1{font-size:1.2rem;margin-top:0;}</style></head><body>",
    ]
    html.append(f"<h1>Roster for {course_code}</h1>")
    html.append("<table><tr><th>ID</th><th>Name</th><th>Grade</th></tr>")
    for s in taking:
        html.append(
            f"<tr><td>{s['student_id']}</td><td>{s['student_name']}</td><td>{s['grade_level']}</td></tr>"
        )
    html.append("</table></body></html>")
    return "".join(html)
