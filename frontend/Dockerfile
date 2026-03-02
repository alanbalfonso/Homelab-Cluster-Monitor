FROM nginx:alpine

# Copiar archivos del frontend
COPY index.html /usr/share/nginx/html/
COPY database.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
