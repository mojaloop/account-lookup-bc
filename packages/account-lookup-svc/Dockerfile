FROM node:18.13.0-alpine AS builder

# Create the project directory inside the container.
WORKDIR /app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 libtool autoconf pkgconfig automake bash # wget tar xz

RUN cd $(npm root -g)/npm
RUN npm config set unsafe-perm true
RUN npm install -g node-gyp

# Copy all package and package-lock json files
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY packages/domain-lib/package*.json ./packages/domain-lib/
COPY packages/implementations-lib/package*.json ./packages/implementations-lib/
COPY packages/account-lookup-svc/package*.json ./packages/account-lookup-svc/


# If you are building your code for production
#RUN npm ci --only=production
RUN npm install

########################################
# Copy code and build

# root tsconfig.json
COPY tsconfig.json ./

# copy required supporting packages/packages (especially private ones not published to npm)
COPY packages/domain-lib ./packages/domain-lib
COPY packages/implementations-lib ./packages/implementations-lib

# copy service code
COPY packages/account-lookup-svc ./packages/account-lookup-svc

# build
RUN npm run build


FROM node:18.13-alpine
WORKDIR /app

COPY --from=builder /app .

EXPOSE 3030

CMD [ "npm", "run", "start:account-lookup-svc" ]
