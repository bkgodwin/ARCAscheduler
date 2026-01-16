from flask import Flask
from config import FLASK_SECRET_KEY

from app.storage import ensure_dirs_and_files


def create_app():
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.secret_key = FLASK_SECRET_KEY

    ensure_dirs_and_files()

    from app.routes.pages import bp_pages
    from app.routes.student import bp_student
    from app.routes.teacher import bp_teacher
    from app.routes.counselor import bp_counselor
    from app.routes.exports import bp_exports
    from app.routes.printables import bp_printables
    from app.routes.templates_download import bp_templates

    app.register_blueprint(bp_pages)
    app.register_blueprint(bp_student)
    app.register_blueprint(bp_teacher)
    app.register_blueprint(bp_counselor)
    app.register_blueprint(bp_exports)
    app.register_blueprint(bp_printables)
    app.register_blueprint(bp_templates)

    return app
