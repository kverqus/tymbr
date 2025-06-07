import logging
from pathlib import Path
from typing import List, Dict

import yaml
from flask import current_app

logger = logging.getLogger(__name__)


def get_script_runner():
    """Get script runner instance with current app config"""
    scripts_dir = Path(current_app.config['SCRIPTS_DIRECTORY'])
    return ScriptRunner(
        script_dir=scripts_dir
    )


class ScriptRunner:
    def __init__(self, script_dir: Path):
        self.script_dir = Path(script_dir)
        self.script_dir.mkdir(exist_ok=True)

        logger.info(f"ScriptRunner initialized with directory: {script_dir}")

    def list_scripts(self) -> List[Dict[str, str]]:
        """List available scripts"""
        scripts = []
        configs = list(self.script_dir.glob("*.yaml"))

        logger.debug(f"Found {len(configs)} script configurations in {self.script_dir}")

        for config in configs:
            script_name = config.stem
            py_file = self.script_dir / f"{script_name}.py"

            if py_file.exists():
                try:
                    config = self.load_script_config(script_name)
                    scripts.append({
                        'name': script_name,
                        'title': config['metadata']['name'],
                        'description': config['metadata']['description'],
                        'version': config['metadata'].get('version', '1.0'),
                        'author': config['metadata'].get('author', 'Unknown')
                    })

                except Exception as e:
                    logger.error(f"Error loading script {script_name}: {e}")
            else:
                logger.warning(f"Script configuration {config} has no corresponding Python file")

        logger.info(f"Successfully loaded {len(scripts)} scripts")

        return scripts
    
    def load_script_config(self, script_name: str) -> Dict:
        """Load YAML configuration for a script"""
        config_path = self.script_dir / f"{script_name}.yaml"

        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)

            # Make sure required sections are present in configuration
            if 'metadata' not in config:
                raise ValueError("Configuration missing 'metadata' section")
            if 'form' not in config:
                raise ValueError("Configuration missing 'form' section")

            logger.debug(f"Loaded configuration for script: {script_name}")

            return config

        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in configuration file: {e}")