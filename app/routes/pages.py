from flask import Blueprint, render_template

from config import MAX_ACADEMIC_COURSES, MAX_ELECTIVE_CHOICES

bp_pages = Blueprint("pages", __name__)


@bp_pages.get("/")
def index():
    return render_template(
        "index.html",
        max_academic=MAX_ACADEMIC_COURSES,
        max_elective=MAX_ELECTIVE_CHOICES,
    )
