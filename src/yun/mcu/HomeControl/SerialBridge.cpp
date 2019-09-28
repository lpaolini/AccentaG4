/*
  SerialBridge.cpp - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#include "SerialBridge.h"

SerialBridge::SerialBridge(HardwareSerial &serial, long linkSpeed, int statusLed, unsigned long heartbeatWindow)
    : serial(serial) {
    this->linkSpeed = linkSpeed;
    this->statusLed = statusLed;
    this->heartbeatWindow = heartbeatWindow;
}

void SerialBridge::start() { serial.begin(linkSpeed); }

void SerialBridge::stop() { serial.end(); }

void SerialBridge::heartbeat() {
    heartbeatEnabled = true;
    lastHeartbeat = millis();
}

bool SerialBridge::isActive() {
    boolean withinHeartbeatWindow = millis() - lastHeartbeat < heartbeatWindow;
    return heartbeatEnabled && withinHeartbeatWindow;
}

void SerialBridge::blink() {
    unsigned long currentMillis = millis();
    if (currentMillis > nextBlink) {
        nextBlink = currentMillis + BRIDGE_UP_BLINK_RATE_MS;
        ledState = isActive() && !ledState;
        digitalWrite(statusLed, ledState);
    }
}

void SerialBridge::begin() {
    pinMode(statusLed, OUTPUT);
    digitalWrite(statusLed, HIGH);
    delay(2500);
    start();
    digitalWrite(statusLed, LOW);
}

void SerialBridge::end() { stop(); }

void SerialBridge::loop() {
    blink();
}
