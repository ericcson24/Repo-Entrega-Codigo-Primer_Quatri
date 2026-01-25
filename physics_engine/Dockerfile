FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use environment variable for port, defaulting to 8080 (Cloud Run standard)
ENV PORT 8080
EXPOSE 8080

# Shell form to allow variable expansion
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port $PORT"
