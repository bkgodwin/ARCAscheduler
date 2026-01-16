import os

# Flask
FLASK_SECRET_KEY = os.environ.get("SCHEDULER_SECRET_KEY", "change-me-please")

# Auth
COUNSELOR_PASSWORD = os.environ.get("COUNSELOR_PASSWORD", "admin")

# Data paths
DATA_DIR = "data"
STATE_DIR = "state"

STUDENTS_CSV  = os.path.join(DATA_DIR, "students.csv")
COURSES_CSV   = os.path.join(DATA_DIR, "courses.csv")
SCHEDULES_CSV = os.path.join(DATA_DIR, "schedules.csv")
TEACHERS_CSV  = os.path.join(DATA_DIR, "teachers.csv")
APPROVALS_CSV = os.path.join(DATA_DIR, "approvals.csv")

SETTINGS_JSON = os.path.join(STATE_DIR, "settings.json")

# Limits
MAX_ACADEMIC_COURSES = 7
MAX_ELECTIVE_CHOICES = 5

# Default colors for subject/areas
DEFAULT_SUBJECT_COLORS = {
    "ELA": "#2563eb",
    "Math": "#7c3aed",
    "Science": "#16a34a",
    "Social Studies": "#ea580c",
    "PE/Health": "#0891b2",
    "CTE": "#b91c1c",
    "Elective": "#a21caf",
    "Other": "#475569"
}
