FROM node:12
MAINTAINER peichun.chien@connect.qut.edu.au
ADD . /app
WORKDIR /app
RUN npm install
EXPOSE 80
ENV PORT 80
CMD ["npm", "start"]