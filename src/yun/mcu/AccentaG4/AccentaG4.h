/*
  AccentaG4.h - Library for Accenta G4 panel.
  Created by Luca Paolini, March 23, 2017.
*/

#ifndef AccentaG4_h
#define AccentaG4_h

#include <Arduino.h>
#include <SoftwareSerial9.h>
#include <QueueArray.h>

#define BUS_SPEED        1200

#define MSG_MAXLEN		 32

#define K_DELAY_MS		 100
#define K_COMMAND        75
#define K_0              48
#define K_1              49
#define K_2              50
#define K_3              51
#define K_4              52
#define K_5              53
#define K_6              54
#define K_7              55
#define K_8              56
#define K_9              57
#define K_CHIME          58
#define K_OMIT           59
#define K_CANCEL         60
#define K_PROGRAM        61
#define K_CONFIRM        62
#define K_SOS            170

#define L_COMMAND        76
#define P_COMMAND        80

class AccentaG4 {
	private:
		SoftwareSerial9 serial;
		char setPin, abortPin, intPin, paPin;
		void (*msgHandler)(char type, char* msg);
		struct Tx {
			QueueArray <char> queue;
			unsigned long last;
		} tx;
		struct Rx {
			unsigned int current;
			char data[MSG_MAXLEN];
			char ptr;
		} rx;
		struct Status {
			int signals;
			int led;
			char lcd[50];
		} status;
		boolean validateChecksum(char expectedChecksum);
		void readBusMessages();
		void readPanelSignals();
		void sendCommands();
		void setPanelSignals(int signals);
		void getPanelSignals();
		void setLedStatus(struct Rx rx);
		void getLedStatus();
		void setLcdStatus(struct Rx rx);
		void getLcdStatus();

	public:
		AccentaG4(uint8_t rxPin, uint8_t txPin, 
			uint8_t setPin, uint8_t abortPin, uint8_t intPin, uint8_t paPin, 
			void (*msgHandler)(char type, char* msg));
		void begin();
		void end();
		void sendKey(char key);
		void loop();
		void queryStatus();
};

#endif
