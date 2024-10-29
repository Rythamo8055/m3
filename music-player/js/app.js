class MusicPlayerApp {
    constructor() {
        this.db = new MusicDatabase();
        this.player = new AudioPlayer();
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.initializeUI();
        this.setupEventListeners();
        // Add after existing initialization code
        this.player.onTrackEnd = () => this.handleTrackEnd();
        this.player.onTimeUpdate = () => this.updateProgress();
        
        // Load songs when app starts
        this.db.initDatabase().then(() => {
            this.loadInitialSongs();
        });
    }

    initializeUI() {
        this.elements = {
            fileInput: document.getElementById('mp3Upload'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            shuffleBtn: document.getElementById('shuffleBtn'),
            repeatBtn: document.getElementById('repeatBtn'),
            volumeSlider: document.getElementById('volumeSlider'),
            progressBar: document.querySelector('.progress'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            searchInput: document.getElementById('searchInput')
        };
        
        // Add 3D mouse movement effect
        const albumArt = document.getElementById('albumArt');
        const playerBar = document.querySelector('.player-bar');
        
        playerBar.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = playerBar.getBoundingClientRect();
            const x = (e.clientX - left) / width - 0.5;
            const y = (e.clientY - top) / height - 0.5;
            
            albumArt.style.transform = `
                perspective(1000px)
                rotateY(${x * 10}deg)
                rotateX(${-y * 10}deg)
                translateZ(10px)
            `;
        });
        
        playerBar.addEventListener('mouseleave', () => {
            albumArt.style.transform = 'none';
        });
    }

    setupEventListeners() {
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.prevBtn.addEventListener('click', () => this.playPrevious());
        this.elements.nextBtn.addEventListener('click', () => this.playNext());
        this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.elements.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            this.player.setVolume(volume / 100);
            document.querySelector('.volume-percentage').textContent = `${volume}%`;
        });

        document.querySelector('.progress-bar').addEventListener('click', (e) => {
            const progressBar = e.currentTarget;
            const clickPosition = e.offsetX / progressBar.offsetWidth;
            const newTime = clickPosition * this.player.getDuration();
            this.player.seek(newTime);
        });

        // Add this to your existing event listeners
        document.addEventListener('keydown', (e) => {
            if (this.currentPlaylist.length > 0) {
                switch(e.key) {
                    case 'ArrowRight':
                        const forwardTime = this.player.getCurrentTime() + 5;
                        const maxTime = this.player.getDuration();
                        this.player.setCurrentTime(Math.min(forwardTime, maxTime));
                        break;
                        
                    case 'ArrowLeft':
                        const backwardTime = this.player.getCurrentTime() - 5;
                        this.player.setCurrentTime(Math.max(backwardTime, 0));
                        break;
                }
            }
        });

        // Add this with your other event listeners
        document.addEventListener('keydown', (e) => {
            if (this.currentPlaylist.length > 0 && this.player.audio) {
                const currentTime = this.player.getCurrentTime();
                const duration = this.player.getDuration();
                
                switch(e.key) {
                    case 'ArrowRight':
                        const forwardTime = Math.min(currentTime + 5, duration);
                        this.player.seek(forwardTime);
                        this.updateProgress();
                        break;
                        
                    case 'ArrowLeft':
                        const backwardTime = Math.max(currentTime - 5, 0);
                        this.player.seek(backwardTime);
                        this.updateProgress();
                        break;
                }
            }
        });

        // Add this with your existing keyboard event listeners
        document.addEventListener('keydown', (e) => {
            if (this.currentPlaylist.length > 0) {
                const volumeSlider = this.elements.volumeSlider;
                const currentVolume = parseFloat(volumeSlider.value);
                const volumeStep = 5; // 5% volume change per key press
                
                switch(e.key) {
                    case 'ArrowRight':
                        const forwardTime = Math.min(this.player.getCurrentTime() + 5, this.player.getDuration());
                        this.player.seek(forwardTime);
                        this.updateProgress();
                        break;
                        
                    case 'ArrowLeft':
                        const backwardTime = Math.max(this.player.getCurrentTime() - 5, 0);
                        this.player.seek(backwardTime);
                        this.updateProgress();
                        break;
                        
                    case 'ArrowUp':
                        const newVolumeUp = Math.min(currentVolume + volumeStep, 100);
                        volumeSlider.value = newVolumeUp;
                        this.player.setVolume(newVolumeUp / 100);
                        document.querySelector('.volume-percentage').textContent = `${newVolumeUp}%`;
                        break;
                        
                    case 'ArrowDown':
                        const newVolumeDown = Math.max(currentVolume - volumeStep, 0);
                        volumeSlider.value = newVolumeDown;
                        this.player.setVolume(newVolumeDown / 100);
                        document.querySelector('.volume-percentage').textContent = `${newVolumeDown}%`;
                        break;
                }
            }
        });
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        const uploadSection = document.querySelector('.upload-section');
        const uploadBtn = document.querySelector('.upload-btn');
        
        if (files.length > 0) {
            uploadSection.classList.add('uploading');
            uploadBtn.setAttribute('data-files', `${files.length} ${files.length === 1 ? 'file' : 'files'}`);
            uploadBtn.classList.add('has-files');
            
            for (const file of files) {
                if (file.type === 'audio/mpeg') {
                    try {
                        const metadata = await this.extractMetadata(file);
                        const arrayBuffer = await file.arrayBuffer();
                        const duration = await this.getAudioDuration(URL.createObjectURL(file));
                        
                        const song = {
                            name: metadata.title || file.name.replace('.mp3', ''),
                            artist: metadata.artist || 'Unknown Artist',
                            album: metadata.album || 'Unknown Album',
                            duration: duration,
                            data: arrayBuffer,
                            albumArt: metadata.picture ? this.getAlbumArtUrl(metadata.picture) : null
                        };
                        
                        await this.db.addSong(song);
                    } catch (error) {
                        console.error('Error processing file:', error);
                    }
                }
            }
            
            await this.updateSongsList();
            uploadSection.classList.remove('uploading');
            uploadBtn.removeAttribute('data-files');
            uploadBtn.classList.remove('has-files');
            event.target.value = ''; // Reset file input
        }
    }

    async extractMetadata(file) {
        return new Promise((resolve, reject) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    resolve({
                        title: tag.tags.title,
                        artist: tag.tags.artist,
                        album: tag.tags.album,
                        picture: tag.tags.picture
                    });
                },
                onError: (error) => {
                    console.error('Error reading tags:', error);
                    resolve({});
                }
            });
        });
    }

    getAlbumArtUrl(picture) {
        if (!picture) return null;
        const { data, format } = picture;
        const base64String = data.reduce((acc, curr) => acc + String.fromCharCode(curr), '');
        return `data:${format};base64,${btoa(base64String)}`;
    }

    async updateSongsList() {
        const songs = await this.db.getAllSongs();
        this.currentPlaylist = songs;
        const tbody = document.querySelector('#songsList tbody');
        tbody.innerHTML = '';

        songs.forEach((song, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index; // Add index as data attribute
            row.addEventListener('dblclick', () => this.playSong(index)); // Add double-click handler
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${song.name}</td>
                <td>${song.artist}</td>
                <td>${song.album}</td>
                <td>${this.formatTime(song.duration)}</td>
                <td>
                    <button onclick="musicPlayer.playSong(${index})" class="action-btn">
                        <i class="fas fa-play"></i>
                    </button>
                    <button onclick="musicPlayer.deleteSong(${song.id})" class="action-btn delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.player.pause();
            this.isPlaying = false;
        } else {
            if (this.currentPlaylist.length > 0) {
                this.player.play();
                this.isPlaying = true;
            }
        }
        this.updatePlayPauseButton();
        this.savePlaybackState(); // Add this line
    }

    updatePlayPauseButton() {
        const icon = this.elements.playPauseBtn.querySelector('i');
        icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateNowPlaying(song) {
        document.getElementById('currentSong').textContent = song.name;
        document.getElementById('currentArtist').textContent = song.artist;
        if (song.albumArt) {
            document.getElementById('albumArt').src = song.albumArt;
        } else {
            document.getElementById('albumArt').src = 'images/default-album-art.png';
        }
    }

    // Reference to existing playSong method
    async playSong(index) {
        if (index >= 0 && index < this.currentPlaylist.length) {
            this.currentTrackIndex = index;
            const song = this.currentPlaylist[index];
            
            try {
                const blob = new Blob([song.data], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(blob);
                
                await this.player.loadTrack(audioUrl);
                await this.player.play();
                
                this.isPlaying = true;
                this.updatePlayPauseButton();
                this.updateNowPlaying(song);
                this.startProgressUpdates();
            } catch (error) {
                console.error('Error playing song:', error);
            }
        }
    }

    // Add remaining methods referenced in the code...

    playNext() {
        if (this.currentPlaylist.length === 0) return;
        
        let nextIndex;
        if (this.isShuffled) {
            nextIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            nextIndex = (this.currentTrackIndex + 1) % this.currentPlaylist.length;
        }
        
        this.playSong(nextIndex);
    }

    playPrevious() {
        if (this.currentPlaylist.length === 0) return;
        
        let prevIndex;
        if (this.isShuffled) {
            prevIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            prevIndex = this.currentTrackIndex - 1;
            if (prevIndex < 0) prevIndex = this.currentPlaylist.length - 1;
        }
        
        this.playSong(prevIndex);
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.elements.shuffleBtn.classList.toggle('active');
    }

    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        const repeatBtn = this.elements.repeatBtn;
        repeatBtn.classList.remove('active');
        
        switch (this.repeatMode) {
            case 'one':
                repeatBtn.classList.add('active');
                repeatBtn.querySelector('i').className = 'fas fa-redo-alt';
                break;
            case 'all':
                repeatBtn.classList.add('active');
                repeatBtn.querySelector('i').className = 'fas fa-redo';
                break;
            default:
                repeatBtn.querySelector('i').className = 'fas fa-redo';
        }
    }

    handleTrackEnd() {
        switch (this.repeatMode) {
            case 'one':
                this.playSong(this.currentTrackIndex);
                break;
            case 'all':
                if (this.isShuffled) {
                    const nextIndex = Math.floor(Math.random() * this.currentPlaylist.length);
                    this.playSong(nextIndex);
                } else {
                    this.playNext();
                }
                break;
            case 'none':
                if (this.currentTrackIndex < this.currentPlaylist.length - 1) {
                    if (this.isShuffled) {
                        const nextIndex = Math.floor(Math.random() * this.currentPlaylist.length);
                        this.playSong(nextIndex);
                    } else {
                        this.playNext();
                    }
                }
                break;
        }
    }

    startProgressUpdates() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        this.progressInterval = setInterval(() => {
            this.updateProgress();
        }, 100);
    }

    updateProgress() {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        
        if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            this.elements.progressBar.style.width = `${progress}%`;
            this.elements.currentTime.textContent = this.formatTime(currentTime);
            this.elements.totalTime.textContent = this.formatTime(duration);
        }
    }

    async loadInitialSongs() {
        const songs = await this.db.getAllSongs();
        this.currentPlaylist = songs;
        await this.updateSongsList();
        
        // If there are songs in the playlist, automatically select the first one
        if (this.currentPlaylist.length > 0) {
            // Load the first song without playing it
            const firstSong = this.currentPlaylist[0];
            this.currentTrackIndex = 0;
            
            try {
                const blob = new Blob([firstSong.data], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(blob);
                
                await this.player.loadTrack(audioUrl);
                this.updateNowPlaying(firstSong);
                this.startProgressUpdates();
            } catch (error) {
                console.error('Error loading initial song:', error);
            }
        }
    }

    getAudioDuration(url) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            audio.src = url;
        });
    }

    async deleteSong(id) {
        return new Promise((resolve) => {
            const modal = document.getElementById('deleteModal');
            const confirmBtn = document.getElementById('confirmDelete');
            const cancelBtn = document.getElementById('cancelDelete');
            
            const handleDelete = async () => {
                try {
                    const success = await this.db.deleteSong(id);
                    if (success) {
                        // If currently playing song is deleted, stop playback
                        const currentSong = this.currentPlaylist[this.currentTrackIndex];
                        if (currentSong && currentSong.id === id) {
                            this.player.pause();
                            this.isPlaying = false;
                            this.updatePlayPauseButton();
                            document.getElementById('currentSong').textContent = 'No track selected';
                            document.getElementById('currentArtist').textContent = '-';
                            document.getElementById('albumArt').src = 'images/default-album-art.png';
                        }
                        
                        // Update the playlist and UI
                        await this.updateSongsList();
                    }
                } catch (error) {
                    console.error('Error deleting song:', error);
                } finally {
                    modal.classList.remove('active');
                    cleanup();
                }
            };
            
            const handleCancel = () => {
                modal.classList.remove('active');
                cleanup();
            };
            
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleDelete);
                cancelBtn.removeEventListener('click', handleCancel);
                resolve();
            };
            
            // Add event listeners
            confirmBtn.addEventListener('click', handleDelete);
            cancelBtn.addEventListener('click', handleCancel);
            
            // Show modal
            modal.classList.add('active');
        });
    }

    searchSongs(query) {
        const searchQuery = query.toLowerCase().trim();
        const tbody = document.querySelector('#songsList tbody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const title = row.children[1].textContent.toLowerCase();
            const artist = row.children[2].textContent.toLowerCase();
            const album = row.children[3].textContent.toLowerCase();
            
            const matches = title.includes(searchQuery) || 
                           artist.includes(searchQuery) || 
                           album.includes(searchQuery);
            
            if (matches) {
                row.style.display = '';
                row.style.animation = 'fadeIn 0.5s ease-in-out';
            } else {
                row.style.animation = 'fadeOut 0.3s ease-in-out';
                setTimeout(() => {
                    row.style.display = 'none';
                }, 280);
            }
        });
        
        // Show "No results found" message if needed
        const visibleRows = tbody.querySelectorAll('tr[style="display: "]').length;
        const noResultsMsg = document.getElementById('noResults');
        
        if (visibleRows === 0 && searchQuery !== '') {
            if (!noResultsMsg) {
                const message = document.createElement('div');
                message.id = 'noResults';
                message.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <p>No results found for "${query}"</p>
                    </div>
                `;
                tbody.parentNode.insertBefore(message, tbody.nextSibling);
                message.style.animation = 'fadeIn 0.5s ease-in-out';
            }
        } else if (noResultsMsg) {
            noResultsMsg.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => noResultsMsg.remove(), 280);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayerApp();
    new MobileHandler(window.musicPlayer);
});
