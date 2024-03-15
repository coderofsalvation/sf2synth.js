goog.provide('SoundFont.Synthesizer');

goog.require('SoundFont.SynthesizerNote');
goog.require('SoundFont.Parser');

/**
 * @constructor
 */
SoundFont.Synthesizer = function(input) {
  /** @type {Uint8Array} */
  this.input = input;
  /** @type {SoundFont.Parser} */
  this.parser;
  /** @type {number} */
  this.bank = 0;
  /** @type {Array.<Array.<Object>>} */
  this.bankSet;
  /** @type {number} */
  this.bufferSize = 1024;
  /** @type {AudioContext} */
  this.ctx = this.getAudioContext();
  /** @type {AudioGainNode} */
  this.gainMaster = this.ctx.createGainNode();
  /** @type {AudioBufferSourceNode} */
  this.bufSrc = this.ctx.createBufferSource();
  /** @type {Array.<number>} */
  this.channelInstrument =
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 10, 11, 12, 13, 14, 15];
  /** @type {Array.<number>} */
  this.channelVolume =
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  /** @type {Array.<number>} */
  this.channelPanpot =
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  /** @type {Array.<number>} */
  this.channelPitchBend =
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  this.channelPitchBendSensitivity =
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  this.channelSampleOffset =
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  /** @type {Array.<Array.<SoundFont.SynthesizerNote>>} */
  this.currentNoteOn = [
    [], [], [], [], [], [], [], [],
    [], [], [], [], [], [], [], []
  ];
  /** @type {number} */
  this.baseVolume = 1 / 0x8000;
  /** @type {number} */
  this.masterVolume = 16384;

  /** @type {HTMLTableElement} */
  this.table;
};
/**
 * @returns {AudioContext}
 */
SoundFont.Synthesizer.prototype.getAudioContext = function() {
  /** @type {AudioContext} */
  let ctx;

  if (goog.global['AudioContext'] !== void 0) {
    ctx = new goog.global['AudioContext']();
  } else if (goog.global['webkitAudioContext'] !== void 0) {
    ctx = new goog.global['webkitAudioContext']();
  } else if (goog.global['mozAudioContext'] !== void 0) {
    ctx = new goog.global['mozAudioContext']();
  } else {
    throw new Error('Web Audio not supported');
  }

  if (ctx.createGainNode === void 0) {
    ctx.createGainNode = ctx.createGain;
  }
  return ctx;
};

/**
 * @type {Array.<string>}
 * @const
 */
SoundFont.Synthesizer.ProgramNames = [
  "Acoustic Piano",
  "Bright Piano",
  "Electric Grand Piano",
  "Honky-tonk Piano",
  "Electric Piano",
  "Electric Piano 2",
  "Harpsichord",
  "Clavi",
  "Celesta",
  "Glockenspiel",
  "Musical box",
  "Vibraphone",
  "Marimba",
  "Xylophone",
  "Tubular Bell",
  "Dulcimer",
  "Drawbar Organ",
  "Percussive Organ",
  "Rock Organ",
  "Church organ",
  "Reed organ",
  "Accordion",
  "Harmonica",
  "Tango Accordion",
  "Acoustic Guitar (nylon)",
  "Acoustic Guitar (steel)",
  "Electric Guitar (jazz)",
  "Electric Guitar (clean)",
  "Electric Guitar (muted)",
  "Overdriven Guitar",
  "Distortion Guitar",
  "Guitar harmonics",
  "Acoustic Bass",
  "Electric Bass (finger)",
  "Electric Bass (pick)",
  "Fretless Bass",
  "Slap Bass 1",
  "Slap Bass 2",
  "Synth Bass 1",
  "Synth Bass 2",
  "Violin",
  "Viola",
  "Cello",
  "Double bass",
  "Tremolo Strings",
  "Pizzicato Strings",
  "Orchestral Harp",
  "Timpani",
  "String Ensemble 1",
  "String Ensemble 2",
  "Synth Strings 1",
  "Synth Strings 2",
  "Voice Aahs",
  "Voice Oohs",
  "Synth Voice",
  "Orchestra Hit",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Muted Trumpet",
  "French horn",
  "Brass Section",
  "Synth Brass 1",
  "Synth Brass 2",
  "Soprano Sax",
  "Alto Sax",
  "Tenor Sax",
  "Baritone Sax",
  "Oboe",
  "English Horn",
  "Bassoon",
  "Clarinet",
  "Piccolo",
  "Flute",
  "Recorder",
  "Pan Flute",
  "Blown Bottle",
  "Shakuhachi",
  "Whistle",
  "Ocarina",
  "Lead 1 (square)",
  "Lead 2 (sawtooth)",
  "Lead 3 (calliope)",
  "Lead 4 (chiff)",
  "Lead 5 (charang)",
  "Lead 6 (voice)",
  "Lead 7 (fifths)",
  "Lead 8 (bass + lead)",
  "Pad 1 (Fantasia)",
  "Pad 2 (warm)",
  "Pad 3 (polysynth)",
  "Pad 4 (choir)",
  "Pad 5 (bowed)",
  "Pad 6 (metallic)",
  "Pad 7 (halo)",
  "Pad 8 (sweep)",
  "FX 1 (rain)",
  "FX 2 (soundtrack)",
  "FX 3 (crystal)",
  "FX 4 (atmosphere)",
  "FX 5 (brightness)",
  "FX 6 (goblins)",
  "FX 7 (echoes)",
  "FX 8 (sci-fi)",
  "Sitar",
  "Banjo",
  "Shamisen",
  "Koto",
  "Kalimba",
  "Bagpipe",
  "Fiddle",
  "Shanai",
  "Tinkle Bell",
  "Agogo",
  "Steel Drums",
  "Woodblock",
  "Taiko Drum",
  "Melodic Tom",
  "Synth Drum",
  "Reverse Cymbal",
  "Guitar Fret Noise",
  "Breath Noise",
  "Seashore",
  "Bird Tweet",
  "Telephone Ring",
  "Helicopter",
  "Applause",
  "Gunshot"
];

