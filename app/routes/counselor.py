from flask import Blueprint, request, jsonify, session

from config import COUNSELOR_PASSWORD, DEFAULT_SUBJECT_COLORS, MAX_ACADEMIC_COURSES, MAX_ELECTIVE_CHOICES
from app.auth import is_counselor
from app.storage import (
    read_settings,
    write_settings,
    read_students,
    write_students,
    read_courses,
    write_courses,
    append_course_row,
    read_schedules,
    read_approvals,
    write_approvals,
    STUDENTS_CSV,
    COURSES_CSV,
    TEACHERS_CSV,
    _boolish,
)
from app.logic import (
    approval_counts_for_student,
    get_student_by_id,
    get_schedule_for_student,
    schedule_items_for_student,
    upsert_schedule,
    reset_student_schedule,
    delete_student_record,
    extract_course_code,
    ensure_approval_rows_for_schedule,
    course_by_code_map,
)

bp_counselor = Blueprint("counselor", __name__)


@bp_counselor.post("/api/counselor/login")
def counselor_login():
    data = request.json or {}
    pw = (data.get("password", "") or "").strip()
    if pw == COUNSELOR_PASSWORD:
        session["is_counselor"] = True
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "bad_password"}), 403


@bp_counselor.post("/api/counselor/logout")
def counselor_logout():
    session["is_counselor"] = False
    return jsonify({"ok": True})


@bp_counselor.route("/api/counselor/settings", methods=["GET", "POST"])
def counselor_settings():
    if request.method == "GET":
        st = read_settings()
        if "grade_submission_lock" not in st or not isinstance(st["grade_submission_lock"], dict):
            st["grade_submission_lock"] = {"9": True, "10": True, "11": True, "12": True}
        if "subject_colors" not in st or not isinstance(st["subject_colors"], dict):
            st["subject_colors"] = DEFAULT_SUBJECT_COLORS.copy()
        return jsonify(st)

    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    st = read_settings()

    if "grade_submission_lock" not in st or not isinstance(st["grade_submission_lock"], dict):
        st["grade_submission_lock"] = {"9": True, "10": True, "11": True, "12": True}
    if "subject_colors" not in st or not isinstance(st["subject_colors"], dict):
        st["subject_colors"] = DEFAULT_SUBJECT_COLORS.copy()

    if "grade_submission_lock" in data and isinstance(data["grade_submission_lock"], dict):
        for g, val in data["grade_submission_lock"].items():
            st["grade_submission_lock"][str(g)] = bool(val)

    if "subject_colors" in data and isinstance(data["subject_colors"], dict):
        for subj, col in data["subject_colors"].items():
            st["subject_colors"][subj] = col

    write_settings(st)
    return jsonify({"ok": True, "settings": st})


@bp_counselor.post("/api/counselor/upload_csv")
def counselor_upload_csv():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    if "studentsCsv" in request.files:
        request.files["studentsCsv"].save(STUDENTS_CSV)
    if "coursesCsv" in request.files:
        request.files["coursesCsv"].save(COURSES_CSV)
    if "teachersCsv" in request.files:
        request.files["teachersCsv"].save(TEACHERS_CSV)

    return jsonify({"ok": True})


@bp_counselor.post("/api/counselor/append_student")
def counselor_append_student():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    sid = (data.get("student_id", "") or "").strip()
    name = (data.get("student_name", "") or "").strip()
    grade = (data.get("grade_level", "") or "").strip()
    if not sid or not name or not grade:
        return jsonify({"error": "missing_fields"}), 400

    studs = read_students()
    studs.append({"student_id": sid, "student_name": name, "grade_level": grade})
    write_students(studs)
    return jsonify({"ok": True})


