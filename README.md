# tic2bar.js

## About

This command-line application encodes .tic cartridges for TIC-80 into barcodes or QR codes (default) for distribution  
and is able to decode them back into .tic cartridges.  
It uploads them to IPFS through the INFURA gateway  
and stores the hash of the upload in the barcodes  
or just the url of the cartridge in QR Codes.
QR Codes can be decoded with any QR Scanner, but I've built one in this application for convenience's sake.  
I took inspiration from [this](https://youtu.be/ExwqNreocpg) video from MattKC.

[itch.io](https://sleepycharlyy.itch.io/tic2bar)

### Installation

`> npm install --global tic2bar`

### Usage

`> tic2bar`

## Example

![Example](https://i.imgur.com/gubMXqE.png)
![Example2](https://i.imgur.com/inMFdqJ.png)

## Config

You can change the encoding and decoding type in the config.json5 file.

```js

/* encoder & decoder type: qr or 128 (code128 barcode) */
type: 'qr'

```

## Dependencies

    - "canvas": "^2.6.1",
    - "ipfs-mini": "^1.1.5",
    - "jsbarcode": "^3.11.0",
    - "jshint": "^2.12.0",
    - "json5": "^2.1.3",
    - "node-qrdecode": "^1.0.3",
    - "prompt-sync": "^4.2.0",
    - "qrcode": "^1.4.4",
    - "quagga": "^0.12.1"

## TIC-80

TIC-80 is a open source fantasy computer for making, playing and sharing little games.  
[tic.computer](https://tic.computer/)  
[nesbox/TIC-80](https://github.com/nesbox/TIC-80)  

## Ending words

The application is very bare bones and more of an idea.  
The project is as it stands very gimmicky and not that useful,
but i quite like the idea of storing TIC-80 cartridges in barcodes or QR codes
for distribution and i can only imagine what kinds of stuff you could pull of,
like scanning a barcode on mobile and playing it directly through some kind of app.

## License

GPL-3.0 see LICENSE.md for details.

The word "QR Code" is registered trademark of:
DENSO WAVE INCORPORATED
