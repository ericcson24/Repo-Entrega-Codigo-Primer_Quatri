FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Usar variable de entorno para puerto, valor por defecto 8080 (estándar Cloud Run)
ENV PORT 8080
EXPOSE 8080

# Forma shell para permitir expansión de variables
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port $PORT"
