#!/usr/bin/env node

'use strict';

/* Imports */
const prompt = require('prompt-sync')(); /* terminal prompt functions */
const fs = require('fs'); /* file system */
const path = require('path'); /* path system */
const QRCode = require('qrcode'); /* qr code encoder */
const qrdecode = require('node-qrdecode'); /* qr code decoder */
const JSON5 = require('json5') /* json5 parser */
const jsbarcode = require('jsbarcode'); /* barcode creation */
const Quagga = require('quagga').default; /* barcode scanning and decoding */
const { createCanvas, registerFont } = require('canvas'); /* canvas to draw barcode image */
const ipfs_mini = require('ipfs-mini'); /* ipfs api */
const ipfs = new ipfs_mini({host: 'ipfs.infura.io', port: 5001, protocol: 'https'}) /* connecting to infura gateway */

/* config (these variables will be overwritten by the config and are just default values) */
var debug_mode = false; /* debug mode */
var timeout_countdown = 30000; /* how long in milisec till timeout error is thrown */
var type = 'qr'; /* encoder and decoder type qr or 128 (for code128 barcode) */

/* log function to log messages to the console */ 
function log(msg, type){
    switch(type){
    case 'info': 
        console.log('\x1b[0m' + 'INFO: ' + msg);
        break;
    case 'error': 
        console.log('ERROR: \x1b[31m' + msg );
        process.exit(1);
    case 'debug': if(debug_mode) console.log('DEBUG: ' + "\x1b[36m" + msg + '\x1b[0m');
        break;
    case 'success': 
        console.log('\x1b[32m' + msg + '\x1b[0m');
        break;
    default: console.log(msg);
        break;
    }
}


/* create .tic file.. takes in data and file_path to save the .tic to */
function tic_create(data, file_path){
    log('Writing data', 'info');

    fs.writeFileSync(file_path, data, 'binary');

    log("Successfully written cartridge to: " + file_path, 'success');
    log('Finished! ʕ•ᴥ•ʔ', 'success');
    process.exit(1);

}

/* encode file to barcode (expected input_path (.tic), output_path and game_title) */
function bar_encode(input_path, output_path, game_title){ 
    /* load file */
    log('Loading:  ' + input_path, 'info');
    let file = fs.readFileSync(input_path, 'binary');

    /* ipfs upload */
    log('Uploading cartridge to IPFS Gateway', 'info');
    let hash = '';
    ipfs.add(file, async (error, hash_) => {
        if (error) {
            return log('Upload to IPFS failed (' + error + ')', 'error');
        }
        hash = hash_;
        log('Successfully uploaded cartridge to: ' + 'https://ipfs.infura.io/ipfs/' + hash_, 'success');
 
    })
    
    /* start connection timeout timer */
    let timeout_timer = setTimeout(function(){
        /* connection timed out */
        log('Connection timeout. Check your internet connection or try again later!', 'error');
    }, timeout_countdown)
    /* check if hash data has arrived every second */
    setInterval(function(){
        if(hash != ''){
            /* hash data has arrived => create bar code and stop timers */
            clearTimeout(this);
            clearTimeout(timeout_timer);

            registerFont('assets/tic-80-wide-font.ttf', { family: 'Tic' });

            /* create canvas */
            var canvas = createCanvas(200, 200);
        
            /* create bar code */
            log('Creating barcode', 'info');
            jsbarcode(canvas, hash, {
                font: 'Tic',
                fontSize: 16,
                textMargin: 10,
                height: 200,
                width: 1,
                margin: 30,
                marginTop: 80,
                background: '#deeed6',
                lineColor: '#140c1c',
                text: input_path.split('/').pop().toLowerCase() + ' - tic-80 cartridge'
            });
        
            /* save file as jpg or png*/
            const out = fs.createWriteStream(output_path)
            if (output_path.split('.').pop() == 'jpg'){
                const stream = canvas.createJPEGStream()
                stream.pipe(out)
                out.on('finish', () => {
                    /* finished */
                    log('Barcode was created and saved to: ' + output_path, 'success'); 
                    log('Finished! ʕ•ᴥ•ʔ', 'success');
                    process.exit(1);
                })
            }else{
                const stream = canvas.createPNGStream()
                stream.pipe(out)
                out.on('finish', () => {
                    /* finished */
                    log('Barcode was created and saved to: ' + output_path, 'success'); 
                    log('Finished! ʕ•ᴥ•ʔ', 'success');
                    process.exit(1);
                })
            }
        }
    }, 1000)
}

