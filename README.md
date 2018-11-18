# Service Mesh Demo

Demo REST service which know about its peers running on same network.

E.g. it is self discoverable, something similar to how ElasticSearch works.

After `docker-compose up` you can run `docker-compose scale server=5` and each of 5 instancess will know about each other, so can talk to each other.

# How it works

Service sends and listens to udp broadcast messages.

On start we are sending `ping`. Right before exit - `bye`.

Each instance responponds to `ping` with `pong` message which contains known peers.

On `pong` message known and remote peers merged.

For cases of network failures we are sending `ping` every 5 seconds, also there is timer which check peers liveness to remove any dead peers.

In case of network split peers will cleanup but right after network recovery everyone will see each other again.

TODO:

https://stackoverflow.com/questions/31193597/simulate-different-network-condition-in-docker

https://github.com/agladkowski/docker-network-failure-simulation
