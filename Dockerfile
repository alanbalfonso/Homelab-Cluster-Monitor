FROM node:18-alpine

WORKDIR /app

# Instalar dependencias
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copiar fuentes de backend y frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_PATH=/app/frontend

EXPOSE 3000

CMD ["node", "index.js"]