SoundFont.Synthesizer.prototype.init = function(opts) {
  this.opts = opts
  /** @type {number} */
  let i;

  this.parser = new SoundFont.Parser(this.input);
  this.bankSet = this.createAllInstruments();

  for (i = 0; i < 16; ++i) {
    this.programChange(i, i);
    this.volumeChange(i, 0x64);
    this.panpotChange(i, 0x40);
    this.pitchBend(i, 0x00, 0x40); // 8192
    this.pitchBendSensitivity(i, 2);
  }
};

/**
 * @param {Uint8Array} input
 */
SoundFont.Synthesizer.prototype.refreshInstruments = function(input) {
  this.input = input;
  this.parser = new SoundFont.Parser(input);
  this.bankSet = this.createAllInstruments();
};

SoundFont.Synthesizer.prototype.createAllInstruments = function() {
  /** @type {SoundFont.Parser} */
  let parser = this.parser;
  parser.parse();
  /** @type {Array} TODO */
  let presets = parser.createPreset();
  /** @type {Array} TODO */
  let instruments = parser.createInstrument();
  /** @type {Object} */
  let banks = [];
  /** @type {Array.<Array.<Object>>} */
  let bank;
  /** @type {Object} TODO */
  let preset;
  /** @type {Object} */
  let instrument;
  /** @type {number} */
  let presetNumber;
  /** @type {number} */
  let i;
  /** @type {number} */
  let il;
  /** @type {number} */
  let j;
  /** @type {number} */
  let jl;

  for (i = 0, il = presets.length; i < il; ++i) {
    preset = presets[i];
    presetNumber = preset.header.preset;

    if (typeof preset.instrument !== 'number') {
      continue;
    }

    instrument = instruments[preset.instrument];
    if (instrument.name.replace(/\0*$/, '') === 'EOI') {
      continue;
    }

    // select bank
    if (banks[preset.header.bank] === void 0) {
      banks[preset.header.bank] = [];
    }
    bank = banks[preset.header.bank];
    bank[presetNumber] = [];
    bank[presetNumber].name = preset.name;

    for (j = 0, jl = instrument.info.length; j < jl; ++j) {
      this.createNoteInfo(parser, instrument.info[j], bank[presetNumber], instrument);
    }
  }

  return banks;
};

