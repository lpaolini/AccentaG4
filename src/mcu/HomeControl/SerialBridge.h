/*
  SerialBridge.h - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef SerialBridge_h
#define SerialBridge_h

#define BLINK_RATE_MS 500

#include <Arduino.h>

class SerialBridge {
  private:
    long linkSpeed;
    int statusLed;
    char enableChar;
    char disableChar;
    unsigned long enableGraceMillis;
    void (*enableHandler)(HardwareSerial &serial, char enableChar);
    void (*disableHandler)(HardwareSerial &serial, char disableChar);
    void (*readHandler)(HardwareSerial &serial, char c);
    
    boolean enabled = false;
    unsigned long lastEnabled;
    int ledState = LOW;
    unsigned long nextBlink = 0;
    
    void start();
    void stop();
    void resetBlink();
    void blink();
    int enabledAwareRead();

  public:
    SerialBridge::SerialBridge(
        HardwareSerial &serial, long linkSpeed, int statusLed, 
        char enableChar, char disableChar, unsigned long enableGraceMillis, 
        void (*enableHandler)(HardwareSerial &serial, char enableChar),
        void (*disableHandler)(HardwareSerial &serial, char disableChar),
        void (*readHandler)(HardwareSerial &serial, char c)
    );
    HardwareSerial &serial;
    bool isEnabled();
    // int enabledAwareRead();
    void begin();
    void end();
    void loop();
};

#endif
