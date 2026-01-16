from datetime import datetime

from flask import Blueprint, request, jsonify, session

from app.auth import is_teacher
from app.storage import read_teachers, read_courses, read_schedules, read_approvals, write_approvals
from app.logic import course_by_code_map, extract_course_code, ensure_approval_rows_for_schedule

bp_teacher = Blueprint("teacher", __name__)


@bp_teacher.post("/api/teacher/login")
def api_teacher_login():
    data = request.json or {}
    email = (data.get("email", "") or "").strip().lower()
    pw = (data.get("password", "") or "").strip()

    if not email or not pw:
        return jsonify({"ok": False, "error": "missing_fields"}), 400

    for t in read_teachers():
        if t["teacher_email"] == email and t["password"] == pw:
            session["teacher_email"] = email
            session["teacher_name"] = t.get("teacher_name", "")
            return jsonify(
                {
                    "ok": True,
                    "teacher": {"teacher_email": email, "teacher_name": t.get("teacher_name", "")},
                }
            )

    return jsonify({"ok": False, "error": "bad_login"}), 403


@bp_teacher.post("/api/teacher/logout")
def api_teacher_logout():
    session.pop("teacher_email", None)
    session.pop("teacher_name", None)
    return jsonify({"ok": True})


@bp_teacher.get("/api/teacher/status")
def api_teacher_status():
    if not is_teacher():
        return jsonify({"authed": False})
    return jsonify(
        {
            "authed": True,
            "teacher": {
                "teacher_email": session.get("teacher_email", ""),
                "teacher_name": session.get("teacher_name", ""),
            },
        }
    )


@bp_teacher.get("/api/teacher/roster")
def api_teacher_roster():
    if not is_teacher():
        return jsonify({"error": "not_authorized"}), 403

    teacher_email = (session.get("teacher_email") or "").lower()
    course_map = course_by_code_map()

    my_courses = [c for c in read_courses() if (c.get("teacher_email", "") or "").lower() == teacher_email]
    my_codes = {c["course_code"] for c in my_courses}

    scheds = read_schedules()
    approvals = read_approvals()
    appr_lookup = {(a["student_id"], a["course_code"]): a for a in approvals}

    roster_by_course = {c["course_code"]: {"course": c, "students": []} for c in my_courses}

    for s in scheds:
        sid = s["student_id"]
        sname = s["student_name"]
        grade = s["grade_level"]

        selected = (s.get("academic_courses") or []) + (s.get("elective_courses") or [])
        codes = [extract_course_code(x) for x in selected]

        for code in codes:
            if code not in my_codes:
                continue

            # ensure pending rows exist for approval-required courses
            if course_map.get(code, {}).get("requires_approval", False):
                ensure_approval_rows_for_schedule(sid, codes)

            appr = appr_lookup.get((sid, code))
            status = (
                (appr.get("status") if appr else None)
                or ("pending" if course_map.get(code, {}).get("requires_approval", False) else "approved")
            )
            status = (status or "pending").lower()

            roster_by_course[code]["students"].append(
                {
                    "student_id": sid,
                    "student_name": sname,
                    "grade_level": grade,
                    "approval_status": status,
                }
            )

    for code, block in roster_by_course.items():
        block["students"].sort(key=lambda x: x["student_name"].lower())

    roster_list = list(roster_by_course.values())
    roster_list.sort(key=lambda b: (b["course"]["course_name"] or "").lower())

    return jsonify({"courses": roster_list})


@bp_teacher.post("/api/teacher/set_approval")
def api_teacher_set_approval():
    if not is_teacher():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    student_id = (data.get("student_id", "") or "").strip()
    course_code = (data.get("course_code", "") or "").strip()
    status = (data.get("status", "") or "").strip().lower()
    note = (data.get("note", "") or "").strip()

    if status not in ("approved", "rejected"):
        return jsonify({"error": "bad_status"}), 400
    if not student_id or not course_code:
        return jsonify({"error": "missing_fields"}), 400

    teacher_email = (session.get("teacher_email") or "").lower()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    approvals = read_approvals()
    updated = False
    for a in approvals:
        if a["student_id"] == student_id and a["course_code"] == course_code:
            a["status"] = status
            a["teacher_email"] = teacher_email
            a["updated_at"] = now
            a["note"] = note
            updated = True
            break

    if not updated:
        approvals.append(
            {
                "student_id": student_id,
                "course_code": course_code,
                "status": status,
                "teacher_email": teacher_email,
                "updated_at": now,
                "note": note,
            }
        )

    write_approvals(approvals)
    return jsonify({"ok": True})