SoundFont.Synthesizer.prototype.createNoteInfo = function(parser, info, preset, instrument) {
  let generator = info.generator;
  /** @type {number} */
  let sampleId;
  /** @type {Object} */
  let sampleHeader;
  /** @type {number} */
  let volAttack;
  /** @type {number} */
  let volDecay;
  /** @type {number} */
  let volSustain;
  /** @type {number} */
  let volRelease;
  /** @type {number} */
  let modAttack;
  /** @type {number} */
  let modDecay;
  /** @type {number} */
  let modSustain;
  /** @type {number} */
  let modRelease;
  /** @type {number} */
  let tune;
  /** @type {number} */
  let scale;
  /** @type {number} */
  let freqVibLFO;
  /** @type {number} */
  let i;
  /** @type {number} */
  let il;

  if (generator['keyRange'] === void 0 || generator['sampleID'] === void 0) {
    return;
  }

  volAttack  = this.getModGenAmount(generator, 'attackVolEnv',  -12000);
  volDecay   = this.getModGenAmount(generator, 'decayVolEnv',   -12000);
  volSustain = this.getModGenAmount(generator, 'sustainVolEnv');
  volRelease = this.getModGenAmount(generator, 'releaseVolEnv', -12000);
  modAttack  = this.getModGenAmount(generator, 'attackModEnv',  -12000);
  modDecay   = this.getModGenAmount(generator, 'decayModEnv',   -12000);
  modSustain = this.getModGenAmount(generator, 'sustainModEnv');
  modRelease = this.getModGenAmount(generator, 'releaseModEnv', -12000);

  tune = (
    this.getModGenAmount(generator, 'coarseTune') +
    this.getModGenAmount(generator, 'fineTune') / 100
  );
  scale = this.getModGenAmount(generator, 'scaleTuning', 100) / 100;
  freqVibLFO = this.getModGenAmount(generator, 'freqVibLFO');

  for (i = generator['keyRange'].lo, il = generator['keyRange'].hi; i <= il; ++i)  {
    if (preset[i]) {
      continue;
    }

    sampleId = this.getModGenAmount(generator, 'sampleID');
    sampleHeader = parser.sampleHeader[sampleId];
    preset[i] = {
      instrument,
      'sample': parser.sample[sampleId],
      'sampleRate': sampleHeader.sampleRate,
      'basePlaybackRate': Math.pow(
        Math.pow(2, 1/12),
        (
          i -
          this.getModGenAmount(generator, 'overridingRootKey', sampleHeader.originalPitch) +
          tune + (sampleHeader.pitchCorrection / 100)
        ) * scale
      ),
      'modEnvToPitch': this.getModGenAmount(generator, 'modEnvToPitch') / 100,
      'scaleTuning': scale,
      'start':
        this.getModGenAmount(generator, 'startAddrsCoarseOffset') * 32768 +
          this.getModGenAmount(generator, 'startAddrsOffset'),
      'end':
        this.getModGenAmount(generator, 'endAddrsCoarseOffset') * 32768 +
          this.getModGenAmount(generator, 'endAddrsOffset'),
      'loopStart': (
        //(sampleHeader.startLoop - sampleHeader.start) +
        (sampleHeader.startLoop) +
          this.getModGenAmount(generator, 'startloopAddrsCoarseOffset') * 32768 +
          this.getModGenAmount(generator, 'startloopAddrsOffset')
        ),
      'loopEnd': (
        //(sampleHeader.endLoop - sampleHeader.start) +
        (sampleHeader.endLoop) +
          this.getModGenAmount(generator, 'endloopAddrsCoarseOffset') * 32768 +
          this.getModGenAmount(generator, 'endloopAddrsOffset')
        ),
      'volAttack':  Math.pow(2, volAttack / 1200),
      'volDecay':   Math.pow(2, volDecay / 1200),
      'volSustain': volSustain / 1000,
      'volRelease': Math.pow(2, volRelease / 1200),
      'modAttack':  Math.pow(2, modAttack / 1200),
      'modDecay':   Math.pow(2, modDecay / 1200),
      'modSustain': modSustain / 1000,
      'modRelease': Math.pow(2, modRelease / 1200),
      'initialFilterFc': this.getModGenAmount(generator, 'initialFilterFc', 13500),
      'modEnvToFilterFc': this.getModGenAmount(generator, 'modEnvToFilterFc'),
      'initialFilterQ': this.getModGenAmount(generator, 'initialFilterQ'),
      'reverbEffectsSend': this.getModGenAmount(generator, 'reverbEffectsSend'),
      'chorusEffectsSend': this.getModGenAmount(generator, 'chorusEffectsSend'),
      'exclusiveClass':   this.getModGenAmount(generator, 'exclusiveClass'),
      'freqVibLFO': freqVibLFO ? Math.pow(2, freqVibLFO / 1200) * 8.176 : void 0
    };
  }
};

