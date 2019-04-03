/*
  SerialBridge.h - mcu <=> mpu serial bridge
  Created by Luca Paolini, April 3, 2019.
*/

#ifndef SerialBridge_h
#define SerialBridge_h

#define READY_PIN 7

#include <Arduino.h>

class SerialBridge {
	private:
    long linkSpeed;
    int statusLed;
		void start();
		void stop();
		void check();

	public:
    SerialBridge::SerialBridge(HardwareSerial &serial, long linkSpeed, int statusLed);
    HardwareSerial &serial;
    void begin();
		void end();
		void loop();
};

#endif
