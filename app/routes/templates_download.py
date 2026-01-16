import csv
from io import StringIO

from flask import Blueprint, Response

from config import MAX_ACADEMIC_COURSES, MAX_ELECTIVE_CHOICES

bp_templates = Blueprint("templates_download", __name__)


@bp_templates.get("/download_template/<which>")
def download_template(which):
    sio = StringIO()
    w = csv.writer(sio)

    if which == "students":
        w.writerow(["student_id", "student_name", "grade_level"])
        w.writerow(["12345", "Alice Example", "9"])
    elif which == "courses":
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
                "BIO",
                "Biology",
                "Science",
                "Honors",
                "Cells and genetics.",
                "Dr. Singh",
                "singh@school.org",
                "Lab201",
                "9",
                "10",
                "TRUE",
            ]
        )
    elif which == "teachers":
        w.writerow(["teacher_email", "teacher_name", "password"])
        w.writerow(["teacher@school.org", "Ms. Example", "changeme"])
    elif which == "schedules":
        header = ["student_id", "student_name", "grade_level"]
        for i in range(MAX_ACADEMIC_COURSES):
            header.append(f"period_{i+1}")
        for j in range(MAX_ELECTIVE_CHOICES):
            header.append(f"elective_{j+1}")
        header.append("special_instructions")
        w.writerow(header)
        w.writerow(
            [
                "12345",
                "Alice Example",
                "9",
                "English I (ENG9)",
                "Biology (BIO)",
                "",
                "",
                "",
                "",
                "",
                "Intro Welding (WELD1)",
                "",
                "",
                "",
                "",
                "Prefers morning classes if possible",
            ]
        )
    else:
        return Response("Unknown template", status=404)

    b = sio.getvalue().encode("utf-8")
    return Response(
        b,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={which}_template.csv"},
    )
