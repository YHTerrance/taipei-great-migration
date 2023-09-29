# syntax = docker/dockerfile:1
FROM oven/bun as base

LABEL fly_launch_runtime="Bun"

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y python-is-python3 pkg-config build-essential

# Install node modules
COPY --link package.json .
RUN bun install

# Copy application code
COPY --link . .

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
CMD [ "bun", "run", "start" ]
