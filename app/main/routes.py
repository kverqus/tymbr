from flask import jsonify, current_app, request, render_template

from app.main import bp
from app.core.script_runner import get_script_runner


@bp.route('/', methods=['GET'])
def index():
    """Serve the main interface"""
    return render_template('index.html')


@bp.route('/api/scripts', methods=['GET'])
def list_scripts():
    """Get list of available scripts"""
    try:
        script_runner = get_script_runner()
        scripts = script_runner.list_scripts()
        return jsonify({'scripts': scripts})
    except Exception as e:
        current_app.logger.error(f"Error listing scripts: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/scripts/<script_name>/config', methods=['GET'])
def get_script_config(script_name):
    """Get form configuration for a script"""
    try:
        script_runner = get_script_runner()
        config = script_runner.load_script_config(script_name)
        return jsonify(config)
    except FileNotFoundError:
        return jsonify({'error': 'Script not found'}), 404
    except Exception as e:
        current_app.logger.error(
            f"Error loading script config for {script_name}: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/scripts/<script_name>/execute', methods=['POST'])
def execute_script(script_name):
    """Execute a script with form data"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        form_data = request.get_json()
        if not form_data:
            return jsonify({'error': 'No data provided'}), 400

        script_runner = get_script_runner()

        current_app.logger.info(f"Executing script: {script_name}")

        result = script_runner.execute_script(script_name, form_data)

        if result.get('error'):
            current_app.logger.warning(
                f"Script {script_name} failed: {result['error']}")
        else:
            current_app.logger.info(
                f"Script {script_name} completed successfully")

        return jsonify(result)

    except Exception as e:
        current_app.logger.error(f"Error executing script {script_name}: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        script_runner = get_script_runner()
        script_count = len(script_runner.list_scripts())

        return jsonify({
            'status': 'healthy',
            'scripts_available': script_count,
            'config': {
                'scripts_directory': current_app.config['SCRIPTS_DIRECTORY']
            }
        })
    except Exception as e:
        current_app.logger.error(f"Health check failed: {e}")
        
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
