"use strict"

const fs = require('fs');
const GoogleSpreadsheet = require("google-spreadsheet");

/**
 * Read a file from disk
 * @param {string} file the file path
 * @param {string} encoding the encoding system
 * @return {Promise} a promise
 */
exports.readFile = function readFile(file,encoding='utf8') {
    return new Promise((resolve, reject) => {
        fs.access(file, fs.constants.R_OK, (err) => {
            if (err) {
                reject(`No access to file "${file}"`, err)
            } else {
                fs.readFile(file, encoding, function (err, data) {
                    if (err) 
                        reject(err);
                    else 
                        resolve(data);
                });
            }
        });
    });
}

/**
 * Parse a string to JSON
 * @param {string} data the json string
 * @return {Promise} a promise
 */
exports.parseJSON = function parseJSON(data){
    return new Promise((resolve, reject) => {
        try {
            const conf = JSON.parse(data);
            resolve(conf);
        } catch (e) {
            reject(e);
        }

    });
}

/**
 * Read a GSheet worksheet cells and return this to json format
 * @param {Sheet} sheet a sheet object
 * @return {Promise} a promise
 */
function readWorkSheetCells(sheet) {
    return new Promise((resolve, reject) =>
        sheet.getCells(function (err, row_data) {
            if (err) {
                reject(err);
                return;
            }
            var res = [];
            row_data.forEach(function (e) {
                if (!(e.row - 1 in res)) res[e.row - 1] = [];
                res[e.row - 1][e.col - 1] = e.value;
            });
            for (var i = 0; i < res.length; i++) {
                if (res[i] == null) res[i] = [];
            }
            resolve({ sheet: sheet, cells: res });
        })
    );
}

/**
 * Read a online GSheet and parse this content to json
 * @param {string} crendentials the crendentials file path 
 * @param {string} sheetId the Google SpreadSheet ID in Google Drive
 * @returns {Promise} a promise
 */
exports.readSpreadsheet = function readSpreadsheet(credendials, sheetId) {
    return new Promise((resolve, reject) => {
        var sheet = new GoogleSpreadsheet(sheetId);
        sheet.useServiceAccountAuth(credendials, function (err) {
            if (err) {
                reject(err);
                return;
            }

            sheet.getInfo((err, { worksheets }) => resolve(Promise.all(worksheets.map((worksheet, index) => readWorkSheetCells(worksheet)))));
        });
    })
}