# Stage 1: Build Stage
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code and config files
COPY . .

# Build the TypeScript project
RUN npm run build

# Stage 2: Production Stage
FROM node:20-alpine AS runner

# Set environment to production
ENV NODE_ENV=production

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 5000

# Metadata labels
LABEL maintainer="RamNaren"
LABEL description="High-performance backend for Blog_Hive project"

# Run the server
CMD ["npm", "start"]
