FROM alpine:latest

RUN apk update
RUN apk add openjdk8

COPY ./build/server .
COPY ./assets/mc-1.7.10-server.jar .
COPY ./assets/forge-1.7.10-10.13.4.1614-1.7.10-installer.jar .
RUN echo 'eula=true' > eula.txt
RUN java -jar forge-1.7.10-10.13.4.1614-1.7.10-installer.jar --installServer
RUN rm forge-1.7.10-10.13.4.1614-1.7.10-installer.jar
CMD java -jar forge-1.7.10-10.13.4.1614-1.7.10-universal.jar