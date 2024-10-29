class MusicDatabase {
    constructor() {
        this.dbName = 'MusicPlayerDB';
        this.dbVersion = 1;
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            this.db = await idb.openDB(this.dbName, this.dbVersion, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('songs')) {
                        const songStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
                        songStore.createIndex('name', 'name');
                        songStore.createIndex('artist', 'artist');
                        songStore.createIndex('album', 'album');
                    }
                }
            });
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }

    // Reference to existing addSong method
    async addSong(song) {
        try {
            const tx = this.db.transaction('songs', 'readwrite');
            const store = tx.objectStore('songs');
            
            const songToStore = {
                name: song.name,
                artist: song.artist,
                album: song.album,
                duration: song.duration,
                data: song.data,
                albumArt: song.albumArt
            };
            
            const id = await store.add(songToStore);
            await tx.done;
            songToStore.id = id; // Make sure ID is added to the song object
            return songToStore;
        } catch (error) {
            console.error('Error adding song:', error);
            throw error;
        }
    }

    async getAllSongs() {
        try {
            const tx = this.db.transaction('songs', 'readonly');
            const store = tx.objectStore('songs');
            return await store.getAll();
        } catch (error) {
            console.error('Error getting songs:', error);
            return [];
        }
    }

    async deleteSong(id) {
        try {
            const tx = this.db.transaction('songs', 'readwrite');
            const store = tx.objectStore('songs');
            await store.delete(id);
            await tx.done;
            return true;
        } catch (error) {
            console.error('Error deleting song:', error);
            return false;
        }
    }
}
