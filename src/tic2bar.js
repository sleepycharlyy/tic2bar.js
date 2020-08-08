#!/usr/bin/env node

'use strict';

/* Imports */
const fs = require('fs'); /* file system */
const path = require('path'); /* path system */
const JSON5 = require('json5') /* json5 parser */
const jsbarcode = require('jsbarcode'); /* barcode creation */
const Quagga = require('quagga').default; /* barcode scanning and decoding */
const { createCanvas, registerFont } = require('canvas'); /* canvas to draw barcode image */
const prompt = require('prompt-sync')(); /* terminal prompt functions */
const ipfs_mini = require('ipfs-mini'); /* ipfs api */
const ipfs = new ipfs_mini({host: 'ipfs.infura.io', port: 5001, protocol: 'https'}) /* connecting to infura gateway */

/* config (these variables will be overwritten by the config and are just default values) */
var debug_mode = false; /* debug mode */
var timeout_countdown = 30000; /* how long in milisec till timeout error is thrown */

/* log function to log messages to the console */ 
function log(msg, type){
    switch(type){
    case 'info': 
    console.log('\x1b[0m' + 'INFO: ' + msg);
        break;
    case 'error': 
        console.log('\x1b[31m' + 'ERROR: ' + msg);
        process.exit(1);
    case 'debug': if(debug_mode) console.log('DEBUG: ' + msg);
        break;
    case 'success': 
        console.log('\x1b[32m' + msg);
        break;
    default: console.log(msg);
        break;
    }
    console.log('\x1b[0m');
}

/* create barcode and save it. takes (ipfs) hash and file_path (to save png to) and the game_title as inputs */
function create_barcode(hash, file_path, game_title){
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
        text: game_title.toLowerCase() + ' - tic-80 cartridge'
    });

    /* save file as jpg or png*/
    const out = fs.createWriteStream(file_path)
    if (file_path.split('.').pop() == 'jpg'){
        const stream = canvas.createJPEGStream()
        stream.pipe(out)
        out.on('finish', () => {
            /* finished */
            log('Barcode was created and saved to: ' + file_path, 'success'); 
            log('Finished!', 'success');
            process.exit(1);
        })
    }else{
        const stream = canvas.createPNGStream()
        stream.pipe(out)
        out.on('finish', () => {
            /* finished */
            log('Barcode was created and saved to: ' + file_path, 'success'); 
            log('Finished! ʕ•ᴥ•ʔ', 'success');
            process.exit(1);
        })
    }
 

}

/* create .tic file.. takes in data and file_path to save the .tic to */
function create_tic(data, file_path){
    log('Writing data', 'info');

    fs.writeFileSync(file_path, data, 'binary');

    log("Successfully written cartridge to: " + file_path, 'success');
    log('Finished! ʕ•ᴥ•ʔ', 'success');
    process.exit(1);

}

/* encode file (expected .tic, and game_title) */
function encode(input_path, output_path, game_title){ 
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
            create_barcode(hash, output_path, game_title);
            clearTimeout(this);
            clearTimeout(timeout_timer);
        }
    }, 1000)
}

/* decode barcode (expected input_path to .png or .jpg, output_path to .tic and game_title) */
function decode(input_path, output_path, game_title){
    /* decoding barcode */
    log('Starting to decode barcode', 'info');
    Quagga.decodeSingle({
        src: input_path,
        numOfWorkers: 0,  /* Needs to be 0 when used within node */
        inputStream: {
            size: 1000  /* restrict input-size to be 1000px in width (long-side) */
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
            
            if(hash == undefined){
                log('The hash code is undefined. Probably a timeout error. Check your connection!', 'error');
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
                    create_tic(data, output_path, game_title);
                    clearTimeout(this);
                    clearTimeout(timeout_timer);
                }
            }, 1000)
        } else {
            log("Didn't detect a barcode. Check your input file!", 'error');
        }
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
}


function main(){
    /* declare variables */
    let game_title = '';
    let input_path = '';
    let output_path = '';

    log("\x1b[35m" + 'sleepycharlyy/tic2bar.js' + "\x1b[0m" + '\n');

    /* load config */
    load_config();

    /* main loop */
    while(true){
        switch(prompt('Do you want to encode a .tic cartridge or decode a barcode? (e / d) >> ')) {
        case 'd': 
            log('\x1b[36m' + '\nYou selected decode ');

            game_title = prompt('What is the title of the game you want to decode? >> ');

            /* check if game_title is empty */
            if (game_title == undefined || game_title == " " || game_title == null) {
                log("The game title can't be empty!", 'error');
            }

            input_path = prompt('What is the path to the barcode you want to decode? (.png or .jpg) >> ');   
            
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
            decode(input_path, output_path, game_title)
            break;
        case 'e': 
            log('\x1b[36m' + '\nYou selected encode ');

            game_title = prompt('What is the title of the game you want to encode? >> ');

            /* check if game_title is empty */
            if (game_title == undefined || game_title == " " || game_title == null) {
                log("The game title can't be empty!", 'error');
            }

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
            if(!fs.existsSync(input_path, input_path)) {
                log("This file doesn't exist!", 'error');
            }

            output_path = prompt('Where do you want to export the barcode to? (.png or .jpg) >> ');   
            
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
            encode(input_path, output_path, game_title);
            break;
        default:
            /* when the user didn't input e or d the whole promt repeats */
            continue;
        }
        break;
    }
}

main()
