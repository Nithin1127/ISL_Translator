FROM node:20-alpine AS node-builder
WORKDIR /app

# Install node dependencies for the gateway
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# Install python dependencies for the AI service
COPY ai-service/requirements.txt ./requirements.txt
RUN apk add --no-cache python3 py3-pip && pip install --no-cache-dir -r requirements.txt

# Copy python service code
COPY ai-service/ ./ai-service/

EXPOSE 5000
CMD ["node", "src/server.js"]
