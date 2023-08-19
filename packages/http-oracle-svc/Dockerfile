FROM node:18.13.0-alpine AS builder

# Create the project directory inside the container.
WORKDIR /app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 \
    libtool autoconf pkgconfig automake librdkafka-dev bash # wget tar xz

RUN cd $(npm root -g)/npm
RUN npm config set unsafe-perm true
RUN npm install -g node-gyp

# Copy all package and package-lock json files
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY packages/http-oracle-svc/package*.json ./packages/http-oracle-svc/


# If you are building your code for production
#RUN npm ci --only=production
RUN BUILD_LIBRDKAFKA=0 npm install

########################################
# Copy code and build

# root tsconfig.json
COPY tsconfig.json ./

# copy service code
COPY packages/http-oracle-svc ./packages/http-oracle-svc

# build
RUN npm run build


FROM node:18.13-alpine
WORKDIR /app

RUN apk add librdkafka

COPY --from=builder /app .

EXPOSE 3031

CMD [ "npm", "run", "start:http-oracle-svc" ]
