from flask import Blueprint, request, jsonify, session

from app.auth import is_student
from app.storage import read_students, read_courses, read_settings
from app.logic import (
    get_student_by_id,
    get_schedule_for_student,
    upsert_schedule,
    extract_course_code,
    ensure_approval_rows_for_schedule,
    schedule_items_for_student,
    approval_counts_for_student,
)
from config import MAX_ACADEMIC_COURSES, MAX_ELECTIVE_CHOICES

bp_student = Blueprint("student", __name__)


@bp_student.get("/api/student/find")
def api_student_find():
    q = (request.args.get("q", "") or "").lower().strip()
    out = []
    if len(q) >= 2:
        for s in read_students():
            if q in s["student_name"].lower():
                out.append(
                    {
                        "student_id": s["student_id"],
                        "student_name": s["student_name"],
                        "grade_level": s["grade_level"],
                    }
                )
    return jsonify({"matches": out})


@bp_student.post("/api/student/login")
def api_student_login():
    data = request.json or {}
    sid = (data.get("student_id", "") or "").strip()
    check = (data.get("id_check", "") or "").strip()

    stu = get_student_by_id(sid)
    if not stu:
        return jsonify({"ok": False, "error": "student_not_found"}), 404
    if check != stu["student_id"]:
        return jsonify({"ok": False, "error": "bad_id"}), 403

    session["student_id"] = stu["student_id"]
    return jsonify({"ok": True, "student": stu})


@bp_student.post("/api/student/logout")
def api_student_logout():
    session.pop("student_id", None)
    return jsonify({"ok": True})


@bp_student.get("/api/student/status")
def api_student_status():
    if not is_student():
        return jsonify({"authed": False})

    stu = get_student_by_id(session["student_id"])
    if not stu:
        return jsonify({"authed": False})

    sched = get_schedule_for_student(stu["student_id"])
    if not sched:
        sched = {
            "student_id": stu["student_id"],
            "student_name": stu["student_name"],
            "grade_level": stu["grade_level"],
            "academic_courses": [],
            "elective_courses": [],
            "special_instructions": "",
        }

    settings = read_settings()
    lockmap = settings.get("grade_submission_lock", {})
    allowed = lockmap.get(stu["grade_level"], True)

    selected_codes = [extract_course_code(x) for x in sched["academic_courses"]] + [
        extract_course_code(x) for x in sched["elective_courses"]
    ]
    ensure_approval_rows_for_schedule(stu["student_id"], selected_codes)

    academic_items, elective_items = schedule_items_for_student(stu["student_id"], sched)
    pending_cnt, rejected_cnt = approval_counts_for_student(stu["student_id"], sched)

    return jsonify(
        {
            "authed": True,
            "student": stu,
            "schedule": {
                "academic_courses": sched["academic_courses"],
                "elective_courses": sched["elective_courses"],
                "special_instructions": sched.get("special_instructions", ""),
            },
            "schedule_items": {"academic": academic_items, "elective": elective_items},
            "approval_counts": {"pending": pending_cnt, "rejected": rejected_cnt},
            "can_submit": allowed,
        }
    )


@bp_student.post("/api/student/save_schedule")
def api_student_save_schedule():
    if not is_student():
        return jsonify({"ok": False, "error": "not_authed"}), 403

    stu = get_student_by_id(session["student_id"])
    if not stu:
        return jsonify({"ok": False, "error": "student_not_found"}), 404

    settings = read_settings()
    lockmap = settings.get("grade_submission_lock", {})
    allowed = lockmap.get(stu["grade_level"], True)
    if not allowed:
        return jsonify({"ok": False, "error": "submissions_locked"}), 403

    data = request.json or {}
    academic_list = data.get("academic_courses", []) or []
    elective_list = data.get("elective_courses", []) or []
    special_instructions = data.get("special_instructions", "") or ""

    if len(academic_list) > MAX_ACADEMIC_COURSES:
        return jsonify({"ok": False, "error": "too_many_academic"}), 400
    if len(elective_list) > MAX_ELECTIVE_CHOICES:
        return jsonify({"ok": False, "error": "too_many_electives"}), 400

    upsert_schedule(
        stu["student_id"],
        stu["student_name"],
        stu["grade_level"],
        academic_list,
        elective_list,
        special_instructions,
    )

    selected_codes = [extract_course_code(x) for x in academic_list] + [
        extract_course_code(x) for x in elective_list
    ]
    ensure_approval_rows_for_schedule(stu["student_id"], selected_codes)

    return jsonify({"ok": True})


@bp_student.get("/api/courses")
def api_courses():
    subj = (request.args.get("subject", "") or "").strip().lower()
    grade = (request.args.get("grade", "") or "").strip()
    nameq = (request.args.get("name", "") or "").strip().lower()

    out = []
    for c in read_courses():
        if grade:
            try:
                g = int(grade)
                gmin = int(c["grade_min"]) if c["grade_min"] else g
                gmax = int(c["grade_max"]) if c["grade_max"] else g
                if not (g >= gmin and g <= gmax):
                    continue
            except Exception:
                pass

        if subj and subj not in (c["subject_area"] or "").lower():
            continue

        nm = (c["course_name"] + " " + c["course_code"]).lower()
        if nameq and nameq not in nm:
            continue

        out.append(c)

    return jsonify({"courses": out})
