from flask import jsonify, current_app

from app.main import bp
from app.core.script_runner import get_script_runner


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
