# node-ipfs:pkg
FROM node:12-stretch

# Install the package
RUN npm install --global --unsafe-perm ipfs-http-client
RUN npm install --global --unsafe-perm elasticlunr

# Switch to smaller container
FROM node:12-alpine

# Get wait-for
COPY wait-for /wait-for
RUN chmod +x /wait-for

# Get the package from the other container
COPY --from=0 /usr/local/lib/node_modules /usr/local/lib/node_modules
# Put the package in PATH
ENV NODE_PATH /usr/local/lib/node_modules
ENV PATH /usr/local/lib/node_modules:$PATH

# Open some ports (which do we need?)
# Swarm TCP; should be exposed to the public
EXPOSE 4001
# Daemon API; must not be exposed publicly but to client services under you control
EXPOSE 5001
# Web Gateway; can be exposed publicly with a proxy, e.g. as https://ipfs.example.org
EXPOSE 8080
# Swarm Websockets; must be exposed publicly when the node is listening using the websocket transport (/ipX/.../tcp/8081/ws).
EXPOSE 8081

# Create and own the folder where we will get the app.
ENV APP_PATH /data/app
RUN mkdir -p $APP_PATH \
  && chown node:users -R $APP_PATH

# Switch to a non-privileged user.
USER node

# Expose the fs-repo as a volume.
# start_ipfs initializes an fs-repo if none is mounted.
# Important this happens after the USER directive so permission are correct.
# VOLUME $APP_PATH

WORKDIR $APP_PATH

# This waits indefinetly for ipfs0 on port 5001 and then runs the script with parameter ipfs0
CMD ["/bin/sh", "/wait-for", "ipfs0:5001", "--timeout=-1", "--", "npm", "run", "start", "ipfs0"]
