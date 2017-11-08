"use strict"

const fs = require('fs');
const path = require('path');
const {readFile,parseJSON,readSpreadsheet} = require('./utils');
const _ = require('lodash');
const Handlebars = require('handlebars');
const mkdirp = require('mkdirp');

const CONF_FILE_NAME = 'deckcards.json';

const currentPath = process.cwd();

/**
 * Read the conf file to the "dir" path.
 * @param {string} dir 
 * @return {Promise}
 */
function getConf(dir) {
    const confFilePath = path.join(dir, CONF_FILE_NAME);
    return readFile(confFilePath).then(parseJSON);
}

/**
 * Format GSheet cells to a readable template format.
 * @param {array} cells 
 * @return {object} a key/value object
 */
function formatCells(cells){
    if(cells.length==0)return {}
    const varNames = _.head(cells);
    const varValuesByLine = _.tail(cells);
    return varValuesByLine.map( 
        line => _.reduce(line,(res,value,index) => {
            res[varNames[index]] = value
            return  res;
        },{}) 
    )
}

/**
 * Format Google SpreadSheet sheets to an array of templates object dictionary. 
 * @param {array} sheets an array of Sheet Object
 * @return {array}
 */
function formatGSheetToTemplateFiller(sheets){
    return sheets.map( o => {
        return {
            id:_.kebabCase(o.sheet.title),
            name:o.sheet.title,
            cards: formatCells(o.cells)
        }
    })
}

/**
 * Read a GSheet from Google Drive and parse it to a list of templates dictionnary.
 * @param {string} crendentials the crendentials file path 
 * @param {string} sheetId the Google SpreadSheet ID in Google Drive
 */
function readGSheet(credentials,sheetId) {
    return readSpreadsheet(credentials,sheetId).then(formatGSheetToTemplateFiller);
}

/**
 * Prepare the template to compile.
 * @param {string} file the template file path
 */
function prepareTemplate(file){
    return readFile(file).then( template => Handlebars.compile(template))
}

getConf(currentPath).then(conf => {

    const {template:templateFilePath, output, gsheet} = conf;
    const absOutputDir = path.join(currentPath,output);
    
    Promise.all([
        readGSheet(path.join(currentPath,gsheet.credentials),gsheet.sheetId),
        prepareTemplate(path.join(currentPath,templateFilePath))
    ]).then( ([sheets,template]) => {
        mkdirp.sync(absOutputDir);
        sheets.map(sheet => {
            const rendering = template(sheet);
            const filePath = path.join(absOutputDir,`${sheet.id}.html`);
            fs.writeFileSync(filePath,rendering);
        })
    });

});