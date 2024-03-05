goog.provide('SoundFont.SynthesizerNote');

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} destination
 * @param {{
 *   channel: number,
 *   key: number,
 *   sample: Uint8Array,
 *   basePlaybackRate: number,
 *   loopStart: number,
 *   loopEnd: number,
 *   volume: number,
 *   panpot: number
 * }} instrument
 * @constructor
 */
SoundFont.SynthesizerNote = function(ctx, destination, instrument, opts) {
  /** @type {AudioContext} */
  this.ctx = ctx;
  /** @type {AudioNode} */
  this.destination = destination;
  /** @type {{
   *   channel: number,
   *   key: number,
   *   sample: Uint8Array,
   *   basePlaybackRate: number,
   *   loopStart: number,
   *   loopEnd: number,
   *   volume: number,
   *   panpot: number
   * }}
   */
  this.instrument = instrument;
  /** @type {number} */
  this.channel = instrument['channel'];
  /** @type {number} */
  this.key = instrument['key'];
  /** @type {number} */
  this.velocity = instrument['velocity'];
  /** @type {Int16Array} */
  this.buffer = instrument['sample'];
  /** @type {number} */
  this.playbackRate = instrument['basePlaybackRate'];
  /** @type {number} */
  this.sampleRate = instrument['sampleRate'];
  /** @type {number} */
  this.volume = instrument['volume'];
  /** @type {number} */
  this.panpot = instrument['panpot'];
  /** @type {number} */
  this.pitchBend = instrument['pitchBend'];
  /** @type {number} */
  this.pitchBendSensitivity = instrument['pitchBendSensitivity'];
  /** @type {number} */
  this.modEnvToPitch = instrument['modEnvToPitch'];

  // state
  /** @type {number} */
  this.startTime = ctx.currentTime;
  /** @type {number} */
  this.computedPlaybackRate = this.playbackRate;

  //---------------------------------------------------------------------------
  // audio node
  //---------------------------------------------------------------------------

  /** @type {AudioBuffer} */
  this.audioBuffer;
  /** @type {AudioBufferSourceNode} */
  this.bufferSource;
  /** @type {AudioPannerNode} */
  this.panner;
  /** @type {AudioGainNode} */
  this.gainOutput;

  //console.log(instrument['modAttack'], instrument['modDecay'], instrument['modSustain'], instrument['modRelease']);
};

SoundFont.SynthesizerNote.prototype.noteOn = function() {
  /** @type {AudioContext} */
  let ctx = this.ctx;
  /** @type {{
   *   channel: number,
   *   key: number,
   *   sample: Uint8Array,
   *   basePlaybackRate: number,
   *   loopStart: number,
   *   loopEnd: number,
   *   volume: number,
   *   panpot: number
   * }} */
  let instrument = this.instrument;
  /** @type {Int16Array} */
  let sample = this.buffer;
  /** @type {AudioBuffer} */
  let buffer;
  /** @type {Float32Array} */
  let channelData;
  /** @type {AudioBufferSourceNode} */
  let bufferSource;
  /** @type {BiquadFilterNode} */
  let filter;
  /** @type {AudioPannerNode} */
  let panner;
  /** @type {AudioGainNode} */
  let output;
  /** @type {AudioGain} */
  let outputGain;
  /** @type {number} */
  let now = this.ctx.currentTime;
  /** @type {number} */
  let volAttack = now + instrument['volAttack'];
  /** @type {number} */
  let modAttack = now + instrument['modAttack'];
  /** @type {number} */
  let volDecay = volAttack + instrument['volDecay'];
  /** @type {number} */
  let modDecay = modAttack + instrument['modDecay'];
  /** @type {number} */
  let loopStart = instrument['loopStart'] / this.sampleRate;
  /** @type {number} */
  let loopEnd = instrument['loopEnd'] / this.sampleRate;
  /** @type {number} */
  let startTime = instrument['start'] / this.sampleRate;
  /** @type {number} */
  let baseFreq;
  /** @type {number} */
  let peekFreq;
  /** @type {number} */
  let sustainFreq;


  sample = sample.subarray(0, sample.length + instrument['end']);
  buffer = this.audioBuffer = ctx.createBuffer(1, sample.length, this.sampleRate);
  channelData = buffer.getChannelData(0);
  channelData.set(sample);

  // buffer source
  bufferSource = this.bufferSource = ctx.createBufferSource();
  bufferSource.buffer = buffer;
  bufferSource.loop = (this.channel !== 9);
  bufferSource.loopStart = loopStart;
  bufferSource.loopEnd   = loopEnd;
  this.updatePitchBend(this.pitchBend);

  // audio node
  panner = this.panner = ctx.createPanner();
  output = this.gainOutput = ctx.createGainNode();
  outputGain = output.gain;

  // filter
  filter = this.filter = ctx.createBiquadFilter();
  filter.type = filter.LOWPASS;

  // panpot
  panner.panningModel = 0;
  panner.setPosition(
    Math.sin(this.panpot * Math.PI / 2),
    0,
    Math.cos(this.panpot * Math.PI / 2)
  );

  //---------------------------------------------------------------------------
  // Attack, Decay, Sustain
  //---------------------------------------------------------------------------
  outputGain.setValueAtTime(0, now);
  outputGain.linearRampToValueAtTime(this.volume * (this.velocity / 127), volAttack);
  outputGain.linearRampToValueAtTime(this.volume * (1 - instrument['volSustain']), volDecay);

  filter.Q.setValueAtTime(instrument['initialFilterQ'] * Math.pow(10, 200), now);
  baseFreq = amountToFreq(instrument['initialFilterFc']);
  peekFreq = amountToFreq(instrument['initialFilterFc'] + instrument['modEnvToFilterFc']);
  sustainFreq = baseFreq + (peekFreq - baseFreq) * (1 - instrument['modSustain']);
  filter.frequency.setValueAtTime(baseFreq, now);
  filter.frequency.linearRampToValueAtTime(peekFreq, modAttack);
  filter.frequency.linearRampToValueAtTime(sustainFreq, modDecay);

  /**
   * @param {number} val
   * @returns {number}
   */
  function amountToFreq(val) {
    return Math.pow(2, (val - 6900) / 1200) * 440;
  }

  // connect
  bufferSource.connect(filter);
  filter.connect(panner);
  panner.connect(output);
  output.connect(this.destination);

  // fire
  bufferSource.start(0, startTime);

};



