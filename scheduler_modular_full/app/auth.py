from flask import session


def is_counselor() -> bool:
    return bool(session.get("is_counselor", False))


def is_student() -> bool:
    return "student_id" in session


def is_teacher() -> bool:
    return "teacher_email" in session
