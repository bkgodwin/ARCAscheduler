import re
from datetime import datetime

from config import MAX_ACADEMIC_COURSES, MAX_ELECTIVE_CHOICES
from app.storage import (
    read_students,
    write_students,
    read_courses,
    write_courses,
    read_schedules,
    write_schedules,
    read_approvals,
    write_approvals,
)

CODE_RE = re.compile(r"\(([^()]+)\)\s*$")


def extract_course_code(course_display: str) -> str:
    if not course_display:
        return ""
    s = course_display.strip()
    m = CODE_RE.search(s)
    if m:
        return m.group(1).strip()
    if len(s) <= 12 and " " not in s:
        return s
    return s


def course_by_code_map():
    m = {}
    for c in read_courses():
        if c.get("course_code"):
            m[c["course_code"]] = c
    return m


def get_student_by_id(sid: str):
    for s in read_students():
        if s["student_id"] == sid:
            return s
    return None


def get_schedule_for_student(sid: str):
    for s in read_schedules():
        if s["student_id"] == sid:
            return s
    return None


def upsert_schedule(
    student_id: str,
    student_name: str,
    grade_level: str,
    academic_list,
    elective_list,
    special_instructions: str,
):
    scheds = read_schedules()
    found = False
    for row in scheds:
        if row["student_id"] == student_id:
            row["student_name"] = student_name
            row["grade_level"] = grade_level
            row["academic_courses"] = list(academic_list)[:MAX_ACADEMIC_COURSES]
            row["elective_courses"] = list(elective_list)[:MAX_ELECTIVE_CHOICES]
            row["special_instructions"] = (special_instructions or "").strip()
            found = True
            break

    if not found:
        scheds.append(
            {
                "student_id": student_id,
                "student_name": student_name,
                "grade_level": grade_level,
                "academic_courses": list(academic_list)[:MAX_ACADEMIC_COURSES],
                "elective_courses": list(elective_list)[:MAX_ELECTIVE_CHOICES],
                "special_instructions": (special_instructions or "").strip(),
            }
        )

    write_schedules(scheds)


def reset_student_schedule(student_id: str):
    scheds = read_schedules()
    scheds = [s for s in scheds if s["student_id"] != student_id]
    write_schedules(scheds)


def delete_student_record(student_id: str):
    studs = read_students()
    studs = [s for s in studs if s["student_id"] != student_id]
    write_students(studs)

    reset_student_schedule(student_id)

    appr = read_approvals()
    appr = [a for a in appr if a["student_id"] != student_id]
    write_approvals(appr)


def approval_status_map_for_student(student_id: str):
    m = {}
    for a in read_approvals():
        if a["student_id"] == student_id:
            m[a["course_code"]] = a
    return m


def ensure_approval_rows_for_schedule(student_id: str, selected_course_codes):
    course_map = course_by_code_map()
    approvals = read_approvals()

    selected_set = {c for c in selected_course_codes if c}

    # Remove approvals for courses no longer selected
    approvals = [
        a
        for a in approvals
        if not (a["student_id"] == student_id and a["course_code"] not in selected_set)
    ]

    existing = {(a["student_id"], a["course_code"]) for a in approvals}
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for code in selected_set:
        course = course_map.get(code)
        if not course:
            continue
        if not course.get("requires_approval", False):
            continue

        key = (student_id, code)
        if key not in existing:
            approvals.append(
                {
                    "student_id": student_id,
                    "course_code": code,
                    "status": "pending",
                    "teacher_email": (course.get("teacher_email", "") or "").lower(),
                    "updated_at": now,
                    "note": "",
                }
            )

    write_approvals(approvals)


def compute_course_item(course_display: str, student_id: str | None = None):
    code = extract_course_code(course_display)
    course = course_by_code_map().get(code)

    subject_area = ((course.get("subject_area") if course else "") or "Other")
    requires = bool(course.get("requires_approval")) if course else False
    teacher_email = (course.get("teacher_email") if course else "") or ""

    status = "approved"
    if requires:
        if student_id:
            appr = approval_status_map_for_student(student_id).get(code)
            status = (appr.get("status") if appr else "pending") or "pending"
            status = status.lower()
        else:
            status = "pending"

    return {
        "display": course_display,
        "course_code": code,
        "subject_area": subject_area,
        "requires_approval": requires,
        "approval_status": status,
        "teacher_email": teacher_email,
    }


def schedule_items_for_student(student_id: str, sched_obj: dict):
    academic = [compute_course_item(x, student_id) for x in (sched_obj.get("academic_courses") or [])]
    elective = [compute_course_item(x, student_id) for x in (sched_obj.get("elective_courses") or [])]
    return academic, elective


def approval_counts_for_student(student_id: str, sched_obj: dict):
    selected_codes = [extract_course_code(x) for x in (sched_obj.get("academic_courses") or [])] + [
        extract_course_code(x) for x in (sched_obj.get("elective_courses") or [])
    ]

    course_map = course_by_code_map()
    appr_map = approval_status_map_for_student(student_id)

    pending = 0
    rejected = 0

    for code in selected_codes:
        c = course_map.get(code)
        if not c or not c.get("requires_approval", False):
            continue

        st = (appr_map.get(code, {}).get("status") or "pending").lower()
        if st == "pending":
            pending += 1
        elif st == "rejected":
            rejected += 1

    return pending, rejected
