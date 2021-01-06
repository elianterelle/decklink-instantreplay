#!/bin/bash

cp ./coreServer/instantreplay_core.service /etc/systemd/system/
cp ./replayServer/instantreplay_replay.service /etc/systemd/system/
cp ./webClient/instantreplay_client.service /etc/systemd/system/
cp ./arduinoClient/instantreplay_arduino.service /etc/systemd/system/