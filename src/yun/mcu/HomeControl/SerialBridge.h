/*
  SerialBridge.h - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef SerialBridge_h
#define SerialBridge_h

#define BRIDGE_UP_BLINK_RATE_MS 500
#define BRIDGE_DOWN_BLINK_RATE_MS 100

#include <Arduino.h>

class SerialBridge {
  private:
    long linkSpeed;
    int statusLed;
    unsigned long heartbeatWindow;
    boolean heartbeatEnabled = false;
    unsigned long lastHeartbeat;

    int ledState = LOW;
    unsigned long nextBlink = 0;
    void start();
    void stop();
    void blink();

  public:
    SerialBridge::SerialBridge(HardwareSerial &serial, long linkSpeed, int statusLed, unsigned long heartbeatWindow);
    HardwareSerial &serial;
    void heartbeat();
    bool isActive();
    void begin();
    void end();
    void loop();
};

#endif
