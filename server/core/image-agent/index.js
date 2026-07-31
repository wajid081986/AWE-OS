'use strict';

const { generateImage } = require('./generator');
const { saveGeneration, getHistory, deleteGeneration } = require('./history');

module.exports = { generateImage, saveGeneration, getHistory, deleteGeneration };
