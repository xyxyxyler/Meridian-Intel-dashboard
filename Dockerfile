FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy project files
COPY . .

# Build production client bundle
RUN npm run build

# Render sets PORT dynamically (defaults to 3000 locally)
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start Express server (serving compiled frontend + API + 15m auto-sync)
CMD ["npm", "run", "start"]
