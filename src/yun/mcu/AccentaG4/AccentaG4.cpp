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
	pinMode(setPin, INPUT_PULLUP);
	pinMode(abortPin, INPUT_PULLUP);
	pinMode(intPin, INPUT_PULLUP);
	pinMode(paPin, INPUT_PULLUP);
}

void AccentaG4::begin() {
	serial.begin(BUS_SPEED);
	tx.last = millis();
}

void AccentaG4::end() {
	serial.end();
}

void AccentaG4::sendKey(char key) {
    switch (key) {
      case '0': tx.queue.push(K_0); break;
      case '1': tx.queue.push(K_1); break;
      case '2': tx.queue.push(K_2); break;
      case '3': tx.queue.push(K_3); break;
      case '4': tx.queue.push(K_4); break;
      case '5': tx.queue.push(K_5); break;
      case '6': tx.queue.push(K_6); break;
      case '7': tx.queue.push(K_7); break;
      case '8': tx.queue.push(K_8); break;
      case '9': tx.queue.push(K_9); break;
      case 'c': tx.queue.push(K_CHIME); break;
      case 'o': tx.queue.push(K_OMIT); break;
      case 'x': tx.queue.push(K_CANCEL); break;
      case 'p': tx.queue.push(K_PROGRAM); break;
      case 'v': tx.queue.push(K_CONFIRM); break;
      case 's': tx.queue.push(K_SELECT); break;
      case '!': tx.queue.push(K_SOS); break;
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
	while (serial.available()) {
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
					} else if (rx.ptr == 3) {
						// byte 3: checksum
						if (validateChecksum(rx.current)) {
							setLedStatus(rx);
						}
						rx.ptr++;
					}
					break;
				case L_COMMAND:
					if (rx.ptr == 1 || rx.ptr < rx.data[1] + 2) {
						// byte 1: length
						// byte 2 to length + 1: data
						rx.data[rx.ptr++] = rx.current;
					} else if (rx.ptr == rx.data[1] + 2) {
						// byte length + 2: checksum
						if (validateChecksum(rx.current)) {
							rx.data[rx.ptr] = '\0'; // terminate string
							setLcdStatus(rx);
						}
						rx.ptr++;
					}
					break;
				default:
					break; // ignore other messages
			}
		}
	}
}

void AccentaG4::setTimestamp() {
	status.timestamp = millis();
}

void AccentaG4::setPanelSignals(int signals) {
	if (signals != status.signals) {
		status.signals = signals;
		setTimestamp();
		sendPanelSignals();
	}
}

void AccentaG4::sendPanelSignals() {
	// SET, ABORT, INTRUDER, PANIC
	char value[] = PANEL_SIGNALS;
	for (int i = 0; i < 4; i++) {
		bitRead(status.signals, i) || (value[i] = '.');
	}
	sendMessage('S', value);
}

void AccentaG4::setLedStatus(struct Rx rx) {
	status.led = rx.data[2] << 8 | rx.data[1];
	setTimestamp();
	sendLedStatus();
}

void AccentaG4::sendLedStatus() {
	// ZONE 1-8, UNSET, TAMPER, SOS, POWER
	char value[] = LED_STATUS;
	for (int i = 0; i < 12; i++) {
		bitRead(status.led, i) || (value[i] = '.');
	}
	sendMessage('P', value);
}

void AccentaG4::setLcdStatus(struct Rx rx) {
	strncpy(status.lcd, rx.data + 2, rx.ptr - 1);
	setTimestamp();
	sendLcdStatus();
}

void AccentaG4::sendLcdStatus() {
	sendMessage('L', status.lcd);
}

void AccentaG4::sendMessage(char type, char* msg) {
	msgHandler(type, msg);
	lastMessage = millis();
}

void AccentaG4::sendHeartbeat() {
	if (millis() - lastMessage > HEARTBEAT_MS) {
		sprintf(age, "%lu\0", (millis() - status.timestamp) / 1000);
		sendMessage('H', age);
	}
}

void AccentaG4::sendCommands() {
	// send keypad commands
	if (tx.queue.count() && millis() - tx.last > K_DELAY_MS) { // throttle tx
		char key = tx.queue.pop();
		serial.stopListening();
		serial.write9(K_COMMAND | 0x100); // K cmd: emulate MARK parity
		serial.write9(key & 0xff); // key: emulate SPACE parity
		serial.write9((K_COMMAND + key) & 0xff); // checksum: emulate SPACE parity
		serial.listen();
		tx.last = millis();
	}
}

void AccentaG4::queryStatus() {
	sendPanelSignals();
	sendLedStatus();
	sendLcdStatus();
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
	sendHeartbeat();
}
