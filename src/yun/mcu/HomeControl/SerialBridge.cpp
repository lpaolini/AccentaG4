/*
  SerialBridge.cpp - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#include "SerialBridge.h"

SerialBridge::SerialBridge(HardwareSerial &serial, long linkSpeed, int statusLed) : serial(serial) {
     this->linkSpeed = linkSpeed;
     this->statusLed = statusLed;
}

void SerialBridge::start() {
    serial.begin(linkSpeed);
}

void SerialBridge::stop() {
    serial.end();
}

void SerialBridge::check() {
    // Wait for mpu boot complete
    if (digitalRead(READY_PIN)) {
        Serial.println("Bridge disabled");
        stop();
        while (digitalRead(READY_PIN)) {
            // Flash led while waiting
            digitalWrite(statusLed, HIGH);
            delay(100);
            digitalWrite(statusLed, LOW);
            delay(100);
        }
        start();
        Serial.println("Bridge enabled");
    } else {
        digitalWrite(statusLed, LOW);
    }
}

void SerialBridge::begin() {
    pinMode(READY_PIN, INPUT_PULLUP);
    pinMode(statusLed, OUTPUT);
    digitalWrite(statusLed, HIGH);
    delay(2500);
    start();
    check();
}

void SerialBridge::end() {
    stop();
}

void SerialBridge::loop() {
    check();
}
