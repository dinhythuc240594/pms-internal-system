FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    FLASK_SKIP_DOTENV=1 \
    PORT=8000

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 pms

COPY --chown=pms:pms app.py manage.py gunicorn_conf.py ./
COPY --chown=pms:pms pms_api ./pms_api
COPY --chown=pms:pms common ./common
COPY --chown=pms:pms migrations ./migrations

USER pms
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/api/health', timeout=3)"

CMD ["gunicorn", "--config", "gunicorn_conf.py", "app:create_app()"]
