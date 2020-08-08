'use strict';

/* Imports */
const zip = require('node-zip')(); /* zipping and unzipping */
const fs = require('fs'); /* file system */
const jsbarcode = require('jsbarcode'); /* barcode creation */
const Quagga = require('quagga').default; /* barcode scanning and decoding */
const { createCanvas, loadImage, registerFont } = require('canvas'); /* canvas to draw barcode image */
const prompt = require('prompt-sync')(); /* terminal prompt functions */
const ipfs_mini = require('ipfs-mini'); /* ipfs api */
const ipfs = new ipfs_mini({host: 'ipfs.infura.io', port: 5001, protocol: 'https'}) /* connecting to infura gateway */

var debug_mode = true; /* debug mode */
var timeout_countdown = 30000; /* how long in milisec till timeout */

/* log function to log messages to the console
 * msg = the string message to be logged in the console 
 * type = message type (error, info, debug, success)
 */ 
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

/* encode file (expected .tic, and game_title) */
function encode(file_path, game_title){ 
    /* region compress .tic to zip */
    log('Compressing ' + file_path + ' to zip', 'info');
    
    let file_to_encrypt = fs.readFileSync(file_path);
    zip.file('cart.tic', file_to_encrypt);
    let zip_data = zip.generate({base64:false, compression:'DEFLATE'});

    /* ipfs upload */
    log('Uploading compressed cartridge to IPFS Gateway', 'info');
    let hash = '';
    ipfs.add(zip_data, async (error, hash_) => {
        if (error) {
            return log('Upload to IPFS failed (' + error + ')', 'error');
        }
        hash = hash_;
        log('Successfully uploaded compressed cartridge to: ' + 'https://ipfs.infura.io/ipfs/' + hash_, 'success');
 
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
            create_barcode(hash, game_title.toLowerCase() + '-cartridge.png', game_title);
            clearTimeout(this);
            clearTimeout(timeout_timer);
        }
    }, 1000)
}

/* create barcode and save it. takes (ipfs) hash and file_path (to save png to) and the game_title as inputs */
function create_barcode(hash, file_path, game_title){
    /* create canvas */
    registerFont('assets/tic-80-wide-font.ttf', { family: 'Tic' })
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
    /* draw logo image and text */
    // TODO: MAKE THIS WORK
    const ctx = canvas.getContext('2d');
    ctx.font = '12px "Tic"'
    ctx.fillText('Test :(', 250, 10)
    loadImage('assets/tic-80-logo.png').then((logo) => {
        ctx.drawImage(logo,1,1,16,16);
    });
    /* save file */
    const out = fs.createWriteStream(file_path)
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () => {
        /* finished */
        log('Barcode was created and saved to: ' + file_path, 'success'); 
        log('Finished!', 'success');
        process.exit(1);
    })

}

/* decode barcode (expected path to png or jpg and game_title) */
function decode(file_path, game_title){
    /* decoding barcode */
    log('Starting to decode barcode', 'info');
    Quagga.decodeSingle({
        src: file_path,
        numOfWorkers: 0,  // Needs to be 0 when used within node
        inputStream: {
            size: 1000  // restrict input-size to be 1000px in width (long-side)
        },
        decoder: {
            readers: ["code_128_reader"] // List of active readers
        },
    }, function(result) {
        if(result.codeResult) {
            /* success of decoding */
            let hash = result.codeResult.code;
            log('\n');
            log('Successfully decoded barcode! hash: ' + hash, 'success');
            /* download .zip from ipfs */
            log('Downloading compressed cartridge from IPFS Gateway', 'info');
            if(hash == undefined){
                log('The hash code is undefined. Probably a timeout error. Check your connection!', 'error');
            }
            let zip_data = '';
            ipfs.cat(hash, (error, result) => {
                if (error) {
                    log('There was an error while downloading from IPFS: ' + error, 'error');
                } else {
                    /* success of downloading */
                    log('Successfully downloaded compressed cartridge!', 'success');
                    zip_data = result;
                }
            });


            /* start connection timeout timer */
            let timeout_timer = setTimeout(function(){
                /* connection timed out */
                log('Connection timeout. Check your internet connection or try again later!', 'error');
            }, timeout_countdown)
            /* check if zip data has arrived every second */
            setInterval(function(){
                if(zip_data != ''){
                    /* zip data has arrived => create .tic and stop timers */
                    create_tic(zip_data, game_title.toLowerCase() + '-cartridge.tic', game_title);
                    clearTimeout(this);
                    clearTimeout(timeout_timer);
                }
            }, 1000)
            /* unzip */
        } else {
            log("Didn't detect a barcode. Check your input file!", 'error');
        }
    });
}

/* create .tic file.. takes in zip_data (to unzip) and file_path to save the .tic to */
function create_tic(zip_data, file_path){
    log('Unzipping data', 'info');
    let data = new require('node-zip')(zip_data, {base64: false, checkCRC32: true});
    if (data == " " || data == null || data == undefined) {
        log("The downloaded zip data is corrupted!", error);
    } 
    /* log(data); */
    // TODO: make this work wijdajwij
    fs.writeFileSync(file_path, data);
    log("Successfully decoded cartridge to: " + file_path, 'success');
}


function main(){
    /* declare variables */
    let game_title = '';
    let path_to_barcode = '';
    let path_to_tic = '';

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

            path_to_barcode = prompt('What is the path to the barcode you want to decode? (example: test-cartridge.png) >> ');   
            
            /* check if file_path is empty */
            if (path_to_barcode == undefined || path_to_barcode == " " || path_to_barcode == null){
                log("The file path can't be empty!", 'error');
            }
            /* check if file is not a .tic file */
            if (path_to_barcode.split('.').pop() != 'png' && path_to_barcode.split('.').pop() != 'jpg') { 
                /* is another file type */
                log('This filetype is unrecognized, use .png or .jpg files!', 'error');
            }
            /* check if file exists */
            if(!fs.existsSync(path_to_barcode)) {
                log("This file doesn't exist!", 'error');
            }

            /* decode file */
            log('\n');
            decode(path_to_barcode, game_title)
            break;
        case 'e': 
            log('\x1b[36m' + '\nYou selected encode ');

            game_title = prompt('What is the title of the game you want to encode? >> ');

            /* check if game_title is empty */
            if (game_title == undefined || game_title == " " || game_title == null) {
                log("The game title can't be empty!", 'error');
            }

            path_to_tic = prompt('What is the path to the .tic game cartridge you want to encode? (example: test.tic) >> ');   
            
            /* check if file_path is empty */
            if (path_to_tic == undefined || path_to_tic == " " || path_to_tic == null){
                log("The file path can't be empty!", 'error');
            }
            /* check if file is not a .tic file */
            if (path_to_tic.split('.').pop() != 'tic') { 
                /* is another file type */
                log('This filetype is unrecognized, use .tic files!', 'error');
            }
            /* check if file exists */
            if(!fs.existsSync(path_to_tic, game_title)) {
                log("This file doesn't exist!", 'error');
            }

            /* encode file */
            log('\n');
            encode(path_to_tic, game_title);
            break;
        default:
            continue;
        }
        break;
    }
}

main()