/* decode barcode (expected input_path to .png or .jpg, output_path to .tic and game_title) */
function bar_decode(input_path, output_path){
    /* decoding barcode */
    log('Starting to decode barcode', 'info');
    Quagga.decodeSingle({
        src: input_path,
        numOfWorkers: 0,  /* Needs to be 0 when used within node */
        inputStream: {
            size: 2000  /* restrict input-size to be 2000px in width (long-side) */
        },
        decoder: {
            readers: ["code_128_reader"] /* list of active readers */
        },
    }, function(result) {
        if(result.codeResult) {
            /* success of decoding */
            let hash = result.codeResult.code;
            log('\n');
            log('Successfully decoded barcode! hash: ' + hash, 'success');

            /* download .zip from ipfs */
            log('Downloading cartridge data from IPFS Gateway', 'info');
            
            if(hash == null){
                log('Data is corrupted. Check your barcode!', 'error');
            }
            
            let data = '';
            ipfs.cat(hash, (error, result) => {
                if (error) {
                    log('There was an error while downloading from IPFS: ' + error, 'error');
                } else {
                    /* success of downloading */
                    log('Successfully downloaded cartridge data!', 'success');
                    data = result;
                }
            });


            /* start connection timeout timer */
            let timeout_timer = setTimeout(function(){
                /* connection timed out */
                log('Connection timeout. Check your internet connection or try again later!', 'error');
            }, timeout_countdown)
            /* check if zip data has arrived every second */
            setInterval(function(){
                if(data != ''){
                    /* zip data has arrived => create .tic and stop timers */
                    tic_create(data, output_path);
                    clearTimeout(this);
                    clearTimeout(timeout_timer);
                }
            }, 1000)
        } else {
            log("Didn't detect a barcode. Check your input file!", 'error');
        }
    });
}

/* encode file to qr code (expected input_path (.tic), output_path) */
function qr_encode(input_path, output_path){ 
    /* load file */
    log('Loading:  ' + input_path, 'info');
    let file = fs.readFileSync(input_path, 'binary');

    /* ipfs upload */
    log('Uploading cartridge to IPFS Gateway', 'info');
    let hash = '';
    ipfs.add(file, async (error, hash_) => {
        if (error) {
            return log('Upload to IPFS failed (' + error + ')', 'error');
        }
        hash = hash_;
        log('Successfully uploaded cartridge to: ' + 'https://ipfs.infura.io/ipfs/' + hash_, 'success');

    })
    
    /* start connection timeout timer */
    let timeout_timer = setTimeout(function(){
        /* connection timed out */
        log('Connection timeout. Check your internet connection or try again later!', 'error');
    }, timeout_countdown)
    /* check if hash data has arrived every second */
    setInterval(function(){
        if(hash != ''){
            /* hash data has arrived => create qr code and stop timers */
            clearTimeout(this);
            clearTimeout(timeout_timer);

            /* create canvas */
            var canvas = createCanvas(300, 300);
        
            /* create qr code */
            log('Creating QR code', 'info');
            QRCode.toCanvas(canvas, 'https://ipfs.infura.io/ipfs/' + hash, { errorCorrectionLevel: 'H' }, function (error) {
                if (error) log(error, 'error');
                log('Successfully encoded QR Code!','success');

                /* save file as jpg or png*/
                const out = fs.createWriteStream(output_path);
                if (output_path.split('.').pop() == 'jpg'){
                    const stream = canvas.createJPEGStream();
                    stream.pipe(out)
                    out.on('finish', () => {
                        /* finished */
                        log('QR Code was created and saved to: ' + output_path, 'success'); 
                        log('Finished! ʕ•ᴥ•ʔ', 'success');
                        process.exit(1);
                    })
                }else{
                    const stream = canvas.createPNGStream()
                    stream.pipe(out)
                    out.on('finish', () => {
                        /* finished */
                        log('QR Code was created and saved to: ' + output_path, 'success'); 
                        log('Finished! ʕ•ᴥ•ʔ', 'success');
                        process.exit(1);
                    })
                }
                })
        }
    }, 1000)
}

/* decode qr code (expected input_path to .png or .jpg, output_path to .tic) */
function qr_decode(input_path, output_path){
    /* decoding qr code */
    log('Starting to decode QR code', 'info');
    qrdecode(input_path).then(function(url){
        if(url == null){
            log('Data is corrupted. Check your QR Code!', 'error');
        }

        log(url, 'debug');

        /* success of decoding */
        log('\n');
        log('Successfully decoded QR code! url: ' + url, 'success');

        /* download .tic from ipfs */
        log('Downloading cartridge data from IPFS Gateway', 'info');
         

         
         let data_ = '';
         ipfs.cat(url.split('/').pop(), (error, result) => {
             if (error) {
                 log('There was an error while downloading from IPFS: ' + error, 'error');
             } else {
                /* success of downloading */
                log('Successfully downloaded cartridge data!', 'success');
                data_ = result;
            }
        });


         /* start connection timeout timer */
         let timeout_timer = setTimeout(function(){
             /* connection timed out */
             log('Connection timeout. Check your internet connection or try again later!', 'error');
         }, timeout_countdown)
         /* check if zip data has arrived every second */
         setInterval(function(){
             if(data_ != ''){
                 /* zip data has arrived => create .tic and stop timers */
                 tic_create(data_, output_path);
                 clearTimeout(this);
                 clearTimeout(timeout_timer);
             }
         }, 1000)
    });
}

