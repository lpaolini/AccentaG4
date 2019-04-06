#include "SerialBridge.h"
#include "AccentaG4.h"
#include "Sensors.h"

#define COMMS_RX_PIN 10
#define COMMS_TX_PIN 11
#define SIG_ABORT_PIN 2
#define SIG_SET_PIN 3
#define SIG_INT_PIN 4
#define SIG_PA_PIN 5
#define STATUS_LED 13
#define LINK_SPEED 115200
#define CONSOLE_SPEED 115200
#define HEARTBEAT_MS 2000
#define SENSORS_DELAY 5000

unsigned long nextHeartbeat = millis() + HEARTBEAT_MS;
unsigned long lastMessage;
unsigned long nextLoop = millis();
bool ledOn = false;

void sendMessage(String msg) {
    handleMessage(msg);
    lastMessage = millis();
}

void heartbeat() {
    if (millis() > nextHeartbeat) {
        handleMessage("HBT:" + String((millis() - lastMessage) / 1000));
    }
}

SerialBridge bridge(Serial1, LINK_SPEED, STATUS_LED);

AccentaG4 alarm(COMMS_RX_PIN, COMMS_TX_PIN, SIG_SET_PIN, SIG_ABORT_PIN,
                SIG_INT_PIN, SIG_PA_PIN, sendMessage);

Sensors sensors(SENSORS_DELAY, sendMessage);

void handleMessage(String msg) {
    bridge.serial.println(msg);
    nextHeartbeat = millis() + HEARTBEAT_MS;
}

void setup() {
    bridge.begin();
    alarm.begin();
    sensors.begin();
    Serial.println("Ready");
}

void loop() {
    if (millis() > nextLoop) {
        if (ledOn) {
            digitalWrite(STATUS_LED, LOW);
            nextLoop += 900;
        } else {
            digitalWrite(STATUS_LED, HIGH);
            nextLoop += 100;
        }
        ledOn = !ledOn;
    }
    bridge.loop();
    alarm.loop();
    sensors.loop();
    if (bridge.serial.available()) {
        alarm.sendKey(bridge.serial.read());
    }
    heartbeat();
}
