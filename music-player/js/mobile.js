class MobileHandler {
    constructor(musicPlayer) {
        this.musicPlayer = musicPlayer;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.initializeMobileFeatures();
    }

    initializeMobileFeatures() {
        // Menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });

        // Progress bar touch events
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('touchstart', (e) => this.handleProgressTouch(e), { passive: false });
        progressBar.addEventListener('touchmove', (e) => this.handleProgressTouch(e), { passive: false });

        // Song list touch events
        const songsList = document.querySelector('#songsList tbody');
        songsList.addEventListener('touchstart', (e) => this.handleSongTouch(e));
        songsList.addEventListener('touchend', (e) => this.handleSongTouchEnd(e));

        // Prevent default scroll when swiping on player bar
        const playerBar = document.querySelector('.player-bar');
        playerBar.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // Double tap to play/pause
        document.addEventListener('touchend', (e) => this.handleDoubleTap(e));
    }

    handleProgressTouch(e) {
        e.preventDefault();
        const progressBar = e.currentTarget;
        const touch = e.touches[0];
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        this.musicPlayer.player.seek(percent * this.musicPlayer.player.getDuration());
    }

    handleSongTouch(e) {
        this.touchStartTime = Date.now();
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleSongTouchEnd(e) {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - this.touchStartTime;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const distance = Math.sqrt(
            Math.pow(touchEndX - this.touchStartX, 2) +
            Math.pow(touchEndY - this.touchStartY, 2)
        );
    }

    handleDoubleTap(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - this.touchStartTime;
        if (tapLength < 500 && tapLength > 0) {
            this.musicPlayer.togglePlayPause();
            e.preventDefault();
        }
        this.touchStartTime = currentTime;
    }
} 