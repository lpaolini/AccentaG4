/*
  SerialBridge.cpp - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#include "SerialBridge.h"

SerialBridge::SerialBridge(HardwareSerial &serial, long linkSpeed,
                           int statusLed)
    : serial(serial) {
    this->linkSpeed = linkSpeed;
    this->statusLed = statusLed;
}

void SerialBridge::start() { serial.begin(linkSpeed); }

void SerialBridge::stop() { serial.end(); }

bool SerialBridge::isDisabled() { return digitalRead(READY_PIN); }

void SerialBridge::waitUntilReady() {
    while (digitalRead(READY_PIN)) {
        digitalWrite(statusLed, HIGH);
        delay(BRIDGE_DOWN_BLINK_RATE_MS);
        digitalWrite(statusLed, LOW);
        delay(BRIDGE_DOWN_BLINK_RATE_MS);
    }
}

void SerialBridge::check() {
    if (isDisabled()) {
        Serial.println("Bridge disabled");
        stop();
        waitUntilReady();
        start();
        Serial.println("Bridge enabled");
    }
}

void SerialBridge::blink() {
    unsigned long currentMillis = millis();
    if (currentMillis > nextBlink) {
        nextBlink = currentMillis + BRIDGE_UP_BLINK_RATE_MS;
        ledState = !ledState;
        digitalWrite(statusLed, ledState);
    }
}

void SerialBridge::begin() {
    pinMode(READY_PIN, INPUT_PULLUP);
    pinMode(statusLed, OUTPUT);
    digitalWrite(statusLed, HIGH);
    delay(2500);
    start();
    digitalWrite(statusLed, LOW);
    check();
}

void SerialBridge::end() { stop(); }

void SerialBridge::loop() {
    check();
    blink();
}
