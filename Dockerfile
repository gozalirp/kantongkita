# Dockerfile untuk Google Cloud Run — SavingDuit
FROM node:20-alpine

# Set direktori kerja di dalam container
WORKDIR /app

# Salin seluruh file proyek
COPY . .

# Buat folder data untuk penyimpanan lokal jika diperlukan
RUN mkdir -p /app/data

# Port default Cloud Run (8080) atau PORT dari environment
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Jalankan server
CMD ["node", "server.js"]
