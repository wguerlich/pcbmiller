pcbmiller
=========

Chrome app spezialized in PCB milling using a GRBL controller

This project is not useable yet.

It aims at providing an easy to use GUI to the GRBL controller for sole purpose of milling PCBs.

What it should do:

- take your GCode files (probably made with pcb2gcode) and make them grbl compatible
- show a preview
- surface probe your PCB material and provide autolevelling
- reliably stream the modified gcode to your grbl controller

What it could do in addition:

- flash your arduino to the latest supported grbl version
- help you setup your grbl controller (custom compile and config)
- make gcode from your gerber files by running pcb2gcode as a service