/**
 * @param {Object} generator
 * @param {string} enumeratorType
 * @param {number=} opt_default
 * @returns {number}
 */
SoundFont.Synthesizer.prototype.getModGenAmount = function(generator, enumeratorType, opt_default) {
  if (opt_default === void 0) {
    opt_default = 0;
  }

  return generator[enumeratorType] ? generator[enumeratorType].amount : opt_default;
};

SoundFont.Synthesizer.prototype.start = function() {
  this.bufSrc.connect(this.gainMaster);
  //this.gainMaster.connect(this.ctx.destination);
  this.bufSrc.start(0);

  this.setMasterVolume(16383);
  if( this.opts && this.opts.mixer ) this.opts.mixer({
    input: this.gainMaster, 
    output: this.ctx.destination, 
    ctx: this.ctx
  })
};

SoundFont.Synthesizer.prototype.setMasterVolume = function(volume) {
  this.masterVolume = volume;
  this.gainMaster.gain.value = this.baseVolume * (volume / 16384);
};

SoundFont.Synthesizer.prototype.stop = function() {
  this.bufSrc.disconnect(0);
  this.gainMaster.disconnect(0);
  this.compressor.disconnect(0);
};

/**
 * @type {!Array.<string>}
 * @const
 */
SoundFont.Synthesizer.TableHeader = ['Instrument', 'Vol', 'Pan', 'Bend', 'Range'];

SoundFont.Synthesizer.prototype.drawSynth = function() {
  /** @type {HTMLTableElement} */
  let table = this.table =
    /** @type {HTMLTableElement} */(document.createElement('table'));
  /** @type {HTMLTableSectionElement} */
  let head =
    /** @type {HTMLTableSectionElement} */(document.createElement('thead'));
  /** @type {HTMLTableSectionElement} */
  let body =
    /** @type {HTMLTableSectionElement} */
    (document.createElement('tbody'));
  /** @type {HTMLTableRowElement} */
  let tableLine;
  /** @type {NodeList} */
  let notes;
  /** @type {number} */
  let i;
  /** @type {number} */
  let j;

  head.appendChild(this.createTableLine(SoundFont.Synthesizer.TableHeader, true));

  for (i = 0; i < 16; ++i) {
    tableLine = this.createTableLine(SoundFont.Synthesizer.TableHeader.length + 128, false);
    body.appendChild(tableLine);

    if (i !== 9) {
      let select = document.createElement('select');
      let option;
      for (j = 0; j < 128; ++j) {
        option = document.createElement('option');
        option.textContent = SoundFont.Synthesizer.ProgramNames[j];
        select.appendChild(option);
      }
      tableLine.querySelector('td:nth-child(1)').appendChild(select);
      select.addEventListener('change', (function(synth, channel) {
        return function(event) {
          synth.programChange(channel, event.target.selectedIndex);
        }
      })(this, i), false);
      select.selectedIndex = this.channelInstrument[i];
    } else {
      tableLine.querySelector('td:first-child').textContent = '[ RHYTHM TRACK ]';
    }

    notes = tableLine.querySelectorAll('td:nth-last-child(-n+128)');
    for (j = 0; j < 128; ++j) {
      notes[j].addEventListener('mousedown', (function(synth, channel, key) {
        return function(event) {
          event.preventDefault();
          synth.drag = true;
          synth.noteOn(channel, key, 127);
        }
      })(this, i, j));
      notes[j].addEventListener('mouseover', (function(synth, channel, key) {
        return function(event) {
          event.preventDefault();
          if (synth.drag) {
            synth.noteOn(channel, key, 127);
          }
        }
      })(this, i, j));
      notes[j].addEventListener('mouseout', (function(synth, channel, key) {
        return function(event) {
          event.preventDefault();
          synth.noteOff(channel, key, 0);
        }
      })(this, i, j));
      notes[j].addEventListener('mouseup', (function(synth, channel, key) {
        return function(event) {
          event.preventDefault();
          synth.drag = false;
          synth.noteOff(channel, key, 0);
        }
      })(this, i, j));
    }
  }

  table.appendChild(head);
  table.appendChild(body);

  return table;
};

