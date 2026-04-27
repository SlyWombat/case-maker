# Board Library Audit

Per-board status of the dimensional research backing each built-in `BoardProfile`. Tracking issue: [#22](https://github.com/SlyWombat/case-maker/issues/22).

For each entry the table records:

- **Source** — primary mechanical drawing (manufacturer datasheet or board file).
- **Cross-reference** — independent confirmation (open-source CAD, well-cited community wiki).
- **Method** — `datasheet` (transcribed from PDF), `open-source-cad` (parsed from KiCad/STEP), or `physical-measurement` (measured by hand against a reference unit).
- **Notes** — anything surprising or not matchable to the datasheet.

Initial population: only the `Source` columns reflect the JSON `source` field. The other columns are blank pending the manual audit. Once a board has been verified, fill in the other columns and add the matching fields to the JSON profile.

## Audit status

| Board ID | Source | Cross-reference | Method | Notes |
|---|---|---|---|---|
| `rpi-4b` | https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-mechanical-drawing.pdf | _pending_ | _pending_ | |
| `rpi-5` | https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-mechanical-drawing.pdf | _pending_ | _pending_ | |
| `rpi-zero-2w` | https://datasheets.raspberrypi.com/rpizero2/raspberry-pi-zero-2-w-mechanical-drawing.pdf | _pending_ | _pending_ | |
| `rpi-pico` | https://datasheets.raspberrypi.com/pico/Pico-R3-A4-Pinout.pdf | _pending_ | _pending_ | |
| `arduino-uno-r3` | https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf | _pending_ | _pending_ | |
| `arduino-giga-r1-wifi` | https://docs.arduino.cc/resources/datasheets/ABX00063-datasheet.pdf | _pending_ | _pending_ | Antenna connector position is approximate; verify against board-edge µFL pad. |
| `esp32-devkit-v1` | https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/esp32/get-started-devkitc.html | _pending_ | _pending_ | DevKit V1 (DOIT 30-pin) — non-Espressif clone — silicon spec ≠ board spec. |
| `teensy-41` | https://www.pjrc.com/store/teensy41.html | _pending_ | _pending_ | |
| `jetson-nano-b01` | https://developer.nvidia.com/embedded/dlc/jetson-nano-developer-kit-b01-mechanical-drawing | _pending_ | _pending_ | |
| `beaglebone-black` | https://github.com/beagleboard/beaglebone-black/raw/master/SRM/BBB_SRM.pdf | _pending_ | _pending_ | |
| `microbit-v2` | https://tech.microbit.org/hardware/2-1-revision/ | _pending_ | _pending_ | |
| `m5stack-core2` | https://docs.m5stack.com/en/core/core2 | _pending_ | _pending_ | LCD active-area dims need verification. |

## Process

When auditing a board:

1. Open the source datasheet and confirm:
   - PCB outline (`pcb.size`)
   - Each `mountingHoles` entry (position, diameter)
   - Each `BoardComponent` (position, size, facing)
2. Find one independent cross-reference (an open-source CAD file, an authoritative community wiki) and link it.
3. Record `datasheetRevision` (e.g., `"Rev 1.4 — 2023-08"`).
4. Update the JSON profile with the new fields.
5. Update this table with the cross-reference URL and method.

## Schema gate

`tests/unit/boardLibraryAudit.spec.ts` lists which boards have been audited. As each is verified, move it into the "audited" set and the test will assert the new fields are populated.