@bp_counselor.post("/api/counselor/append_course")
def counselor_append_course():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}

    row = {
        "course_code": (data.get("course_code", "") or "").strip(),
        "course_name": (data.get("course_name", "") or "").strip(),
        "subject_area": (data.get("subject_area", "") or "").strip(),
        "level": (data.get("level", "") or "").strip(),
        "description": (data.get("description", "") or "").strip(),
        "teacher_name": (data.get("teacher_name", "") or "").strip(),
        "teacher_email": (data.get("teacher_email", "") or "").strip(),
        "room": (data.get("room", "") or "").strip(),
        "grade_min": (data.get("grade_min", "") or "").strip(),
        "grade_max": (data.get("grade_max", "") or "").strip(),
        "requires_approval": _boolish(data.get("requires_approval", False)),
    }

    if (not row["course_code"]) or (not row["course_name"]):
        return jsonify({"error": "missing_code_or_name"}), 400

    append_course_row(row)
    return jsonify({"ok": True})


@bp_counselor.get("/api/counselor/courses")
def counselor_courses_list():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    subj = (request.args.get("subject", "") or "").strip().lower()
    nameq = (request.args.get("name", "") or "").strip().lower()

    out = []
    for c in read_courses():
        if subj and subj not in (c["subject_area"] or "").lower():
            continue
        nm = (c["course_name"] + " " + c["course_code"]).lower()
        if nameq and nameq not in nm:
            continue
        out.append(c)

    return jsonify({"courses": out})


@bp_counselor.post("/api/counselor/delete_course")
def counselor_delete_course():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    code = (data.get("course_code", "") or "").strip()
    if not code:
        return jsonify({"error": "missing_code"}), 400

    allc = read_courses()
    newc = [c for c in allc if c["course_code"] != code]
    write_courses(newc)

    appr = read_approvals()
    appr = [a for a in appr if a["course_code"] != code]
    write_approvals(appr)

    return jsonify({"ok": True})


@bp_counselor.post("/api/counselor/update_course")
def counselor_update_course():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    code = (data.get("course_code", "") or "").strip()
    if not code:
        return jsonify({"error": "missing_code"}), 400

    allc = read_courses()
    updated_list = []
    found = False

    for c in allc:
        if c["course_code"] == code:
            found = True
            updated_list.append(
                {
                    "course_code": code,
                    "course_name": (data.get("course_name", c["course_name"]) or "").strip(),
                    "subject_area": (data.get("subject_area", c["subject_area"]) or "").strip(),
                    "level": (data.get("level", c["level"]) or "").strip(),
                    "description": (data.get("description", c["description"]) or "").strip(),
                    "teacher_name": (data.get("teacher_name", c["teacher_name"]) or "").strip(),
                    "teacher_email": (data.get("teacher_email", c.get("teacher_email", "")) or "").strip(),
                    "room": (data.get("room", c["room"]) or "").strip(),
                    "grade_min": (data.get("grade_min", c["grade_min"]) or "").strip(),
                    "grade_max": (data.get("grade_max", c["grade_max"]) or "").strip(),
                    "requires_approval": _boolish(data.get("requires_approval", c.get("requires_approval", False))),
                }
            )
        else:
            updated_list.append(c)

    if not found:
        return jsonify({"error": "not_found"}), 404

    write_courses(updated_list)
    return jsonify({"ok": True})


@bp_counselor.get("/api/counselor/students")
def counselor_students():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    q_name = (request.args.get("q_name", "") or "").strip().lower()
    q_grade = (request.args.get("grade", "") or "").strip()
    q_course = (request.args.get("course", "") or "").strip().lower()

    studs = read_students()
    sched_map = {s["student_id"]: s for s in read_schedules()}

    out = []
    for stu in studs:
        sid = stu["student_id"]
        sched = sched_map.get(sid)

        academic = []
        elective = []
        notes = ""
        if sched:
            academic = sched["academic_courses"]
            elective = sched["elective_courses"]
            notes = sched.get("special_instructions", "")

        top_elective = elective[0] if elective else ""
        saved = bool(sched)

        pending_cnt = 0
        rejected_cnt = 0
        if sched:
            pending_cnt, rejected_cnt = approval_counts_for_student(sid, sched)

        out.append(
            {
                "student_id": sid,
                "student_name": stu["student_name"],
                "grade_level": stu["grade_level"],
                "academic_courses": academic,
                "top_elective": top_elective,
                "scheduled": saved,
                "pending_approvals": pending_cnt,
                "rejected_approvals": rejected_cnt,
                "special_instructions": notes,
            }
        )

    if q_name:
        out = [r for r in out if q_name in r["student_name"].lower()]
    if q_grade:
        out = [r for r in out if r["grade_level"] == q_grade]
    if q_course:
        tmp = []
        for r in out:
            hay = " ".join(r["academic_courses"] + [r["top_elective"]]).lower()
            if q_course in hay:
                tmp.append(r)
        out = tmp

    return jsonify({"total": len(out), "students": out})


