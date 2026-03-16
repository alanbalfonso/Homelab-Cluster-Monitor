FROM nginx:alpine

# Copiar archivos estáticos principales del frontend
COPY index.html /usr/share/nginx/html/
COPY database.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Copiar scripts modularizados
COPY js /usr/share/nginx/html/js

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
