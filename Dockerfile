FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app/server
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
ENV SERVE_CLIENT=1 \
    CLIENT_DIST=/app/client/dist \
    PORT=8000
EXPOSE 8000
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 60 app:app
