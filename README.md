# AccentaG4
Virtual keypad for Honeywell Security Accenta G4 panel.

## Introduction
Accenta G4 is a simple, reliable, affordable intruder alarm panel made by Honeywell Security.

It works very well for residential use but, clearly, it’s not designed for extension. You cannot expand zones, you can’t operate it remotely with your smartphone, it doesn’t expose a standard serial interface to play with.

Recently, I started dreaming of a more sophisticated panel, and after thinking for a while of upgrading to more advanced one, I decided it was time to hack mine.

After a bit of googling, I found a blog with a couple of interesting posts ([this](https://inmachinablog.wordpress.com/2015/11/04/accenta-alarm-keypad-protocol/) and [this](https://inmachinablog.wordpress.com/2015/11/03/decoding-the-alarm-keypad-protocol/)) providing useful background on the protocol and signalling used on the keypad bus, along with a description of the messages exchanged between the keypad and the panel.

## Keypad bus

The keypads (in [LED](https://www.security.honeywell.com/uk/products/intruder/control-panels/gen4/462382.html) and [LCD](https://www.security.honeywell.com/uk/products/intruder/control-panels/gen4/462383.html) variants) communicate with the panel over a single wire (half-duplex, shared bus) using TTL levels (+5v low, 0v high). A quick analysis with the logic analyzer revealed a slightly unusual protocol: RS-232 with 8 bit of data, *mark/space parity* and 1 stop bit or, if you prefer, *9 bit* of data and 1 stop bit, which is the same.

Any message sent over the bus has *mark* parity (1) on the first character and *space* parity (0) on the remaining characters of the message.

## Messaging protocol

Luckily, all communication between panel and keypads is not encrypted nor obfuscated. In fact, the protocol is fairly straightforward.

### Messages sent by the keypad

Apparently, the keypad sends just one type of command over the bus:
```
K <code> <checksum>
```
The “K” character has mark parity.

\<code\> is the code representing a physical or virtual (key combination) button on the keypad:
```
Code ASCII Type            Button 
---- ----- -----------------------
0x30 ("0") physical button 0
0x31 ("1") physical button 1
0x32 ("2") physical button 2
0x33 ("3") physical button 3
0x34 ("4") physical button 4
0x35 ("5") physical button 5
0x36 ("6") physical button 6
0x37 ("7") physical button 7
0x38 ("8") physical button 8
0x39 ("9") physical button 9
0x3a (":") physical button chime
0x3b (";") physical button omit
0x3c ("<") physical button cancel
0x3d ("=") physical button program
0x3e (">") physical button confirm
0x3f ("?") physical button select
0xaa (n/a) virtual button  panic
```
### Messages sent by the panel

The panel sends out one or more messages whenever it needs to update the status displayed on the keypads. Messages of a given type are sent only if they differ from the previous message of the same type.

Each message ends with a , which is the 8-bit sum of all the previous bytes of the message being sent.

Please note some responses are sent exclusively as audible tones, delivered as analogue signals via a separate keypad bus wire labeled *SOUNDS*.

#### Messages for the LED keypad

Whenever the status of at least one of the LEDs needs to be updatetd a new “P” message is sent:
```
P <zone info> <other info> <checksum>
```
The “P” character has MARK parity.

\<zone info\> is a byte where each bit represents one zone LED:
```
bit 0: ZONE 1 LED
bit 1: ZONE 2 LED
bit 2: ZONE 3 LED
bit 3: ZONE 4 LED
bit 4: ZONE 5 LED
bit 5: ZONE 6 LED
bit 6: ZONE 7 LED
bit 7: ZONE 8 LED
```
\<other info\> is a byte encoded like follows:
```
bit 0: UNSET LED
bit 1: TAMPER LED
bit 2: SOS LED
bit 3: POWER LED
bit 4: not used (?)
bit 5: not used (?)
bit 6: not used (?)
bit 7: not used (?)
```
I'm not sure whether the LCD keypad consumes this message or ignores it.

#### Messages for the LCD keypad

Whenever the text displayed on the LCD needs to be updated a new “L” messages is sent:
```
L <lenght> <LCD data> <checksum>
```
The “L” character has MARK parity.

TBD

I'm pretty sure the LED keypad ignores "L" messages.

## To parity or not to parity…

As said, 8-bit with mark/space parity and 9-bit without parity are exactly the same thing.

In particular, 8-bit with mark parity is equivalent to 9-bit without parity when the 8-bit character is *OR*ed with 0x100 (256d, 100000000b).

So, it’s perfectly equivalent to forget about parity and simply think of alternate codes for the head of the message, with the 9th (or parity) bit set to 1:
```
"K" 0x4b --> 0x14b
"L" 0x4c --> 0x14c
"P" 0x50 --> 0x150
```
No matter how you look at it, having the 9th bit set exclusively for the head of the message is quite convenient, as it makes the receiving routine simpler and more robust.

## Hardware signals

Keypad bus aside, the panel board exposes also a few output signals representing the general status, for use with a digital communicator or a speech dialer. They are labelled as follows:

- FIRE (fire)
- PA (panic)
- INT (intruder)
- SET (alarm set)
- ABORT (alarm aborted)
- Signals are held at +13v and fall to 0v when active.

## The project

The idea is to build a keypad emulator exposing a standard serial interface to a linux machine.

In particular, it should accomplish the following tasks:

- monitor panel hardware signals (FIRE, PA, INT, SET, ABORT) and update the current status accordingly
- monitor the serial interface for "virtual keypresses" and transmit emulated keypad messages over the keypad bus
- monitor the keypad bus for incoming messages and update the current status accordingly
- monitor status changes and transmit updates over the serial interface in a convenient format

The circuit I'm proposing is based around [Arduino](https://www.arduino.cc/), a well-known opensource platform providing all the features needed for this project: it's powerful, it's easy to program, it can handle multiple serial ports (with some limitations), it’s very well documented and community support is great.

The variant of Arduino I have chosen is [Arduino Yún](https://www.arduino.cc/en/Main/ArduinoBoardYun), which combines an Arduino Leonardo with a small linux box running [OpenWRT](https://openwrt.org/).

## Wiring

Interfacing the panel with Arduino is pretty simple.

In fact, two digital I/O pins and a diode is all you need for connecting the single-wire keypad bus to distinct RX and TX ports.

IMG

An additional resistor and a zener diode can help limiting voltage and current across Arduino's I/O pins.

IMG

Panel signals (SET, ABORT, INT, PA, FIRE) can either source or sink current. If Arduino's input is configured as INPUT_PULLUP, a diode is enough to pull the input down to LOW logical level when the corresponding panel output is active (LOW).

IMG

However, the keypad bus is quite exposed and might be tampered with or be subject to interferences potentially harmful to Arduino. For this reasons, an opto-isolated design it's a much safer choice as it provides full electrical isolation between Arduino and the panel itself.

IMG

The circuit is designed to keep the opto-isolator LEDs off during standby, to maximize their life expectancy. Here is a short description of the resistors:

- R1 sets the current for the transmitting opto-isolator LED
- R2 limits the current into the opto-isolator transistor
- R3 sets the stand-by value of the receiver to logical zero (pull-up)
- R4 sets the current for the receiving opto-isolator LED
- R5 sets the base saturation current for T2
- R6 sets the base saturation current for T1

## Serial interface

Arduino code is built around the [SoftwareSerial9](https://github.com/edreanernst/SoftwareSerial9) library, capable of sending and receiving 9-bit messages, and [QueueArray](http://playground.arduino.cc/Code/QueueArray), a FIFO library.

The bundle also includes an example of Arduino sketch for interconnecting Arduino's hardware serial interface to the keypad bus.

Warning: the [original version by addible](https://github.com/addibble/SoftwareSerial9) contains a bug in the recv() method, fixed by [edreanernst](https://github.com/edreanernst) in the forked version I’m using.

TBC

