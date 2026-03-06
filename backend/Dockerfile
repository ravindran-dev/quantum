FROM node:18-slim

# Install compilers
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create temp directory for code execution
RUN mkdir -p temp

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
