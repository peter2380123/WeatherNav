FROM node:12
MAINTAINER peichun.chien@connect.qut.edu.au
ADD weather-nav /app
WORKDIR /app
RUN npm install
EXPOSE 80
ENV PORT 80
CMD ["npm", "start"]