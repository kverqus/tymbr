import os
import logging
from pathlib import Path
from logging.handlers import RotatingFileHandler

from flask import Flask

from app.config import Config

def create_app():
    """Application factory function"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure scripts directory exists
    scripts_dir = Path(app.config['SCRIPTS_DIRECTORY'])
    scripts_dir.mkdir(exist_ok=True)

    # Ensure log directory exists
    if not os.path.exists('logs'):
        os.mkdir('logs')

    file_handler = RotatingFileHandler(
        'logs/tymbr.log',
        maxBytes=10240000,
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Tymbr startup')

    from app.main import bp as main_bp
    app.register_blueprint(main_bp)

    return app
