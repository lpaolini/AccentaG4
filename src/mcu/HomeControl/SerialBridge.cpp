/*
  SerialBridge.cpp - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#include "SerialBridge.h"

SerialBridge::SerialBridge(
    HardwareSerial &serial, long linkSpeed, int statusLed, 
    char enableChar, char disableChar, unsigned long enableGraceMillis, 
    void (*enableHandler)(HardwareSerial &serial, char enableChar),
    void (*disableHandler)(HardwareSerial &serial, char disableChar)
) : serial(serial) {
    this->linkSpeed = linkSpeed;
    this->statusLed = statusLed;
    this->enableChar = enableChar;
    this->disableChar = disableChar;
    this->enableGraceMillis = enableGraceMillis;
    this->enableHandler = enableHandler;
    this->disableHandler = disableHandler;
}

void SerialBridge::start() { serial.begin(linkSpeed); }

void SerialBridge::stop() { serial.end(); }

bool SerialBridge::isEnabled() {
    boolean withinGracePeriod = (enableGraceMillis == 0) || (millis() - lastEnabled < enableGraceMillis);
    return enabled && withinGracePeriod;
}

int SerialBridge::enabledAwareRead() {
    int c = serial.read();
    if (c == enableChar) {
        enabled = true;
        lastEnabled = millis();
        if (enableHandler) {
            enableHandler(serial, enableChar);
        }
        return -1;
    }
    if (c == disableChar) {
        enabled = false;
        if (disableHandler) {
            disableHandler(serial, disableChar);
        }
        return -1;
    }
    return c;
}

void SerialBridge::blink() {
    unsigned long currentMillis = millis();
    if (currentMillis > nextBlink) {
        nextBlink = currentMillis + BRIDGE_UP_BLINK_RATE_MS;
        ledState = isEnabled() && !ledState;
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

void SerialBridge::end() {
    stop();
    digitalWrite(statusLed, LOW);
}

void SerialBridge::loop() {
    blink();
}