/* load json5 config in current directory */
function load_config(){
    /* reading config file and parsing it through json5 */
    let config_file = fs.readFileSync(path.resolve(__dirname, 'config.json5'));
    let config = JSON5.parse(config_file);
    
    /* assigning variables */
    debug_mode = config.debug_mode;
    timeout_countdown = config.timeout_countdown;
    type = config.type;

    /* log config settings */
    log('debug_mode: ' + debug_mode, 'debug');
    log('encoding / decoding type: ' + type, 'info');
    log('timeout_countdown: ' + timeout_countdown, 'debug');
    log('\n');
}

/* main function (gets run when application starts) */
function main(){
    /* declare variables */
    let input_path = '';
    let output_path = '';

    log("\x1b[35m" + 'sleepycharlyy/tic2bar.js' + "\x1b[0m" + '\n');

    /* load config */
    load_config();

    /* main loop */
    while(true){
        switch(prompt('Do you want to encode or decode? (e / d) >> ').toLowerCase()) {
        case 'd': 
            log('\x1b[36m' + '\nYou selected decode ');

            /* check if bar code or qr code */
            if(type == '128'){
                input_path = prompt('What is the path to the barcode you want to decode? (.png or .jpg) >> '); 
            } else {
                input_path = prompt('What is the path to the QR code you want to decode? (.png or .jpg) >> '); 
            }
            
            /* check if file path is empty */
            if (input_path == undefined || input_path == " " || input_path == null){
                log("The file path can't be empty!", 'error');
            }
            /* check if file is not a .png or .jpg file */
            if (input_path.split('.').pop() != 'png' && input_path.split('.').pop() != 'jpg') { 
                /* is another file type */
                log('This filetype is unrecognized, use .png or .jpg files!', 'error');
            }
            /* check if file exists */
            if(!fs.existsSync(input_path)) {
                log(input_path);
                log("This file doesn't exist!", 'error');
            }
            
            output_path = prompt('What is the path you want to export the .tic cartridge to? >> '); 

            /* check if file path is empty */
            if (output_path == undefined || output_path == " " || output_path == null){
            log("The file path can't be empty!", 'error');
            }
            /* check if file is not a .tic file */
            if (output_path.split('.').pop() != 'tic') { 
                /* is another file type */
                log('This filetype is unrecognized, use .tic files!', 'error');
            }

            /* decode file */
            log('\n');
            /* check if bar code or qr code */
            if(type == '128'){
                bar_decode(input_path, output_path);
            }else{
                qr_decode(input_path, output_path);
            }
            break;
        case 'e': 
            log('\x1b[36m' + '\nYou selected encode ');

            input_path = prompt('What is the path to the .tic game cartridge you want to encode? >> ');   

            /* check if file_path is empty */
            if (input_path == undefined || input_path == " " || input_path == null){
                log("The file path can't be empty!", 'error');
            }
            /* check if file is not a .tic file */
            if (input_path.split('.').pop() != 'tic') { 
                /* is another file type */
                log('This filetype is unrecognized, use .tic files!', 'error');
            }
            /* check if file exists */
            if(!fs.existsSync(input_path)) {
                log("This file doesn't exist!", 'error');
            }

            /* check if bar code or qr code */
            if(type == '128'){
                output_path = prompt('Where do you want to export the barcode to? (.png or .jpg) >> ');  
            } else {
                output_path = prompt('Where do you want to export the QR code to? (.png or .jpg) >> ');  
            }
            
            /* check if file path is empty */
            if (output_path == undefined || output_path == " " || output_path == null){
                log("The file path can't be empty!", 'error');
            }
            /* check if file is not a .png or .jpg file */
            if (output_path.split('.').pop() != 'png' && output_path.split('.').pop() != 'jpg') { 
                /* is another file type */
                log('This filetype is unrecognized, use .png or .jpg files!', 'error');
            }

            /* encode file */
            log('\n');
            /* check if bar code or qr code */
            if(type == '128'){
                bar_encode(input_path, output_path);
            }else{
                qr_encode(input_path, output_path);
            }
            break;
        default:
            /* when the user didn't input 'e' or 'd' the whole prompt repeats */
            continue;
        }
        break;
    }
}

main();

