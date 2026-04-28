# ===========================
# Stage 1: Build React app
# ===========================
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build arguments (passed from docker-compose.yml)
ARG REACT_APP_ENV
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_CLIENT_ID
ARG REACT_APP_CLIENT_SECRET
ARG REACT_APP_SECRET_KEY
ARG REACT_APP_ENABLE_AI

# Pass args directly into build (CRA picks up REACT_APP_* automatically)
RUN REACT_APP_ENV=$REACT_APP_ENV \
    REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL \
    REACT_APP_CLIENT_ID=$REACT_APP_CLIENT_ID \
    REACT_APP_CLIENT_SECRET=$REACT_APP_CLIENT_SECRET \
    REACT_APP_SECRET_KEY=$REACT_APP_SECRET_KEY \
    REACT_APP_ENABLE_AI=$REACT_APP_ENABLE_AI \
    npm run build


# ===========================
# Stage 2: Serve with Nginx
# ===========================
FROM nginx:1.25
WORKDIR /usr/share/nginx/html

# CRA uses /build, Vite uses /dist — pick one
COPY --from=build /app/build ./
# COPY --from=build /app/dist ./   # ← if Vite

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
