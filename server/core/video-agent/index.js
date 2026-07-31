'use strict';

const { generateVideo } = require('./generator');
const { saveGeneration, getHistory, deleteGeneration } = require('./history');

module.exports = { generateVideo, saveGeneration, getHistory, deleteGeneration };
