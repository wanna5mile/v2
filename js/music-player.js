(async () => {
  "use strict";

  // DOM references
  const now_playing = document.querySelector('.now-playing');
  const track_art = document.querySelector('.track-art');
  const coverEl = track_art.querySelector('.cover');
  const track_name = document.querySelector('.track-name');
  const track_artist = document.querySelector('.track-artist');
  const playpause_btn = document.querySelector('.playpause-track');
  const next_btn = document.querySelector('.next-track');
  const prev_btn = document.querySelector('.prev-track');
  const random_btn = document.querySelector('.random-track');
  const repeat_btn = document.querySelector('.repeat-track');
  const seek_slider = document.querySelector('.seek_slider');
  const volume_slider = document.querySelector('.volume_slider');
  const curr_time = document.querySelector('.current-time');
  const total_duration = document.querySelector('.total-duration');
  const loader = document.querySelector('.loader');
  const strokes = loader ? Array.from(loader.querySelectorAll('.stroke')) : [];

  const curr_track = new Audio();
  let flat_music_list = [];
  let track_index = 0, isPlaying = false, isRandom = false, isRepeating = false, updateTimer = null;

  // --- Load JSON data ---
  const response = await fetch('./json/tcd.json');
  const musicData = await response.json();

  const { basePath, coverDefault, artistName, artistUrl, tracks } = musicData;

  // Flatten logic
  tracks.forEach((track, originalIndex) => {
    if (track.file === "#") return;
    const files = Array.isArray(track.file) ? track.file : [track.file];
    files.forEach((file, part) => {
      flat_music_list.push({
        name: track.name,
        artist: artistName,
        url: track.url,
        artistUrl,
        img: coverDefault,
        musicSrc: basePath + file,
        isMultiPart: files.length > 1,
        partIndex: part,
        originalIndex,
        lastPartIndex: files.length - 1
      });
    });
  });

  // === Helper ===
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const reset = () => { curr_time.textContent = total_duration.textContent = "00:00"; seek_slider.value = 0; };

  // === Load / Update ===
  function loadTrack(index) {
    clearInterval(updateTimer);
    reset();
    if (index < 0) index = flat_music_list.length - 1;
    if (index >= flat_music_list.length) index = 0;
    track_index = index;

    const track = flat_music_list[index];
    curr_track.src = track.musicSrc;
    curr_track.load();

    curr_track.onloadedmetadata = () => {
      total_duration.textContent = formatTime(curr_track.duration);
      let logicalCount = 0;
      for (let i = 0; i <= index; i++) if (flat_music_list[i].partIndex === 0) logicalCount++;
      const totalSongs = tracks.filter(t => t.file !== "#").length;
      now_playing.textContent = `Playing ${logicalCount} of ${totalSongs}`;
    };

    track_name.textContent = track.name;
    track_name.href = track.url;
    track_artist.textContent = track.artist;
    track_artist.href = track.artistUrl;
    track_art.querySelector('.cover').style.backgroundImage = `url("${track.img}")`;

    updateTimer = setInterval(setUpdate, 1000);
  }

  const setUpdate = () => {
    if (!isNaN(curr_track.duration)) {
      seek_slider.value = (curr_track.currentTime / curr_track.duration) * 100;
      curr_time.textContent = formatTime(curr_track.currentTime);
    }
  };

  // === Controls ===
  const playTrack = () => { curr_track.play(); isPlaying = true; playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>'; };
  const pauseTrack = () => { curr_track.pause(); isPlaying = false; playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>'; };
  const playpauseTrack = () => (isPlaying ? pauseTrack() : playTrack());
  const seekTo = () => { curr_track.currentTime = (seek_slider.value / 100) * curr_track.duration; };
  const setVolume = () => { curr_track.volume = volume_slider.value / 100; };

  function nextTrack() {
    let next = track_index + 1;
    if (isRandom) next = Math.floor(Math.random() * flat_music_list.length);
    loadTrack(next);
    playTrack();
  }

  function prevTrack() {
    loadTrack(track_index - 1);
    playTrack();
  }

  // === Event bindings ===
  playpause_btn.onclick = playpauseTrack;
  next_btn.onclick = nextTrack;
  prev_btn.onclick = prevTrack;
  seek_slider.oninput = seekTo;
  volume_slider.oninput = setVolume;
  curr_track.onended = () => (isRepeating ? (curr_track.currentTime = 0, playTrack()) : nextTrack());

  random_btn.onclick = () => { isRandom = !isRandom; random_btn.classList.toggle('active', isRandom); };
  repeat_btn.onclick = () => { isRepeating = !isRepeating; repeat_btn.classList.toggle('active', isRepeating); };

  // === Init ===
  loadTrack(0);
})();