@bp_counselor.get("/api/counselor/pending_approvals")
def counselor_pending_approvals():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    course_map = course_by_code_map()
    approvals = read_approvals()
    pending = [a for a in approvals if (a.get("status", "") or "").lower() == "pending"]

    stu_map = {s["student_id"]: s for s in read_students()}

    out = []
    for a in pending:
        stu = stu_map.get(a["student_id"], {})
        course = course_map.get(a["course_code"], {})
        out.append(
            {
                "student_id": a["student_id"],
                "student_name": stu.get("student_name", ""),
                "grade_level": stu.get("grade_level", ""),
                "course_code": a["course_code"],
                "course_name": course.get("course_name", ""),
                "teacher_email": a.get("teacher_email", ""),
                "updated_at": a.get("updated_at", ""),
            }
        )

    out.sort(key=lambda x: ((x["course_name"] or "").lower(), (x["student_name"] or "").lower()))
    return jsonify({"pending": out, "total": len(out)})


@bp_counselor.get("/api/counselor/get_schedule")
def counselor_get_schedule():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    sid = (request.args.get("student_id", "") or "").strip()
    stu = get_student_by_id(sid)
    if not stu:
        return jsonify({"error": "no_student"}), 404

    sched = get_schedule_for_student(sid)
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
    ensure_approval_rows_for_schedule(sid, selected_codes)

    academic_items, elective_items = schedule_items_for_student(sid, sched)
    return jsonify({"schedule": sched, "schedule_items": {"academic": academic_items, "elective": elective_items}})


@bp_counselor.post("/api/counselor/save_schedule")
def counselor_save_schedule():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    sid = (data.get("student_id", "") or "").strip()
    name = (data.get("student_name", "") or "").strip()
    grade = (data.get("grade_level", "") or "").strip()

    academic_list = data.get("academic_courses", []) or []
    elective_list = data.get("elective_courses", []) or []
    notes = (data.get("special_instructions", "") or "")

    if not sid or not name or not grade:
        return jsonify({"error": "missing_fields"}), 400
    if len(academic_list) > MAX_ACADEMIC_COURSES:
        return jsonify({"error": "too_many_academic"}), 400
    if len(elective_list) > MAX_ELECTIVE_CHOICES:
        return jsonify({"error": "too_many_electives"}), 400

    upsert_schedule(sid, name, grade, academic_list, elective_list, notes)

    selected_codes = [extract_course_code(x) for x in academic_list] + [extract_course_code(x) for x in elective_list]
    ensure_approval_rows_for_schedule(sid, selected_codes)

    return jsonify({"ok": True})


@bp_counselor.post("/api/counselor/reset_schedule")
def counselor_reset_schedule():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    sid = (data.get("student_id", "") or "").strip()
    if not sid:
        return jsonify({"error": "missing_id"}), 400

    reset_student_schedule(sid)

    appr = read_approvals()
    appr = [a for a in appr if a["student_id"] != sid]
    write_approvals(appr)

    return jsonify({"ok": True})


@bp_counselor.post("/api/counselor/delete_student")
def counselor_delete_student():
    if not is_counselor():
        return jsonify({"error": "not_authorized"}), 403

    data = request.json or {}
    sid = (data.get("student_id", "") or "").strip()
    if not sid:
        return jsonify({"error": "missing_id"}), 400

    delete_student_record(sid)
    return jsonify({"ok": True})
