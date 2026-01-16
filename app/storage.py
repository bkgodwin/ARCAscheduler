import csv
import json
import os

from config import (
    STUDENTS_CSV,
    COURSES_CSV,
    SCHEDULES_CSV,
    TEACHERS_CSV,
    APPROVALS_CSV,
    SETTINGS_JSON,
    MAX_ACADEMIC_COURSES,
    MAX_ELECTIVE_CHOICES,
    DEFAULT_SUBJECT_COLORS,
)


def _boolish(v):
    if v is None:
        return False
    s = str(v).strip().lower()
    return s in ("1", "true", "yes", "y", "on")


def read_settings():
    with open(SETTINGS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def write_settings(newdata):
    with open(SETTINGS_JSON, "w", encoding="utf-8") as f:
        json.dump(newdata, f, indent=2)


def ensure_dirs_and_files():
    os.makedirs(os.path.dirname(STUDENTS_CSV), exist_ok=True)
    os.makedirs(os.path.dirname(SETTINGS_JSON), exist_ok=True)

    # students.csv
    if not os.path.exists(STUDENTS_CSV):
        with open(STUDENTS_CSV, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["student_id", "student_name", "grade_level"])
            w.writerow(["12345", "Alice Johnson", "9"])
            w.writerow(["12346", "Bob Smith", "10"])

    # courses.csv
    if not os.path.exists(COURSES_CSV):
        with open(COURSES_CSV, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(
                [
                    "course_code",
                    "course_name",
                    "subject_area",
                    "level",
                    "description",
                    "teacher_name",
                    "teacher_email",
                    "room",
                    "grade_min",
                    "grade_max",
                    "requires_approval",
                ]
            )
            w.writerow(
                [
                    "ENG9",
                    "English I",
                    "ELA",
                    "Regular",
                    "Foundational reading, writing, discussion.",
                    "Mr. White",
                    "white@school.org",
                    "A203",
                    "9",
                    "9",
                    "FALSE",
                ]
            )
            w.writerow(
                [
                    "ALG1",
                    "Algebra I",
                    "Math",
                    "Regular",
                    "Linear equations, functions, algebra basics.",
                    "Ms. Carter",
                    "carter@school.org",
                    "B102",
                    "9",
                    "10",
                    "FALSE",
                ]
            )
            w.writerow(
                [
                    "BIO",
                    "Biology",
                    "Science",
                    "Honors",
                    "Cells, genetics, ecology, lab investigations.",
                    "Dr. Singh",
                    "singh@school.org",
                    "Lab201",
                    "9",
                    "10",
                    "TRUE",
                ]
            )
            w.writerow(
                [
                    "PE9",
                    "Health & PE I",
                    "PE/Health",
                    "Regular",
                    "Personal fitness, health, wellness, team sports.",
                    "Coach Reed",
                    "reed@school.org",
                    "Gym",
                    "9",
                    "10",
                    "FALSE",
                ]
            )
            w.writerow(
                [
                    "WELD1",
                    "Intro Welding",
                    "CTE",
                    "CTE",
                    "Shop safety, MIG basics, metal prep.",
                    "Mr. Gomez",
                    "gomez@school.org",
                    "Shop1",
                    "9",
                    "12",
                    "TRUE",
                ]
            )

    # schedules.csv
    if not os.path.exists(SCHEDULES_CSV):
        with open(SCHEDULES_CSV, "w", newline="", encoding="utf-8") as f:
            header = ["student_id", "student_name", "grade_level"]
            for i in range(MAX_ACADEMIC_COURSES):
                header.append(f"period_{i+1}")
            for j in range(MAX_ELECTIVE_CHOICES):
                header.append(f"elective_{j+1}")
            header.append("special_instructions")
            w = csv.writer(f)
            w.writerow(header)

    # teachers.csv
    if not os.path.exists(TEACHERS_CSV):
        with open(TEACHERS_CSV, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["teacher_email", "teacher_name", "password"])
            w.writerow(["singh@school.org", "Dr. Singh", "changeme"])
            w.writerow(["gomez@school.org", "Mr. Gomez", "changeme"])

    # approvals.csv
    if not os.path.exists(APPROVALS_CSV):
        with open(APPROVALS_CSV, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["student_id", "course_code", "status", "teacher_email", "updated_at", "note"])

    # settings.json
    if not os.path.exists(SETTINGS_JSON):
        data = {
            "grade_submission_lock": {"9": True, "10": True, "11": True, "12": True},
            "subject_colors": DEFAULT_SUBJECT_COLORS,
        }
        with open(SETTINGS_JSON, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    # Light migration
    st = read_settings()
    changed = False
    if "grade_submission_lock" not in st or not isinstance(st["grade_submission_lock"], dict):
        st["grade_submission_lock"] = {"9": True, "10": True, "11": True, "12": True}
        changed = True
    if "subject_colors" not in st or not isinstance(st["subject_colors"], dict):
        st["subject_colors"] = DEFAULT_SUBJECT_COLORS.copy()
        changed = True
    if changed:
        write_settings(st)


def read_students():
    rows = []
    with open(STUDENTS_CSV, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            rows.append(
                {
                    "student_id": (row.get("student_id", "") or "").strip(),
                    "student_name": (row.get("student_name", "") or "").strip(),
                    "grade_level": (row.get("grade_level", "") or "").strip(),
                }
            )
    return rows


def write_students(students_list):
    fieldnames = ["student_id", "student_name", "grade_level"]
    with open(STUDENTS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for s in students_list:
            w.writerow(
                {
                    "student_id": s["student_id"],
                    "student_name": s["student_name"],
                    "grade_level": s["grade_level"],
                }
            )


def read_courses():
    rows = []
    with open(COURSES_CSV, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            rows.append(
                {
                    "course_code": (row.get("course_code", "") or "").strip(),
                    "course_name": (row.get("course_name", "") or "").strip(),
                    "subject_area": (row.get("subject_area", "") or "").strip(),
                    "level": (row.get("level", "") or "").strip(),
                    "description": (row.get("description", "") or "").strip(),
                    "teacher_name": (row.get("teacher_name", "") or "").strip(),
                    "teacher_email": (row.get("teacher_email", "") or "").strip(),
                    "room": (row.get("room", "") or "").strip(),
                    "grade_min": (row.get("grade_min", "") or "").strip(),
                    "grade_max": (row.get("grade_max", "") or "").strip(),
                    "requires_approval": _boolish(row.get("requires_approval", "FALSE")),
                }
            )
    return rows


def write_courses(courses_list):
    fieldorder = [
        "course_code",
        "course_name",
        "subject_area",
        "level",
        "description",
        "teacher_name",
        "teacher_email",
        "room",
        "grade_min",
        "grade_max",
        "requires_approval",
    ]
    with open(COURSES_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldorder)
        w.writeheader()
        for c in courses_list:
            row = {k: c.get(k, "") for k in fieldorder}
            row["requires_approval"] = "TRUE" if _boolish(c.get("requires_approval", False)) else "FALSE"
            w.writerow(row)


def append_course_row(rowdict):
    fieldorder = [
        "course_code",
        "course_name",
        "subject_area",
        "level",
        "description",
        "teacher_name",
        "teacher_email",
        "room",
        "grade_min",
        "grade_max",
        "requires_approval",
    ]
    with open(COURSES_CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        row = []
        for k in fieldorder:
            if k == "requires_approval":
                row.append("TRUE" if _boolish(rowdict.get(k, False)) else "FALSE")
            else:
                row.append(rowdict.get(k, ""))
        w.writerow(row)


def read_schedules():
    out = []
    with open(SCHEDULES_CSV, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            obj = {
                "student_id": (row.get("student_id", "") or "").strip(),
                "student_name": (row.get("student_name", "") or "").strip(),
                "grade_level": (row.get("grade_level", "") or "").strip(),
                "academic_courses": [],
                "elective_courses": [],
                "special_instructions": (row.get("special_instructions", "") or "").strip(),
            }
            for i in range(MAX_ACADEMIC_COURSES):
                v = (row.get(f"period_{i+1}", "") or "").strip()
                if v:
                    obj["academic_courses"].append(v)
            for j in range(MAX_ELECTIVE_CHOICES):
                v = (row.get(f"elective_{j+1}", "") or "").strip()
                if v:
                    obj["elective_courses"].append(v)
            out.append(obj)
    return out


def write_schedules(sched_list):
    header = ["student_id", "student_name", "grade_level"]
    for i in range(MAX_ACADEMIC_COURSES):
        header.append(f"period_{i+1}")
    for j in range(MAX_ELECTIVE_CHOICES):
        header.append(f"elective_{j+1}")
    header.append("special_instructions")

    with open(SCHEDULES_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        for row in sched_list:
            flat = {
                "student_id": row["student_id"],
                "student_name": row["student_name"],
                "grade_level": row["grade_level"],
                "special_instructions": row.get("special_instructions", ""),
            }
            for i in range(MAX_ACADEMIC_COURSES):
                flat[f"period_{i+1}"] = row["academic_courses"][i] if i < len(row["academic_courses"]) else ""
            for j in range(MAX_ELECTIVE_CHOICES):
                flat[f"elective_{j+1}"] = row["elective_courses"][j] if j < len(row["elective_courses"]) else ""
            w.writerow(flat)


def read_teachers():
    out = []
    with open(TEACHERS_CSV, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            out.append(
                {
                    "teacher_email": (row.get("teacher_email", "") or "").strip().lower(),
                    "teacher_name": (row.get("teacher_name", "") or "").strip(),
                    "password": (row.get("password", "") or "").strip(),
                }
            )
    return out


def read_approvals():
    out = []
    with open(APPROVALS_CSV, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            out.append(
                {
                    "student_id": (row.get("student_id", "") or "").strip(),
                    "course_code": (row.get("course_code", "") or "").strip(),
                    "status": (row.get("status", "") or "").strip().lower(),
                    "teacher_email": (row.get("teacher_email", "") or "").strip().lower(),
                    "updated_at": (row.get("updated_at", "") or "").strip(),
                    "note": (row.get("note", "") or "").strip(),
                }
            )
    return out


def write_approvals(rows):
    header = ["student_id", "course_code", "status", "teacher_email", "updated_at", "note"]
    with open(APPROVALS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow(
                {
                    "student_id": r.get("student_id", ""),
                    "course_code": r.get("course_code", ""),
                    "status": (r.get("status", "pending") or "pending").lower(),
                    "teacher_email": (r.get("teacher_email", "") or "").lower(),
                    "updated_at": r.get("updated_at", ""),
                    "note": r.get("note", ""),
                }
            )
