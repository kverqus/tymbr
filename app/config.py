import os

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'very-secret-key'

    SCRIPTS_DIRECTORY = os.environ.get('SCRIPTS_DIRECTORY') or 'scripts'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