SoundFont.Synthesizer.prototype.removeSynth = function() {
  let table = this.table;

  if (table) {
    table.parentNode.removeChild(table);
    this.table = null;
  }
};

/**
 * @param {!(Array.<string>|number)} array
 * @param {boolean} isTitleLine
 * @returns {HTMLTableRowElement}
 */
SoundFont.Synthesizer.prototype.createTableLine = function(array, isTitleLine) {
  /** @type {HTMLTableRowElement} */
  let tr = /** @type {HTMLTableRowElement} */(document.createElement('tr'));
  /** @type {HTMLTableCellElement} */
  let cell;
  /** @type {boolean} */
  let isArray = array instanceof Array;
  /** @type {number} */
  let i;
  /** @type {number} */
  let il = isArray ? array.length : /** @type {number} */(array);

  for (i = 0; i < il; ++i) {
    cell =
      /** @type {HTMLTableCellElement} */
      (document.createElement(isTitleLine ? 'th' : 'td'));
    cell.textContent = (isArray && array[i] !== void 0) ? array[i] : '';
    tr.appendChild(cell);
  }

  return tr;
};


/**
 * @param {number} channel NoteOn するチャンネル.
 * @param {number} key NoteOn するキー.
 * @param {number} velocity 強さ.
 */
SoundFont.Synthesizer.prototype.noteOn = function(channel, key, velocity) {
  /** @type {Object} */
  let bank = this.bankSet[channel === 9 ? 128 : this.bank];
  /** @type {Object} */
  let instrument = bank[this.channelInstrument[channel]];
  /** @type {Object} */
  let instrumentKey;
  /** @type {SoundFont.SynthesizerNote} */
  let note;

  if (this.table) {
    this.table.querySelector(
      'tbody > ' +
        'tr:nth-child(' + (channel+1) + ') > ' +
        'td:nth-child(' + (SoundFont.Synthesizer.TableHeader.length+key+1) + ')'
    ).classList.add('note-on');
  }

  if (!instrument) {
    // TODO
    goog.global.console.warn(
      "instrument not found: bank=%s instrument=%s channel=%s",
      channel === 9 ? 128 : this.bank,
      this.channelInstrument[channel],
      channel
    );
    return;
  }

  instrumentKey = instrument[key];

  if (!(instrumentKey)) {
    // TODO
    goog.global.console.warn(
      "instrument not found: bank=%s instrument=%s channel=%s key=%s",
      channel === 9 ? 128 : this.bank,
      this.channelInstrument[channel],
      channel,
      key
    );
    return;
  }

  let panpot = this.channelPanpot[channel] - 64;
  panpot /= panpot < 0 ? 64 : 63;

  // create note information
  instrumentKey['channel'] = channel;
  instrumentKey['key'] = key;
  instrumentKey['velocity'] = velocity;
  instrumentKey['panpot'] = panpot;
  instrumentKey['volume'] = this.channelVolume[channel] / 127;
  instrumentKey['pitchBend'] = this.channelPitchBend[channel] - 8192;
  instrumentKey['pitchBendSensitivity'] = this.channelPitchBendSensitivity[channel];
  instrumentKey['sampleOffset'] = this.channelSampleOffset[channel]

  // note on
  note = new SoundFont.SynthesizerNote(this.ctx, this.gainMaster, instrumentKey, this.opts, this);
  note.noteOn();
  this.currentNoteOn[channel].push(note);
};

/**
 * @param {number} channel NoteOff するチャンネル.
 * @param {number} key NoteOff するキー.
 * @param {number} velocity 強さ.
 */
