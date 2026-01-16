import csv
from io import StringIO

from flask import Blueprint, request, Response

from app.auth import is_counselor
from app.storage import read_students, read_schedules
from config import MAX_ACADEMIC_COURSES, MAX_ELECTIVE_CHOICES

bp_exports = Blueprint("exports", __name__)


@bp_exports.get("/api/counselor/export_filtered")
def counselor_export_filtered():
    if not is_counselor():
        return Response("not authorized", status=403)

    q_name = (request.args.get("q_name", "") or "").strip().lower()
    q_grade = (request.args.get("grade", "") or "").strip()
    q_course = (request.args.get("course", "") or "").strip().lower()

    studs = read_students()
    sched_map = {s["student_id"]: s for s in read_schedules()}

    rows = []
    for stu in studs:
        sid = stu["student_id"]
        sch = sched_map.get(sid)
        academic = []
        electives = []
        notes = ""
        if sch:
            academic = sch["academic_courses"]
            electives = sch["elective_courses"]
            notes = sch.get("special_instructions", "")

        rows.append(
            {
                "student_id": sid,
                "student_name": stu["student_name"],
                "grade_level": stu["grade_level"],
                "scheduled": "YES" if sch else "NO",
                "academic": " | ".join(academic),
                "electives": " | ".join(electives),
                "notes": notes,
            }
        )

    if q_name:
        rows = [r for r in rows if q_name in r["student_name"].lower()]
    if q_grade:
        rows = [r for r in rows if r["grade_level"] == q_grade]
    if q_course:
        tmp = []
        for r in rows:
            hay = (r["academic"] + " " + r["electives"]).lower()
            if q_course in hay:
                tmp.append(r)
        rows = tmp

    sio = StringIO()
    w = csv.writer(sio)
    w.writerow(
        [
            "student_id",
            "student_name",
            "grade_level",
            "scheduled",
            "academic_courses",
            "elective_priority",
            "special_instructions",
        ]
    )
    for r in rows:
        w.writerow(
            [
                r["student_id"],
                r["student_name"],
                r["grade_level"],
                r["scheduled"],
                r["academic"],
                r["electives"],
                r["notes"],
            ]
        )

    b = sio.getvalue().encode("utf-8")
    return Response(
        b,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=filtered_export.csv"},
    )


@bp_exports.get("/api/counselor/export_all_schedules")
def counselor_export_all_schedules():
    if not is_counselor():
        return Response("not authorized", status=403)

    scheds = read_schedules()
    sio = StringIO()

    header = ["student_id", "student_name", "grade_level"]
    for i in range(MAX_ACADEMIC_COURSES):
        header.append(f"period_{i+1}")
    for j in range(MAX_ELECTIVE_CHOICES):
        header.append(f"elective_{j+1}")
    header.append("special_instructions")

    w = csv.writer(sio)
    w.writerow(header)
    for s in scheds:
        row = [s["student_id"], s["student_name"], s["grade_level"]]
        for i in range(MAX_ACADEMIC_COURSES):
            row.append(s["academic_courses"][i] if i < len(s["academic_courses"]) else "")
        for j in range(MAX_ELECTIVE_CHOICES):
            row.append(s["elective_courses"][j] if j < len(s["elective_courses"]) else "")
        row.append(s.get("special_instructions", ""))
        w.writerow(row)

    b = sio.getvalue().encode("utf-8")
    return Response(
        b,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_schedules.csv"},
    )
