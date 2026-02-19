# Stage 1: Build the Go application
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod ./
# (Check if go.sum exists before copying, or just skip if not present)
# COPY go.sum ./

# Copy the source code
COPY . .

# Download all dependencies and generate go.sum
RUN go mod tidy && go mod download

# Build the application
RUN go build -o main .

# Stage 2: Run the application
FROM alpine:latest

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/main .

# Expose port 3001
EXPOSE 3001

# Command to run the application
CMD ["./main"]