SoundFont.Synthesizer.prototype.noteOff = function(channel, key, velocity) {
  /** @type {Object} */
  let bank = this.bankSet[channel === 9 ? 128 : this.bank];
  /** @type {Object} */
  let instrument = bank[this.channelInstrument[channel]];
  /** @type {number} */
  let i;
  /** @type {number} */
  let il;
  /** @type {Array.<SoundFont.SynthesizerNote>} */
  let currentNoteOn = this.currentNoteOn[channel];
  /** @type {SoundFont.SynthesizerNote} */
  let note;

  if (this.table) {
    this.table.querySelector(
      'tbody > ' +
      'tr:nth-child(' + (channel+1) + ') > ' +
      'td:nth-child(' + (key+SoundFont.Synthesizer.TableHeader.length+1) + ')'
    ).classList.remove('note-on');
  }

  if (!instrument) {
    return;
  }

  for (i = 0, il = currentNoteOn.length; i < il; ++i) {
    note = currentNoteOn[i];
    if (note.key === key) {
      note.noteOff();
      currentNoteOn.splice(i, 1);
      --i;
      --il;
    }
  }
};

/**
 * @param {number} channel 音色を変更するチャンネル.
 * @param {number} instrument 音色番号.
 */
SoundFont.Synthesizer.prototype.programChange = function(channel, instrument) {
  if (this.table) {
    if (channel !== 9) {
      this.table.querySelector('tbody > tr:nth-child(' + (channel+1) + ') > td:first-child > select').selectedIndex = instrument;
    }
  }
  // リズムトラックは無視する
  if (channel === 9) {
    return;
  }

  this.channelInstrument[channel] = instrument;
};

/**
 * @param {number} channel 音量を変更するチャンネル.
 * @param {number} volume 音量(0-127).
 */
SoundFont.Synthesizer.prototype.volumeChange = function(channel, volume) {
  if (this.table) {
    this.table.querySelector('tbody > tr:nth-child(' + (channel+1) + ') > td:nth-child(2)').textContent = volume;
  }

  this.channelVolume[channel] = volume;
};

/**
 * @param {number} channel panpot を変更するチャンネル.
 * @param {number} panpot panpot(0-127).
 */
SoundFont.Synthesizer.prototype.panpotChange = function(channel, panpot) {
  if (this.table) {
    this.table.querySelector('tbody > tr:nth-child(' + (channel+1) + ') > td:nth-child(3)').textContent = panpot;
  }

  this.channelPanpot[channel] = panpot;
};

/**
 * @param {number} channel panpot を変更するチャンネル.
 * @param {number} lowerByte
 * @param {number} higherByte
 */
SoundFont.Synthesizer.prototype.pitchBend = function(channel, lowerByte, higherByte) {
  /** @type {number} */
  let bend = (lowerByte & 0x7f) | ((higherByte & 0x7f) << 7);
  /** @type {number} */
  let i;
  /** @type {number} */
  let il;
  /** @type {Array.<SoundFont.SynthesizerNote>} */
  let currentNoteOn = this.currentNoteOn[channel];
  /** @type {number} */
  let calculated = bend - 8192;

  if (this.table) {
    this.table.querySelector('tbody > tr:nth-child(' + (channel+1) + ') > td:nth-child(4)').textContent = calculated;
  }

  for (i = 0, il = currentNoteOn.length; i < il; ++i) {
    currentNoteOn[i].updatePitchBend(calculated);
  }

  this.channelPitchBend[channel] = bend;
};

/**
 * @param {number} channel pitch bend sensitivity を変更するチャンネル.
 * @param {number} sensitivity
 */
SoundFont.Synthesizer.prototype.pitchBendSensitivity = function(channel, sensitivity) {
  if (this.table) {
    this.table.querySelector('tbody > tr:nth-child(' + (channel+1) + ') > td:nth-child(5)').textContent = sensitivity;
  }

  this.channelPitchBendSensitivity[channel] = sensitivity;
};

/**
 * @param {number} set sample Offset 
 * @param {number} offset
 */
SoundFont.Synthesizer.prototype.sampleOffset = function(channel, offset) {
  this.channelSampleOffset[channel] = offset;
};

/**
 * @param {number} channel 音を消すチャンネル.
 */
SoundFont.Synthesizer.prototype.allSoundOff = function(channel) {
  /** @type {Array.<SoundFont.SynthesizerNote>} */
  let currentNoteOn = this.currentNoteOn[channel];
  console.log(channel)
  console.dir(this.currentNoteOn)

  while (currentNoteOn.length > 0) {
    this.noteOff(channel, currentNoteOn[0].key, 0);
  }
};

/**
 * @param {number} channel リセットするチャンネル
 */
SoundFont.Synthesizer.prototype.resetAllControl = function(channel) {
  this.pitchBend(channel, 0x00, 0x40); // 8192
};

