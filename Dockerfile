FROM node:22-slim
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev
RUN npm install express

# Copy built frontend asset bundle and web server
COPY dist ./dist
COPY server.js ./

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
