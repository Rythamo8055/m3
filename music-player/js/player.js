class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.setupAudioNodes();
        this.setupEventListeners();
    }

    // Reference to existing setupAudioNodes method
    setupAudioNodes() {
        this.source = null;
        this.gainNode = this.context.createGain();
        this.analyser = this.context.createAnalyser();
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }

    // Reference to existing setupEventListeners method
    setupEventListeners() {
        this.audio.addEventListener('ended', () => {
            if (this.onTrackEnd) this.onTrackEnd();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) this.onTimeUpdate();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
        });
    }

    async loadTrack(url) {
        try {
            if (this.source) {
                this.source.disconnect();
            }
            
            this.audio.src = url;
            await this.audio.load();
            
            this.source = this.context.createMediaElementSource(this.audio);
            this.source.connect(this.gainNode);
            
            return true;
        } catch (error) {
            console.error('Error loading track:', error);
            return false;
        }
    }

    play() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        return this.audio.play();
    }

    pause() {
        return this.audio.pause();
    }

    seek(time) {
        if (this.audio && time >= 0 && time <= this.audio.duration) {
            this.audio.currentTime = time;
            if (this.onTimeUpdate) {
                this.onTimeUpdate();
            }
        }
    }

    setVolume(value) {
        this.gainNode.gain.value = value;
    }

    getCurrentTime() {
        return this.audio.currentTime;
    }

    getDuration() {
        return this.audio.duration;
    }
}
