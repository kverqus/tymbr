import logging
import importlib.util
import re
from pathlib import Path
from typing import List, Dict
from time import time
from threading import Thread

import yaml
from flask import current_app

logger = logging.getLogger(__name__)


def get_script_runner():
    """Get script runner instance with current app config"""
    scripts_dir = Path(current_app.config['SCRIPTS_DIRECTORY'])
    return ScriptRunner(
        script_dir=scripts_dir,
        default_timeout=current_app.config['DEFAULT_SCRIPT_TIMEOUT'],
        max_timeout=current_app.config['MAX_SCRIPT_TIMEOUT']
    )


class ScriptRunner:
    def __init__(self, script_dir: Path, default_timeout: int = 30, max_timeout: int = 300):
        self.script_dir = Path(script_dir)
        self.script_dir.mkdir(exist_ok=True)
        self.default_timeout = default_timeout
        self.max_timeout = max_timeout

        logger.info(f"ScriptRunner initialized with directory: {script_dir}")

    def list_scripts(self) -> List[Dict[str, str]]:
        """List available scripts"""
        scripts = []
        configs = list(self.script_dir.glob("*.yaml"))

        logger.debug(
            f"Found {len(configs)} script configurations in {self.script_dir}")

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
                logger.warning(
                    f"Script configuration {config} has no corresponding Python file")

        logger.info(f"Successfully loaded {len(scripts)} scripts")

        return scripts

    def load_script_config(self, script_name: str) -> Dict:
        """Load YAML configuration for a script"""
        config_path = self.script_dir / f"{script_name}.yaml"

        if not config_path.exists():
            raise FileNotFoundError(
                f"Configuration file not found: {config_path}")

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)

            # Make sure required sections are present in configuration
            if 'metadata' not in config:
                raise ValueError("Configuration missing 'metadata' section")
            if 'form' not in config:
                raise ValueError("Configuration missing 'form' section")

            # Add execution settings if not present
            if 'execution' not in config:
                config['execution'] = {}
            execution = config['execution']
            execution.setdefault('timeout', self.default_timeout)
            execution['timeout'] = min(execution['timeout'], self.max_timeout)

            logger.debug(f"Loaded configuration for script: {script_name}")

            return config

        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in configuration file: {e}")

    def validate_form_data(self, data: Dict, form_schema: List[Dict]) -> List[str]:
        """Validate form data against schema"""
        errors = []

        for field in form_schema:
            name = field['name']
            value = data.get(name)

            if field.get('required', False):
                if value is None or value == '' or (isinstance(value, list) and len(value) == 0):
                    errors.append(f"{field['label']} is required")
                    continue

            # Skip validation if field is empty and not required
            if value is None or value == '':
                continue

            field_type = field['type']

            if field_type == 'number':
                try:
                    num_value = float(value)
                    if 'min' in field and num_value < field['min']:
                        errors.append(
                            f"{field['label']} must be at least {field['min']}")
                    if 'max' in field and num_value > field['max']:
                        errors.append(
                            f"{field['label']} must be at most {field['max']}")
                except ValueError:
                    errors.append(f"{field['label']} must be a number")

            elif field_type == 'text' and 'validation' in field:
                pattern = field['validation'].get('pattern')
                if pattern and not re.match(pattern, str(value)):
                    message = field['validation'].get(
                        'message', f"{field['label']} format is invalid")
                    errors.append(message)

            elif field_type == 'multiselect':
                if not isinstance(value, list):
                    errors.append(f"{field['label']} must be a list")
                elif field.get('options'):
                    valid_options = [opt.get('value', opt) if isinstance(opt, dict) else opt
                                     for opt in field['options']]
                    for item in value:
                        if item not in valid_options:
                            errors.append(
                                f"Invalid option '{item}' for {field['label']}")

        return errors

    def execute_script(self, script_name: str, form_data: Dict) -> Dict:
        """Execute a script with timeout and validation"""
        start_time = time()

        try:
            logger.info(f"Starting execution of script: {script_name}")

            config = self.load_script_config(script_name)

            processed_data = {}
            for field in config['form']:
                name = field['name']

                if name in form_data:
                    processed_data[name] = form_data[name]

                elif 'default' in field:
                    processed_data[name] = field['default']

            # Validation
            validation_errors = self.validate_form_data(
                processed_data, config['form'])
            if validation_errors:
                logger.warning(
                    f"Validation failed for {script_name}: {validation_errors}")

                return {
                    'error': 'Validation failed: ' + '; '.join(validation_errors),
                    'result': None
                }

            script_path = self.script_dir / f"{script_name}.py"
            if not script_path.exists():
                raise FileNotFoundError(
                    f'Script file {script_name}.py not found')

            spec = importlib.util.spec_from_file_location(
                script_name, script_path)
            module = importlib.util.module_from_spec(spec)

            # Execute with timeout
            timeout = config['execution']['timeout']
            result = self._execute_with_timeout(
                spec, module, processed_data, timeout)

            execution_time = time() - start_time

            # Add execution metadata to result
            if 'metadata' not in result:
                result['metadata'] = {}
            result['metadata']['execution_time'] = f"{execution_time:.2f}s"
            result['metadata']['script_name'] = script_name

            logger.info(
                f"Script {script_name} completed in {execution_time:.2f}s")

            return result

        except Exception as e:
            execution_time = time() - start_time

            logger.error(
                f"Script {script_name} failed after {execution_time:.2f}s: {e}")

            return {
                'error': f'Execution failed: {str(e)}',
                'result': None,
                'metadata': {
                    'execution_time': f"{execution_time:.2f}s",
                    'script_name': script_name
                }
            }

    def _execute_with_timeout(self, spec, module, form_data: Dict, timeout: int) -> Dict:
        """Execute script with timeout protection"""
        result = {'error': None, 'result': None}
        exception = None

        def target():
            nonlocal result, exception
            try:
                # Load module
                spec.loader.exec_module(module)

                # Check if script custom validation
                if hasattr(module, 'validate_inputs'):
                    validation_errors = module.validate_inputs(form_data)

                    if validation_errors:
                        result = {
                            'error': f"Script validation failed: {'; '.join(validation_errors)}",
                            'result': None
                        }
                        return

                if hasattr(module, 'main'):
                    script_result = module.main(form_data)

                    # Make sure result is dict
                    if isinstance(script_result, dict):
                        result = script_result

                    else:
                        result = {
                            'result': script_result,
                            'result_type': 'text',
                            'error': None
                        }
                else:
                    result = {'error': "Script missing main() function",
                              'result': None}

            except Exception as e:
                exception = e

        thread = Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(timeout)

        if thread.is_alive():
            logger.warning(
                f"Script execution timed out after {timeout} seconds")

            return {
                'error': f'Script execution timed out after {timeout} seconds',
                'result': None
            }

        if exception:
            logger.error(
                f"Script execution failed with exception: {exception}")

            return {
                'error': f'Script execution failed: {str(exception)}',
                'result': None
            }

        return result
