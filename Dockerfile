FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p scripts logs && \
    adduser --disabled-password --gecos '' tymbr && \
    chown -R tymbr:tymbr /app

RUN mkdir -p /var/log/gunicorn && \
    chown -R tymbr:tymbr /var/log/gunicorn
    
USER tymbr

EXPOSE 8000

CMD ["gunicorn", "--access-logfile", "/var/log/gunicorn/access.log", "--error-logfile", "/var/log/gunicorn/error.log", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "app:create_app()"]
