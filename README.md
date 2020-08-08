# tic2bar.js

## About

This application encodes .tic cartridges for TIC-80 into barcodes for distribution  
and is able to decode them back into .tic cartridges.  
It uploads them to IPFS through the INFURA gateway  
and stores the hash of the upload in barcodes.
This project's made in node-js.  
I took inspiration from [this](https://youtu.be/ExwqNreocpg) video from MattKC.

[itch.io](https://sleepycharlyy.itch.io/tic2bar)

### Installation

> npm install --global tic2bar

### Usage

> tic2bar

## Example

![Example](https://i.imgur.com/gubMXqE.png)

## Dependencies

    - "canvas": "^2.6.1",
    - "ipfs-mini": "^1.1.5",
    - "jsbarcode": "^3.11.0",
    - "json5": "^2.1.3",
    - "prompt-sync": "^4.2.0",
    - "quagga": "^0.12.1"

## TIC-80

TIC-80 is a open source fantasy computer for making, playing and sharing little games.  
[tic.computer](https://tic.computer/)  
[nesbox/TIC-80](https://github.com/nesbox/TIC-80)  

## License

GPL-3.0 see LICENSE.md for details.

## Ending words

The application is very bare bones and more of an idea.  
The project is as it stands very gimmicky and not that useful,
but i quite like the idea of storing TIC-80 cartridges in barcodes
for distribution and i can only imagine what kinds of stuff you could pull of,
like scanning a barcode on mobile and playing it directly through some kind of app.
