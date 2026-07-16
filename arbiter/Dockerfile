FROM alpine:3.19

# Install Node.js and npm in Alpine
RUN apk add --no-cache nodejs npm

# Setup working directory
WORKDIR /app

# Copy dependency specifications and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source scripts
COPY src/ ./src/

# Standard iExec enclave execution entrypoint
ENTRYPOINT ["node", "/app/src/enclave-script.js"]
```
