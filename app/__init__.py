from flask import Flask
from pathlib import Path

from app.config import Config


def create_app():
    """Application factory function"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure scripts directory exists
    scripts_dir = Path(app.config['SCRIPTS_DIRECTORY'])
    scripts_dir.mkdir(exist_ok=True)

    return app
