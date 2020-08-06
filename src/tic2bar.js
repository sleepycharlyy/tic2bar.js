'use strict';

/* Imports */
const zip = require('node-zip')();
const fs = require('fs');
const jsbarcode = require('jsbarcode');
const { createCanvas, loadImage, registerFont } = require('canvas');
const prompt = require('prompt-sync')();
const ipfs_mini = require('ipfs-mini');
const ipfs = new ipfs_mini({host: 'ipfs.infura.io', port: 5001, protocol: 'https'})

var debug_mode = true;
var timeout_countdown = 30000; /* how long in milisec till timeout */

var game_title = ' '; /* title of the game the user wants to encode */
var path_to_tic = ' '; /* path to the .tic file the user wants to encode or the output that gets decoded */

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
    case 'debug': if(debug_mode) console.log('\x1b[46m' + 'DEBUG: ' + msg);
        break;
    case 'success': 
        console.log('\x1b[32m' + msg);
        break;
    default: console.log(msg);
        break;
    }
    console.log('\x1b[0m');
}

/* encode file (expected .tic) */
function encode(file_path){ 
    //#region compress .tic to zip
    log('Compressing ' + file_path + ' to zip', 'info');
    
    let file_to_encrypt = fs.readFileSync(file_path);
    zip.file('cart.tic', file_to_encrypt);
    let zip_data = zip.generate({base64:false, compression:'DEFLATE'});
    //#endregion 

    //#region ipfs upload
    log('Uploading zip to IPFS Gateway', 'info');
    let hash = '';
    ipfs.add(zip_data, async (error, hash_) => {
        if (error) {
            return log('Upload to IPFS failed (' + error + ')', 'error');
        }
        hash = hash_;
        log('Uploaded zip to: ' + 'https://ipfs.infura.io/ipfs/' + hash_, 'success');
 
    })
    //#endregion
    
    /* start connection timeout timer */
    let timeout_timer = setTimeout(function(){
        /* connection timed out */
        log('Connection timeout. Check your internet connection or try again later!', 'error');
    }, timeout_countdown)
    /* check if hash data has arrived every second */
    setInterval(function(){
        if(hash != ''){
            /* hash data has arrived => create bar code and stop timers */
            barcode_create(hash, game_title.toLowerCase() + '-cardridge.png');
            clearTimeout(this);
            clearTimeout(timeout_timer);
        }
    }, 1000)
}

/* create barcode and save it. takes (ipfs) hash and file_path (to save png to) as inputs */
function barcode_create(hash, file_path){
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









/* downloads zip_data from hash. returns zip_data */
function ipfs_download(hash){
    if(hash == undefined){
        log('The hash code is undefined. Probably a timeout error. Check your connection!', 'error');
    }
    ipfs.cat(hash, (error, result) => {
        if (error) {
            log('There was an error while downloading from IPFS', 'error');
        } else {
          fs.writeFileSync('test2.zip',result,'binary');
          log(result,'debug');
        }
      });
}

function main(){
    while(true){
        switch(prompt('Do you want to encode a .tic cartridge or decode a barcode? (e / d) >> ')) {
        case 'd': 
            log('\x1b[36m' + '\nYou selected decode: ');
            break;
        case 'e': 
            log('\x1b[36m' + '\nYou selected encode: ');
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
            if(!fs.existsSync(path_to_tic)) {
                log("This file doesn't exist!", 'error');
            }

            /* encode file */
            log('\n');
            encode(path_to_tic);
            break;
        default:
            continue;
        }
        break;
    }
}

main()
