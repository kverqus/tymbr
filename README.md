# tymbr

A web interface for executing Python scripts through dynamically generated forms. Scripts are configured via YAML files that define form fields, validation rules, and execution parameters.

## Creating Scripts

### 1. Python Script

Create a Python file in the `scripts/` directory with a `main()` function:

```python
# scripts/example_script.py
def main(inputs):
    """
    Main entry point for script execution.
    
    Args:
        inputs (dict): Form data from the web interface
        
    Returns:
        dict: Result with 'result', 'error', and optional 'metadata'
    """
    try:
        name = inputs['name']
        count = inputs.get('count', 1)
        
        result = f"Hello {name}! " * count
        
        return {
            'result': result.strip(),
            'result_type': 'text',
            'metadata': {
                'name_length': len(name),
                'total_chars': len(result)
            }
        }
    except Exception as e:
        return {
            'error': str(e),
            'result': None
        }

def validate_inputs(inputs):
    """Optional: Custom validation beyond YAML schema."""
    errors = []
    if len(inputs.get('name', '')) < 2:
        errors.append("Name must be at least 2 characters")
    return errors
```

### 2. YAML Configuration

Create a corresponding YAML file with the same name:

```yaml
# scripts/example_script.yaml
metadata:
  name: "Example Script"
  description: "Demonstrates basic form handling and text processing"
  version: "1.0"
  author: "development-team"

form:
  - name: "name"
    type: "text"
    label: "Your Name"
    required: true
    placeholder: "Enter your name"
    validation:
      pattern: "^[a-zA-Z\\s]+$"
      message: "Name can only contain letters and spaces"
    
  - name: "count"
    type: "number"
    label: "Repeat Count"
    required: false
    default: 3
    min: 1
    max: 10
    
  - name: "format"
    type: "select"
    label: "Output Format"
    required: true
    default: "normal"
    options:
      - value: "normal"
        label: "Normal Text"
      - value: "upper"
        label: "UPPERCASE"
      - value: "lower"
        label: "lowercase"

execution:
  timeout: 30
```

## Form Field Types

### Text Input
```yaml
- name: "username"
  type: "text"
  label: "Username"
  required: true
  placeholder: "Enter username"
  validation:
    pattern: "^[a-zA-Z0-9_]+$"
    message: "Username can only contain letters, numbers, and underscores"
```

### Number Input
```yaml
- name: "age"
  type: "number"
  label: "Age"
  required: true
  min: 18
  max: 120
  default: 25
```

### Select Dropdown
```yaml
- name: "country"
  type: "select"
  label: "Country"
  required: true
  options:
    - value: "us"
      label: "United States"
    - value: "uk"
      label: "United Kingdom"
    - value: "ca"
      label: "Canada"
```

### Multi-Select
```yaml
- name: "skills"
  type: "multiselect"
  label: "Programming Skills"
  required: false
  options:
    - "Python"
    - "JavaScript"
    - "Go"
    - "Rust"
```

### Checkbox
```yaml
- name: "agree_terms"
  type: "checkbox"
  label: "I agree to the terms and conditions"
  required: true
  default: false
```

### Text Area
```yaml
- name: "description"
  type: "textarea"
  label: "Description"
  required: false
  placeholder: "Enter detailed description..."
```

## Configuration Options

### Metadata Section
```yaml
metadata:
  name: "Display Name"           # Required: Shown in UI
  description: "Brief description"  # Required: Shown in UI
  version: "1.0"                # Optional: Version info
  author: "developer@company"   # Optional: Author info
```

### Execution Section
```yaml
execution:
  timeout: 60              # Timeout in seconds (default: 30)
```

### Validation Patterns
```yaml
validation:
  pattern: "^[a-zA-Z0-9]+$"        # Regex pattern
  message: "Custom error message"   # Error message shown to user
```

## Script Return Format

Scripts should return a dictionary with these keys:

```python
return {
    'result': "The main output",        # Required: Main result
    'result_type': 'text',              # Optional: 'text', 'json', 'table'
    'error': None,                      # Optional: Error message if failed
    'metadata': {                       # Optional: Additional info
        'execution_time': '1.2s',
        'rows_processed': 150
    }
}
```

## Project Structure

```
tymbr/
├── app/
│   ├── __init__.py          # Application factory
│   ├── config.py            # Configuration class
│   ├── main/
│   │   ├── __init__.py      # Blueprint registration
│   │   └── routes.py        # API routes
│   ├── core/
│   │   ├── __init__.py
│   │   └── script_runner.py # Script execution engine
│   ├── templates/
│   │   └── index.html       # Web interface
│   └── static/
│       ├── style.css        # Styles
│       └── tymbr.js         # Frontend logic
├── scripts/                 # Your Python scripts and YAML configs
├── logs/                    # Application logs
├── requirements.txt         # Python dependencies
└── Dockerfile               # Container definition
```

## Environment Variables

- `SECRET_KEY`: Flask secret key for sessions
- `SCRIPTS_DIRECTORY`: Path to scripts directory (default: "scripts")
- `DEFAULT_SCRIPT_TIMEOUT`: Default timeout in seconds (default: 30)
- `MAX_SCRIPT_TIMEOUT`: Maximum allowed timeout (default: 300)

## Deployment

### Docker
```bash
# Build and run
docker build -t tymbr .
docker run -d -p 8000:8000 \
  -v $(pwd)/scripts:/app/scripts:ro \
  -e SECRET_KEY=your-secret-key \
  tymbr
```

### Production
Set environment variables for production:
- Use a strong `SECRET_KEY`
- Configure appropriate timeouts
- Mount scripts directory as read-only
- Set up proper logging and monitoring

## Security Notes

- Scripts run in isolated processes with timeout protection
- Input validation occurs at both client and server level
- Scripts directory should be mounted read-only in production