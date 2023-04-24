# Base image
FROM node:14.16.0-alpine3.13

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining application files
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start-local"]
