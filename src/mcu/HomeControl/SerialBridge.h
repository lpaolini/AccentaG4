/*
  SerialBridge.h - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef SerialBridge_h
#define SerialBridge_h

#define BLINK_RATE_MS 500
#define BLINK_DURATION_MS 100

#include <Arduino.h>

class SerialBridge {
  private:
    long linkSpeed;
    int statusLed;
    char enableChar;
    char disableChar;
    unsigned long enableGraceMillis;
    void (*enableHandler)(HardwareSerial serial, char enableChar, boolean justEnabled);
    void (*disableHandler)(HardwareSerial serial, char disableChar, boolean justDisabled);
    void (*readHandler)(HardwareSerial serial, char readChar);
    
    boolean enabled = false;
    unsigned long lastEnabled;
    int ledState = LOW;
    unsigned long nextBlink = 0;
    
    void start();
    void stop();
    void resetBlink();
    void blink();
    void read();

  public:
    SerialBridge(
        HardwareSerial &serial, long linkSpeed, int statusLed, 
        char enableChar, char disableChar, unsigned long enableGraceMillis, 
        void (*enableHandler)(HardwareSerial serial, char enableChar, boolean justEnabled),
        void (*disableHandler)(HardwareSerial serial, char disableChar, boolean justEnabled),
        void (*readHandler)(HardwareSerial serial, char readChar)
    );
    HardwareSerial &serial;
    boolean isEnabled();
    void begin();
    void end();
    void loop();
};

#endif