SoundFont.SynthesizerNote.prototype.noteOff = function(done) {
  /** @type {{
   *   channel: number,
   *   key: number,
   *   sample: Uint8Array,
   *   basePlaybackRate: number,
   *   loopStart: number,
   *   loopEnd: number,
   *   volume: number,
   *   panpot: number
   * }} */
  let instrument = this.instrument;
  /** @type {AudioBufferSourceNode} */
  let bufferSource = this.bufferSource;
  /** @type {AudioGainNode} */
  let output = this.gainOutput;
  /** @type {number} */
  let now = this.ctx.currentTime;
  /** @type {number} */
  let volEndTime = now + instrument['volRelease'];
  /** @type {number} */
  let modEndTime = now + instrument['modRelease'];

  if (!this.audioBuffer) {
    return;
  }

  //---------------------------------------------------------------------------
  // Release
  //---------------------------------------------------------------------------
  output.gain.cancelScheduledValues(0);
  output.gain.linearRampToValueAtTime(0, volEndTime);
  bufferSource.playbackRate.cancelScheduledValues(0);

  bufferSource.loop = false;
  bufferSource.stop(volEndTime);

  // disconnect
  setTimeout( () => {
    this.bufferSource.stop()
    this.bufferSource.buffer = null;
    this.bufferSource.disconnect();
    this.gainOutput.disconnect();
    this.panner.disconnect();
    this.filter.disconnect();
    // hint gc to cleanup audio graph
    for( let i in this ) this[i] = null
    console.log("note turned off")
    if( done ) done()
  }, instrument['volRelease'] * 1000 );
}

SoundFont.SynthesizerNote.prototype.schedulePlaybackRate = function() {
  let playbackRate = this.bufferSource.playbackRate;
  /** @type {number} */
  let computed = this.computedPlaybackRate;
  /** @type {number} */
  let start = this.startTime;
  /** @type {Object} */
  let instrument = this.instrument;
  /** @type {number} */
  let modAttack = start + instrument['modAttack'];
  /** @type {number} */
  let modDecay = modAttack + instrument['modDecay'];
  /** @type {number} */
  let peekPitch = computed * Math.pow(
    Math.pow(2, 1/12),
    this.modEnvToPitch * this.instrument['scaleTuning']
  );

  playbackRate.cancelScheduledValues(0);
  playbackRate.setValueAtTime(computed, start);
  playbackRate.linearRampToValueAtTime(peekPitch, modAttack);
  playbackRate.linearRampToValueAtTime(computed + (peekPitch - computed) * (1 - instrument['modSustain']), modDecay);
};

/**
 * @param {number} pitchBend
 */
SoundFont.SynthesizerNote.prototype.updatePitchBend = function(pitchBend) {
  this.computedPlaybackRate = this.playbackRate * Math.pow(
    Math.pow(2, 1/12),
    (
      this.pitchBendSensitivity * (
        pitchBend / (pitchBend < 0 ? 8192 : 8191)
      )
    ) * this.instrument['scaleTuning']
  );
  this.schedulePlaybackRate();
};
