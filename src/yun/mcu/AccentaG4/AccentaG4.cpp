/*
  AccentaG4.cpp - Library for Accenta G4 panel.
  Created by Luca Paolini, March 23, 2017.
*/

#include "AccentaG4.h"

AccentaG4::AccentaG4(uint8_t rxPin, uint8_t txPin, 
	uint8_t setPin, uint8_t abortPin, uint8_t intPin, uint8_t paPin, 
	void (*msgHandler)(char type, char* msg)) : serial(rxPin, txPin) {
	this->setPin = setPin;
	this->abortPin = abortPin;
	this->intPin = intPin;
	this->paPin = paPin;
	this->msgHandler = msgHandler;
	if (setPin) pinMode(setPin, INPUT_PULLUP);
	if (abortPin) pinMode(abortPin, INPUT_PULLUP);
	if (intPin) pinMode(intPin, INPUT_PULLUP);
	if (paPin) pinMode(paPin, INPUT_PULLUP);
}

void AccentaG4::begin() {
	serial.begin(BUS_SPEED);
	txLast = millis();
}

void AccentaG4::end() {
	serial.end();
}

void AccentaG4::sendKey(char key) {
    switch (key) {
      case '0': txQueue.push(K_0); break;
      case '1': txQueue.push(K_1); break;
      case '2': txQueue.push(K_2); break;
      case '3': txQueue.push(K_3); break;
      case '4': txQueue.push(K_4); break;
      case '5': txQueue.push(K_5); break;
      case '6': txQueue.push(K_6); break;
      case '7': txQueue.push(K_7); break;
      case '8': txQueue.push(K_8); break;
      case '9': txQueue.push(K_9); break;
      case 'c': txQueue.push(K_CHIME); break;
      case 'o': txQueue.push(K_OMIT); break;
      case 'x': txQueue.push(K_CANCEL); break;
      case 'p': txQueue.push(K_PROGRAM); break;
      case 'v': txQueue.push(K_CONFIRM); break;
      case 's': txQueue.push(K_SOS); break;
      case '?': queryStatus(); break;    
    }
}

void AccentaG4::readPanelSignals() {
	int signals;
	bitWrite(signals, 0, setPin && !digitalRead(setPin));
	bitWrite(signals, 1, abortPin && !digitalRead(abortPin));
	bitWrite(signals, 2, intPin && !digitalRead(intPin));
	bitWrite(signals, 3, paPin && !digitalRead(paPin));
	setPanelSignals(signals);
}

void AccentaG4::readBusMessages() {
	// read keypad messages
	while (serial.available()) {sendCommands();
		rx.current = serial.read();
		if (rx.current & 0x100) { // mark parity -> start of message
			rx.data[0] = rx.current & 0xff; // drop parity bit
			rx.ptr = 1;
		} else if (rx.ptr < MSG_MAXLEN) {
			switch (rx.data[0]) {
				case P_COMMAND:
					if (rx.ptr < 3) {
						// bytes 1 and 2: data
						rx.data[rx.ptr++] = rx.current;
					} else {
						// byte 3: checksum
						if (validateChecksum(rx.current)) {
							setLedStatus(rx);
						}
						rx.ptr = 0;
					}
					break;
				case L_COMMAND:
					if (rx.ptr == 1 || rx.ptr < rx.data[1] + 2) {
						// byte 1: length
						// byte 2 to length + 1: data
						rx.data[rx.ptr++] = rx.current;
					} else {
						// byte length + 2: checksum
						if (validateChecksum(rx.current)) {
							setLcdStatus(rx);
						}
						rx.ptr = 0;
					}
					break;
				default:
					break; // ignore other commands
			}
		}
	}
}

void AccentaG4::setPanelSignals(int signals) {
	if (signals != status.signals) {
		status.signals = signals;
		getPanelSignals();
	}
}

void AccentaG4::getPanelSignals() {
  const char templ[4] = {'S', 'A', 'I', 'P'};
	char value[5];
	// SET, ABORT, INTRUDER, PANIC
	for (int i = 0; i < 4; i++) {
		value[i] = bitRead(status.signals, i) ? templ[i] : '.';
	}
	value[4] = '\0';
	msgHandler('S', value);
}

void AccentaG4::setLedStatus(struct Rx rx) {
	status.led = rx.data[2] << 8 | rx.data[1];
	getLedStatus();
}

void AccentaG4::getLedStatus() {
	const char templ[12] = {'1', '2', '3', '4', '5', '6', '7', '8', 'U', 'T', 'H', 'M'};
	char value[13];
	// ZONE 1-8, UNSET, TAMPER, SOS, POWER
	for (int i = 0; i < 12; i++) {
		value[i] = bitRead(status.led, i) ? templ[i] : '.';
	}
	value[12] = '\0';
	msgHandler('P', value);
}

void AccentaG4::setLcdStatus(struct Rx rx) {
	rx.data[rx.ptr] = '\0'; // terminate string
	strcpy(status.lcd, rx.data + 2);
	getLcdStatus();
}

void AccentaG4::getLcdStatus() {
	msgHandler('L', status.lcd);
}

void AccentaG4::sendCommands() {
	// send keypad commands
	if (txQueue.count() && millis() - txLast > K_DELAY_MS) { // throttle tx
		char key = txQueue.pop();
		serial.write9(K_COMMAND | 0x100); // K cmd: emulate MARK parity
		serial.write9(key & 0xff); // key: emulate SPACE parity
		serial.write9((K_COMMAND + key) & 0xff); // checksum: emulate SPACE parity
		txLast = millis();
	}
}

void AccentaG4::queryStatus() {
	getPanelSignals();
	getLedStatus();
	getLcdStatus();
}

boolean AccentaG4::validateChecksum(char expectedChecksum) {
	char checksum = 0;
	for (int i = 0; i < rx.ptr; i++) {
		checksum += rx.data[i];
	}
	return checksum == expectedChecksum;
}

void AccentaG4::loop() {
	readPanelSignals();
	readBusMessages();
	sendCommands();
}
