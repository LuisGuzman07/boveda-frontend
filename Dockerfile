FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["sh", "-c", "if [ \"${DEPLOY_MODE}\" = \"prod\" ]; then export VITE_API_URL=https://api-bovedag4.duckdns.org/api/v1; else export VITE_API_URL=http://localhost:8100/api/v1; fi; exec npm run dev -- --host 0.0.0.0 --port 5173"]
