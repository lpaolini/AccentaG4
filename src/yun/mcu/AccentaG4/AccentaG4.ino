#include "AccentaG4.h"

#define COMMS_RX_PIN     10
#define COMMS_TX_PIN     11

#define SIG_ABORT_PIN    2
#define SIG_SET_PIN      3
#define SIG_INT_PIN      4
#define SIG_PA_PIN       5

#define READY_PIN        7
#define STATUS_LED       13

#define LINK_SPEED       115200
#define CONSOLE_SPEED    115200

#define HEARTBEAT_MS     2000

unsigned long lastMessage;
unsigned long timestamp;

void sendMessage(String msg) {
  handleMessage(msg);
  timestamp = millis();
}

void handleMessage(String msg) {
  // forward panel to Yun bridge
  Serial1.println(msg);
  // forward panel to local serial
  Serial.println(msg);
  lastMessage = millis();
}

void heartbeat() {
	if (millis() - lastMessage > HEARTBEAT_MS) {
		char age[7];
		sprintf(age, "%lu\0", (millis() - timestamp) / 1000);
		handleMessage("H:" + String(age));
	}
}

void startBridge() {
  Serial1.begin(LINK_SPEED);
}

void stopBridge() {
  Serial1.end(); 
}

void checkBridge() {
  // Wait for the ready pin to go low, signaling that the AR3391 is fully booted.
  if (digitalRead(READY_PIN)) {
    Serial.println("Bridge disabled");
    stopBridge();
    while (digitalRead(READY_PIN)) {
      // The pin is still high, so give the LED a quick flash to show we're waiting.
      digitalWrite(STATUS_LED, HIGH);
      delay(100);
      digitalWrite(STATUS_LED, LOW);
      delay(100);
    }
    startBridge();
    Serial.println("Bridge enabled");
  } else {
    digitalWrite(STATUS_LED, LOW);
  }
}

AccentaG4 panel(COMMS_RX_PIN, COMMS_TX_PIN, SIG_SET_PIN, SIG_ABORT_PIN, SIG_INT_PIN, SIG_PA_PIN, sendMessage);

void setupPanel() {
  pinMode(READY_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, HIGH);

  // Give a delay for the AR3391 to reset, in case we were reset as part of a reboot command.
  // See http://playground.arduino.cc/Hardware/Yun#rebootStability, case 3.
  delay(2500);
  Serial.begin(CONSOLE_SPEED);
  startBridge();
  panel.begin();
  Serial.println("Ready");
}

void setup() {
    setupPanel();
}

void loop() {  
  checkBridge();

  // forward local serial to panel  
  if (Serial.available()) {
    panel.sendKey(Serial.read());
  }

  // forward Yun bridge to panel
  if (Serial1.available()) {
    panel.sendKey(Serial1.read());
  }
    
  panel.loop();
  heartbeat();
}
