FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM scratch
COPY --from=build /app/dist /opt/static_app
